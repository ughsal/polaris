import { NonRetriableError } from "inngest";
import { Octokit } from "octokit";
import { isBinaryFile } from "isbinaryfile";
import path from "path";

import { inngest } from "@/inngest/client";
import { getConvexClient } from "@/lib/convex-client";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

const DEFAULT_BRANCHES = ["main", "master"] as const;

type ImportPayload = {
  owner?: string;
  repo?: string;
  projectId?: string;
  githubToken?: string;
};

function getInternalKey() {
  const internalKey = process.env.POLARIS_CONVEX_INTERNAL_KEY;

  if (!internalKey) {
    throw new NonRetriableError("POLARIS_CONVEX_INTERNAL_KEY is not configured.");
  }

  return internalKey;
}

function getPayload(eventData: unknown): ImportPayload {
  if (!eventData || typeof eventData !== "object") {
    return {};
  }

  const data = eventData as Record<string, unknown>;

  if (
    typeof data.owner === "string" ||
    typeof data.repo === "string" ||
    typeof data.projectId === "string" ||
    typeof data.githubToken === "string"
  ) {
    return {
      owner: typeof data.owner === "string" ? data.owner : undefined,
      repo: typeof data.repo === "string" ? data.repo : undefined,
      projectId: typeof data.projectId === "string" ? data.projectId : undefined,
      githubToken:
        typeof data.githubToken === "string" ? data.githubToken : undefined,
    };
  }

  const nested = data.data;
  if (nested && typeof nested === "object") {
    return getPayload(nested);
  }

  return {};
}

function createOctokit(githubToken: string) {
  return new Octokit({
    auth: githubToken,
  });
}

function normalizePathValue(value: string) {
  return value.split("/").filter(Boolean).join("/");
}

function sortByDepth(paths: string[]) {
  return [...paths].sort((a, b) => {
    const depthDelta = a.split("/").length - b.split("/").length;
    if (depthDelta !== 0) {
      return depthDelta;
    }

    return a.localeCompare(b, undefined, { sensitivity: "base" });
  });
}

async function getBranchCommitSha(
  octokit: Octokit,
  owner: string,
  repo: string,
) {
  for (const branch of DEFAULT_BRANCHES) {
    try {
      const ref = await octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${branch}`,
      });

      return ref.data.object.sha;
    } catch (error) {
      const status = typeof error === "object" && error && "status" in error
        ? Number((error as { status?: number }).status)
        : undefined;

      if (status !== 404) {
        throw error;
      }
    }
  }

  throw new Error("Unable to locate a main or master branch.");
}

async function ensureFolderPath(args: {
  convex: ReturnType<typeof getConvexClient>;
  internalKey: string;
  projectId: Id<"projects">;
  folderIdsByPath: Map<string, string>;
  folderPath: string;
}): Promise<string | null> {
  const normalizedPath = normalizePathValue(args.folderPath);

  if (!normalizedPath) {
    return null;
  }

  const cachedFolderId = args.folderIdsByPath.get(normalizedPath);
  if (cachedFolderId) {
    return cachedFolderId;
  }

  const parentPath = path.posix.dirname(normalizedPath);
  const parentId: string | null =
    parentPath && parentPath !== "." && parentPath !== normalizedPath
      ? await ensureFolderPath({
          ...args,
          folderPath: parentPath,
        })
      : null;
  const folderName = path.posix.basename(normalizedPath);

  const folderId: string = await args.convex.mutation(api.system.createFolder, {
    internalKey: args.internalKey,
    projectId: args.projectId,
    name: folderName,
    parentId: parentId ? (parentId as Id<"files">) : undefined,
  });

  args.folderIdsByPath.set(normalizedPath, folderId);
  return folderId;
}

async function uploadBinaryFile(args: {
  convex: ReturnType<typeof getConvexClient>;
  internalKey: string;
  projectId: Id<"projects">;
  name: string;
  parentId?: Id<"files">;
  buffer: Buffer;
}) {
  const uploadUrl = await args.convex.mutation(api.system.generateUploadUrl, {
    internalKey: args.internalKey,
  });

  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
    },
    body: new Uint8Array(args.buffer),
  });

  if (!uploadResponse.ok) {
    throw new Error(`Unable to upload ${args.name}.`);
  }

  const uploadJson = (await uploadResponse.json()) as { storageId?: string };

  if (!uploadJson.storageId) {
    throw new Error(`Convex storage upload failed for ${args.name}.`);
  }

  return await args.convex.mutation(api.system.createBinaryFile, {
    internalKey: args.internalKey,
    projectId: args.projectId,
    name: args.name,
    parentId: args.parentId,
    storageId: uploadJson.storageId as Id<"_storage">,
  });
}

async function importRepository(args: {
  convex: ReturnType<typeof getConvexClient>;
  internalKey: string;
  owner: string;
  repo: string;
  projectId: Id<"projects">;
  githubToken: string;
}) {
  const octokit = createOctokit(args.githubToken);

  await args.convex.mutation(api.system.updateImportStatus, {
    internalKey: args.internalKey,
    projectId: args.projectId,
    status: "importing",
  });

  await args.convex.mutation(api.system.cleanup, {
    internalKey: args.internalKey,
    projectId: args.projectId,
  });

  const commitSha = await getBranchCommitSha(octokit, args.owner, args.repo);
  const commit = await octokit.rest.git.getCommit({
    owner: args.owner,
    repo: args.repo,
    commit_sha: commitSha,
  });
  const tree = await octokit.rest.git.getTree({
    owner: args.owner,
    repo: args.repo,
    tree_sha: commit.data.tree.sha,
    recursive: "true",
  });

  const treeEntries = tree.data.tree
    .filter(entry => typeof entry.path === "string")
    .map(entry => ({
      path: normalizePathValue(entry.path ?? ""),
      sha: entry.sha,
      type: entry.type,
    }))
    .filter(entry => entry.path.length > 0);

  const folderIdsByPath = new Map<string, string>();
  const folderPaths = sortByDepth(
    treeEntries
      .filter(entry => entry.type === "tree")
      .map(entry => entry.path),
  );

  for (const folderPath of folderPaths) {
    await ensureFolderPath({
      convex: args.convex,
      internalKey: args.internalKey,
      projectId: args.projectId,
      folderIdsByPath,
      folderPath,
    });
  }

  const fileEntries = treeEntries.filter(entry => entry.type === "blob" && entry.sha);
  const fileErrors: Array<{ path: string; error: string }> = [];

  for (const fileEntry of fileEntries) {
    const filePath = fileEntry.path;
    const parentPath = path.posix.dirname(filePath);
    const parentId =
      parentPath && parentPath !== "." && parentPath !== filePath
        ? await ensureFolderPath({
            convex: args.convex,
            internalKey: args.internalKey,
            projectId: args.projectId,
            folderIdsByPath,
            folderPath: parentPath,
          })
        : null;

    try {
      const blob = await octokit.rest.git.getBlob({
        owner: args.owner,
        repo: args.repo,
        file_sha: fileEntry.sha!,
      });

      const buffer = Buffer.from(blob.data.content, "base64");
      const binary = await isBinaryFile(buffer);

      if (binary) {
        await uploadBinaryFile({
          convex: args.convex,
          internalKey: args.internalKey,
          projectId: args.projectId,
          parentId: parentId ? (parentId as Id<"files">) : undefined,
          name: path.posix.basename(filePath),
          buffer,
        });
        continue;
      }

      await args.convex.mutation(api.system.createFile, {
        internalKey: args.internalKey,
        projectId: args.projectId,
        parentId: parentId ? (parentId as Id<"files">) : undefined,
        name: path.posix.basename(filePath),
        content: buffer.toString("utf8"),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to import file.";
      fileErrors.push({ path: filePath, error: message });
      console.error("[github-import] file import failed", {
        owner: args.owner,
        repo: args.repo,
        path: filePath,
        error,
      });
    }
  }

  if (fileErrors.length > 0) {
    throw new Error(`${fileErrors.length} file(s) failed to import.`);
  }

  await args.convex.mutation(api.system.updateImportStatus, {
    internalKey: args.internalKey,
    projectId: args.projectId,
    status: "completed",
  });
}

export const importGitHubRepository = inngest.createFunction(
  {
    id: "projects-import-github-repository",
    onFailure: async ({ event, step }) => {
      const internalKey = getInternalKey();
      const payload = getPayload(event.data);

      if (!payload.projectId) {
        return;
      }

      const convex = getConvexClient();

      await step.run("mark-import-failed", async () => {
        await convex.mutation(api.system.updateImportStatus, {
          internalKey,
          projectId: payload.projectId as Id<"projects">,
          status: "failed",
        });
      });
    },
  },
  { event: "github/import.repo" },
  async ({ event, step }) => {
    const internalKey = getInternalKey();
    const payload = getPayload(event.data);

    const { owner, repo, projectId, githubToken } = payload;

    if (!owner || !repo || !projectId || !githubToken) {
      throw new NonRetriableError("Missing GitHub import payload.");
    }

    const convex = getConvexClient();

    await step.run("import-repository", async () => {
      await importRepository({
        convex,
        internalKey,
        owner,
        repo,
        projectId: projectId as Id<"projects">,
        githubToken,
      });
    });
  },
);
