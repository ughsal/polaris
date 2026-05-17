import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { getConvexClient } from "@/lib/convex-client";
import { inngest } from "@/inngest/client";

const cancelRequestSchema = z.object({
  projectId: z.string().min(1),
});

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsedRequest = cancelRequestSchema.safeParse(json);

  if (!parsedRequest.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const internalKey = process.env.POLARIS_CONVEX_INTERNAL_KEY;

  if (!internalKey) {
    return NextResponse.json(
      { error: "Conversation system is not configured." },
      { status: 503 },
    );
  }

  const convex = getConvexClient();
  const { projectId } = parsedRequest.data;

  try {
    const project = await convex.query(api.system.getProjectWithUser, {
      internalKey,
      projectId: projectId as Id<"projects">,
      userId,
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    if (project.ownerId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const processingMessages = await convex.query(api.system.getProcessingMessages, {
      internalKey,
      projectId: projectId as Id<"projects">,
    });

    const cancelledMessageIds: string[] = [];

    for (const processingMessage of processingMessages) {
      await inngest.send({
        name: "message/cancel",
        data: {
          messageId: processingMessage._id,
          projectId: projectId as Id<"projects">,
        },
      });

      await convex.mutation(api.system.updateMessageStatus, {
        internalKey,
        messageId: processingMessage._id,
        status: "cancelled",
      });

      cancelledMessageIds.push(processingMessage._id);
    }

    return NextResponse.json({
      success: true,
      cancelledMessageIds,
    });
  } catch (error) {
    console.error("[messages/cancel] route:error", { error });

    return NextResponse.json(
      { error: "Unable to cancel message." },
      { status: 500 },
    );
  }
}
