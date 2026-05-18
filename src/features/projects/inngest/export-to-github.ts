import { NonRetriableError } from "inngest";
import { clerkClient } from "@clerk/nextjs/server";
import { Octokit } from "octokit";

import { inngest } from "@/inngest/client";
import { getConvexClient } from "@/lib/convex-client";
import { getGithubAccessState } from "@/lib/clerk-github";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type ExportPayload = {
  projectId?: string;
  userId?: string;
  repoName?: string;
  visibility?: "public" | "private";
  description?: string;
};

function getInternalKey() {
  const internalKey = process.env.POLARIS_CONVEX_INTERNAL_KEY;

  if (!internalKey) {
    throw new NonRetriableError("POLARIS_CONVEX_INTERNAL_KEY is not configured.");
  }

  return internalKey;
}

function getPayload(eventData: unknown): ExportPayload {
  if (!eventData || typeof eventData !== "object") {
    return {};
  }

  const data = eventData as Record<string, unknown>;

  if (
    typeof data.projectId === "string" ||
    typeof data.userId === "string" ||
    typeof data.repoName === "string" ||
    data.visibility === "public" ||
    data.visibility === "private" ||
    typeof data.description === "string"
  ) {
    return {
      projectId: typeof data.projectId === "string" ? data.projectId : undefined,
      userId: typeof data.userId === "string" ? data.userId : undefined,
      repoName: typeof data.repoName === "string" ? data.repoName : undefined,
      visibility:
        data.visibility === "public" || data.visibility === "private"
          ? data.visibility
          : undefined,
      description:
        typeof data.description === "string" ? data.description : undefined,
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

function buildPathForFile(
  file: {
    _id: Id<"files">;
    name: string;
    parentId?: Id<"files">;
  },
  filesById: Map<string, { _id: Id<"files">; name: string; parentId?: Id<"files"> }>,
) {
  const segments = [file.name];
  const visited = new Set<string>([file._id]);
  let currentParentId = file.parentId;

  while (currentParentId) {
    const parent = filesById.get(currentParentId);

    if (!parent || visited.has(parent._id)) {
      break;
    }

    segments.unshift(parent.name);
    visited.add(parent._id);
    currentParentId = parent.parentId;
  }

  return segments.join("/");
}

function sanitizeDescription(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return "Exported from Polaris";
  }

  return trimmed.slice(0, 350);
}

async function fetchStorageBuffer(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Unable to fetch binary file contents.");
  }

  return Buffer.from(await response.arrayBuffer());
}

async function shouldAbortExport(args: {
  convex: ReturnType<typeof getConvexClient>;
  internalKey: string;
  projectId: Id<"projects">;
}) {
  const project = await args.convex.query(api.system.getProjectById, {
    internalKey: args.internalKey,
    projectId: args.projectId,
  });

  return project?.exportStatus === "cancelled";
}

async function exportRepository(args: {
  convex: ReturnType<typeof getConvexClient>;
  internalKey: string;
  projectId: Id<"projects">;
  userId: string;
  repoName: string;
  visibility: "public" | "private";
  description?: string;
}) {
  const clerk = await clerkClient();
  const githubState = await getGithubAccessState(clerk, args.userId);

  if (!githubState.hasGithubAccount) {
    throw new NonRetriableError(
      "GitHub access needs to be reconnected. Open your profile and connect GitHub again.",
    );
  }

  if (!githubState.githubToken) {
    throw new NonRetriableError(
      "GitHub is connected, but Clerk did not return an access token. Reconnect GitHub and grant repository access.",
    );
  }

  const octokit = createOctokit(githubState.githubToken);

  await args.convex.mutation(api.system.updateExportStatus, {
    internalKey: args.internalKey,
    projectId: args.projectId,
    status: "exporting",
  });

  if (await shouldAbortExport(args)) {
    return;
  }

  const project = await args.convex.query(api.system.getProjectById, {
    internalKey: args.internalKey,
    projectId: args.projectId,
  });

  if (!project) {
    throw new Error("Project not found.");
  }

  let repoResponse: Awaited<
    ReturnType<typeof octokit.rest.repos.createForAuthenticatedUser>
  >;

  try {
    repoResponse = await octokit.rest.repos.createForAuthenticatedUser({
      name: args.repoName,
      description: sanitizeDescription(args.description),
      private: args.visibility === "private",
      auto_init: true,
    });
  } catch (error) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number((error as { status?: number }).status)
        : undefined;

    if (status === 404 || status === 403) {
      throw new Error(
        "GitHub could not create the repository. Reconnect GitHub in Clerk and grant repository access.",
      );
    }

    throw error;
  }

  await new Promise(resolve => setTimeout(resolve, 1000));

  if (await shouldAbortExport(args)) {
    return;
  }

  const commitResponse = await octokit.rest.git.getRef({
    owner: repoResponse.data.owner.login,
    repo: repoResponse.data.name,
    ref: "heads/main",
  });

  const commit = await octokit.rest.git.getCommit({
    owner: repoResponse.data.owner.login,
    repo: repoResponse.data.name,
    commit_sha: commitResponse.data.object.sha,
  });

  const files = await args.convex.query(api.system.getProjectFilesWithUrls, {
    internalKey: args.internalKey,
    projectId: args.projectId,
  });

  const filesById = new Map(
    files.map(file => [
      file._id,
      {
        _id: file._id,
        name: file.name,
        parentId: file.parentId,
      },
    ]),
  );

  const exportableFiles = files
    .filter(file => file.type === "file")
    .sort((a, b) => {
      const pathA = buildPathForFile(a, filesById);
      const pathB = buildPathForFile(b, filesById);
      return pathA.localeCompare(pathB, undefined, { sensitivity: "base" });
    });

  const treeEntries: Array<{
    path: string;
    mode: "100644";
    type: "blob";
    sha: string;
  }> = [];

  for (const file of exportableFiles) {
    if (await shouldAbortExport(args)) {
      return;
    }

    const filePath = buildPathForFile(file, filesById);
    let content = "";
    let encoding: "utf-8" | "base64" = "utf-8";

    if (file.storageUrl) {
      const buffer = await fetchStorageBuffer(file.storageUrl);
      content = buffer.toString("base64");
      encoding = "base64";
    } else {
      content = file.content ?? "";
    }

    const blobResponse = await octokit.rest.git.createBlob({
      owner: repoResponse.data.owner.login,
      repo: repoResponse.data.name,
      content,
      encoding,
    });

    treeEntries.push({
      path: filePath,
      mode: "100644",
      type: "blob",
      sha: blobResponse.data.sha,
    });
  }

  if (treeEntries.length === 0) {
    throw new Error("No exportable files were found.");
  }

  const treeResponse = await octokit.rest.git.createTree({
    owner: repoResponse.data.owner.login,
    repo: repoResponse.data.name,
    base_tree: commit.data.tree.sha,
    tree: treeEntries,
  });

  if (await shouldAbortExport(args)) {
    return;
  }

  const commitMessage = `Export from Polaris: ${project.name}`;
  const newCommit = await octokit.rest.git.createCommit({
    owner: repoResponse.data.owner.login,
    repo: repoResponse.data.name,
    message: commitMessage,
    tree: treeResponse.data.sha,
    parents: [commitResponse.data.object.sha],
  });

  if (await shouldAbortExport(args)) {
    return;
  }

  await octokit.rest.git.updateRef({
    owner: repoResponse.data.owner.login,
    repo: repoResponse.data.name,
    ref: "heads/main",
    sha: newCommit.data.sha,
  });

  await args.convex.mutation(api.system.updateExportStatus, {
    internalKey: args.internalKey,
    projectId: args.projectId,
    status: "completed",
    repoUrl: repoResponse.data.html_url,
  });

  return {
    repoUrl: repoResponse.data.html_url,
    exportedFileCount: treeEntries.length,
  };
}

export const exportToGithub = inngest.createFunction(
  {
    id: "projects-export-to-github",
    onFailure: async ({ event, step }) => {
      const internalKey = getInternalKey();
      const payload = getPayload(event.data);

      if (!payload.projectId) {
        return;
      }

      const convex = getConvexClient();

      await step.run("mark-export-failed", async () => {
        const project = await convex.query(api.system.getProjectById, {
          internalKey,
          projectId: payload.projectId as Id<"projects">,
        });

        if (project?.exportStatus === "cancelled" || project?.exportStatus === "completed") {
          return;
        }

        await convex.mutation(api.system.updateExportStatus, {
          internalKey,
          projectId: payload.projectId as Id<"projects">,
          status: "failed",
        });
      });
    },
  },
  { event: "github/export.repo" },
  async ({ event, step }) => {
    const internalKey = getInternalKey();
    const payload = getPayload(event.data);
    const { projectId, userId, repoName, visibility, description } = payload;

    if (
      !projectId ||
      !userId ||
      !repoName ||
      !visibility
    ) {
      throw new NonRetriableError("Missing GitHub export payload.");
    }

    const convex = getConvexClient();

    await step.run("export-repository", async () => {
      await exportRepository({
        convex,
        internalKey,
        projectId: projectId as Id<"projects">,
        userId,
        repoName,
        visibility,
        description,
      });
    });
  },
);

export const cancelExportToGithub = inngest.createFunction(
  {
    id: "projects-cancel-export-to-github",
  },
  { event: "github/export.cancel" },
  async ({ event, step }) => {
    const internalKey = getInternalKey();
    const payload = getPayload(event.data);

    if (!payload.projectId) {
      return;
    }

    const convex = getConvexClient();

    await step.run("mark-export-cancelled", async () => {
      await convex.mutation(api.system.updateExportStatus, {
        internalKey,
        projectId: payload.projectId as Id<"projects">,
        status: "cancelled",
      });
    });
  },
);
