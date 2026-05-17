import { useMutation, useQuery } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export const useConversation = (conversationId: Id<"conversations"> | null) => {
  return useQuery(
    api.conversations.getById,
    conversationId ? { id: conversationId } : "skip",
  );
};

export const useMessages = (conversationId: Id<"conversations"> | null) => {
  return useQuery(
    api.conversations.getMessages,
    conversationId ? { conversationId } : "skip",
  );
};

export const useConversations = (projectId: Id<"projects">) => {
  return useQuery(api.conversations.getByProject, { projectId });
};

export const useCreateConversation = () => {
  // TODO: add a safe optimistic update once the sidebar selection behavior
  // has settled, if it remains simple and low-risk.
  return useMutation(api.conversations.create);
};
