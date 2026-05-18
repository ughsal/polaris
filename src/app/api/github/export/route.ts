import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { inngest } from "@/inngest/client";
import { getConvexClient } from "@/lib/convex-client";

const requestSchema = z.object({
  projectId: z.string().min(1),
  repoName: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[A-Za-z0-9._-]+$/u, "Repository names may only contain letters, numbers, dots, hyphens, and underscores."),
  visibility: z.enum(["public", "private"]).default("private"),
  description: z.string().trim().max(350).optional(),
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

  const internalKey = getInternalKey();
  const convex = getConvexClient();
  const projectId = parsedBody.data.projectId as Id<"projects">;

  try {
    const project = await convex.query(api.system.getProjectWithUser, {
      internalKey,
      projectId,
      userId,
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    const event = await inngest.send({
      name: "github/export.repo",
      data: {
        projectId,
        userId,
        repoName: parsedBody.data.repoName,
        visibility: parsedBody.data.visibility,
        description: parsedBody.data.description,
      },
    });

    return NextResponse.json({
      success: true,
      eventId: event.ids[0] ?? crypto.randomUUID(),
    });
  } catch (error) {
    console.error("[github/export] route failed", { error });

    return NextResponse.json(
      { error: "Unable to export project." },
      { status: 500 },
    );
  }
}
