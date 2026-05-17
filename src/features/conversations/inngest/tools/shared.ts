import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { getConvexClient } from "@/lib/convex-client";

export function getInternalKey() {
  const internalKey = process.env.POLARIS_CONVEX_INTERNAL_KEY;

  if (!internalKey) {
    throw new Error("POLARIS_CONVEX_INTERNAL_KEY is not configured.");
  }

  return internalKey;
}

export function getToolConvexClient() {
  return getConvexClient();
}

export function toFileId(fileId: string) {
  return fileId as Id<"files">;
}

export function toProjectId(projectId: string) {
  return projectId as Id<"projects">;
}

export function toConversationId(conversationId: string) {
  return conversationId as Id<"conversations">;
}

export function getCompactError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export { api };
