import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { getConvexClient } from "@/lib/convex-client";

const requestSchema = z.object({
  projectId: z.string().min(1),
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

    await convex.mutation(api.system.updateExportStatus, {
      internalKey,
      projectId,
      status: undefined,
      repoUrl: undefined,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[github/export/reset] route failed", { error });

    return NextResponse.json(
      { error: "Unable to reset export state." },
      { status: 500 },
    );
  }
}
