import { NonRetriableError } from "inngest";

import { inngest } from "@/inngest/client";
import { getConvexClient } from "@/lib/convex-client";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

function getInternalKey() {
  const internalKey = process.env.POLARIS_CONVEX_INTERNAL_KEY;

  if (!internalKey) {
    throw new NonRetriableError("POLARIS_CONVEX_INTERNAL_KEY is not configured.");
  }

  return internalKey;
}

export const cancelMessage = inngest.createFunction(
  {
    id: "conversation-cancel-message",
  },
  { event: "message/cancel" },
  async ({ event, step }) => {
    const internalKey = getInternalKey();
    const payload = (event.data as {
      messageId?: string;
    }) ?? {};
    const messageId = payload.messageId;

    if (!messageId) {
      return;
    }

    const convex = getConvexClient();

    await step.run("ensure-message-cancelled", async () => {
      const message = await convex.query(api.system.getMessageById, {
        internalKey,
        messageId: messageId as Id<"messages">,
      });

      if (!message || message.status === "cancelled" || message.status === "completed") {
        return;
      }

      await convex.mutation(api.system.updateMessageStatus, {
        internalKey,
        messageId: messageId as Id<"messages">,
        status: "cancelled",
      });
    });
  },
);
