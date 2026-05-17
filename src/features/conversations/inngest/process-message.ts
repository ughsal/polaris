import { NonRetriableError } from "inngest";

import { inngest } from "@/inngest/client";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { getConvexClient } from "@/lib/convex-client";

const PROCESSING_DELAY = "4s";
const FRIENDLY_FALLBACK =
  "My apologies, I encountered an error while processing your request. Let me know if you need anything else.";
const PROCESSING_REPLY = "AI processed this message (TODO)";

function getInternalKey() {
  const internalKey = process.env.POLARIS_CONVEX_INTERNAL_KEY;

  if (!internalKey) {
    throw new NonRetriableError("POLARIS_CONVEX_INTERNAL_KEY is not configured.");
  }

  return internalKey;
}

export const processMessage = inngest.createFunction(
  {
    id: "conversation-process-message",
    onFailure: async ({ event, step }) => {
      const internalKey = getInternalKey();
      const originalEvent = event.data.event as
        | { data?: { messageId?: string } }
        | undefined;
      const messageId = originalEvent?.data?.messageId;

      if (!messageId) {
        return;
      }

      const convex = getConvexClient();

      await step.run("apply-failure-fallback", async () => {
        await convex.mutation(api.system.updateMessageContent, {
          internalKey,
          messageId: messageId as Id<"messages">,
          content: FRIENDLY_FALLBACK,
        });
      });
    },
  },
  { event: "message/sent" },
  async ({ event, step }) => {
    const internalKey = getInternalKey();
    const { messageId } = event.data as { messageId: string };
    const convex = getConvexClient();

    await step.sleep("simulate-processing", PROCESSING_DELAY);

    const response = await step.run("complete-assistant-message", async () => {
      return await convex.mutation(api.system.updateMessageContent, {
        internalKey,
        messageId: messageId as Id<"messages">,
        content: PROCESSING_REPLY,
      });
    });

    return response;
  },
);
