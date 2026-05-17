import { createFileTool } from "./create-file";
import { createFilesTool } from "./create-files";
import { createFolderTool } from "./create-folder";
import { deleteFileTool } from "./delete-file";
import { listFilesTool } from "./list-files";
import { readFilesTool } from "./read-files";
import { renameFileTool } from "./rename-file";
import { updateFileTool } from "./update-file";
import type { ConversationAgentTool } from "./types";

export const CONVERSATION_AGENT_TOOLS: readonly ConversationAgentTool[] = [
  listFilesTool as ConversationAgentTool,
  readFilesTool as ConversationAgentTool,
  updateFileTool as ConversationAgentTool,
  createFileTool as ConversationAgentTool,
  createFilesTool as ConversationAgentTool,
  createFolderTool as ConversationAgentTool,
  renameFileTool as ConversationAgentTool,
  deleteFileTool as ConversationAgentTool,
] as const;

export function getConversationAgentTool(
  name: string,
): ConversationAgentTool | null {
  return CONVERSATION_AGENT_TOOLS.find(tool => tool.name === name) ?? null;
}
