import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { getConvexClient } from "@/lib/convex-client";
import { inngest } from "@/inngest/client";

const messageRequestSchema = z.object({
  conversationId: z.string().min(1),
  message: z.string().trim().min(1).max(10000),
});

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "";
}

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsedRequest = messageRequestSchema.safeParse(json);

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
  const { conversationId, message } = parsedRequest.data;

  try {
    const conversationWithProject = await convex.query(
      api.system.getConversationWithProject,
      {
        internalKey,
        conversationId: conversationId as Id<"conversations">,
        userId,
      },
    );

    if (!conversationWithProject) {
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 },
      );
    }
    const { project } = conversationWithProject;

    await convex.mutation(api.system.createMessage, {
      internalKey,
      conversationId: conversationId as Id<"conversations">,
      projectId: project._id,
      role: "user",
      content: message,
    });

    const assistantMessageId = await convex.mutation(api.system.createMessage, {
      internalKey,
      conversationId: conversationId as Id<"conversations">,
      projectId: project._id,
      role: "assistant",
      content: "",
      status: "processing",
    });

    const event = await inngest.send({
      name: "message/sent",
      data: {
        messageId: assistantMessageId,
      },
    });

    return NextResponse.json({
      success: true,
      eventId: event.ids[0] ?? crypto.randomUUID(),
      messageId: assistantMessageId,
    });
  } catch (error) {
    const message = getErrorMessage(error);

    if (message.includes("Unauthorized")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }

    if (message.includes("not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    console.error("[messages] route:error", { error });

    return NextResponse.json(
      { error: "Unable to send message." },
      { status: 500 },
    );
  }
}
