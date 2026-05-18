import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { inngest } from "@/inngest/client";
import {
  getGithubAccessState,
  getGithubConnectionErrorMessage,
} from "@/lib/clerk-github";
import { getConvexClient } from "@/lib/convex-client";
import { parseGitHubRepositoryUrl } from "@/lib/github";

const requestSchema = z.object({
  url: z.string().trim().url(),
});

function getInternalKey() {
  const internalKey = process.env.POLARIS_CONVEX_INTERNAL_KEY;

  if (!internalKey) {
    throw new Error("POLARIS_CONVEX_INTERNAL_KEY is not configured.");
  }

  return internalKey;
}

export async function POST(request: Request) {
  const { isAuthenticated, userId } = await auth();

  if (!isAuthenticated || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsedBody = requestSchema.safeParse(await request.json().catch(() => null));

  if (!parsedBody.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const repository = parseGitHubRepositoryUrl(parsedBody.data.url);

  if (!repository) {
    return NextResponse.json(
      { error: "Enter a valid GitHub repository URL." },
      { status: 400 },
    );
  }

  const clerk = await clerkClient();
  const githubState = await getGithubAccessState(clerk, userId);
  const githubConnectionError = getGithubConnectionErrorMessage(githubState);

  if (githubConnectionError) {
    return NextResponse.json(
      { error: githubConnectionError },
      { status: 400 },
    );
  }

  const internalKey = getInternalKey();
  const convex = getConvexClient();
  let projectId: Id<"projects"> | null = null;

  try {
    projectId = await convex.mutation(api.system.createProject, {
      internalKey,
      name: repository.repo,
      ownerId: userId,
    });

    const event = await inngest.send({
      name: "github/import.repo",
      data: {
        owner: repository.owner,
        repo: repository.repo,
        projectId,
        githubToken: githubState.githubToken,
      },
    });

    return NextResponse.json({
      success: true,
      projectId,
      eventId: event.ids[0] ?? crypto.randomUUID(),
    });
  } catch (error) {
    if (projectId) {
      try {
        await convex.mutation(api.system.updateImportStatus, {
          internalKey,
          projectId,
          status: "failed",
        });
      } catch {
        // Best effort only.
      }
    }

    const message = error instanceof Error ? error.message : "";

    if (message.includes("configured")) {
      return NextResponse.json(
        { error: "GitHub import is not configured." },
        { status: 503 },
      );
    }

    console.error("[github/import] route failed", { error });

    return NextResponse.json(
      { error: "Unable to import repository." },
      { status: 500 },
    );
  }
}
