import type { Id } from "../../../../../convex/_generated/dataModel";

export interface AgentToolContext {
  internalKey: string;
  projectId: Id<"projects">;
  conversationId: Id<"conversations">;
}

export interface AgentToolResult {
  ok: boolean;
  error?: string;
  [key: string]: unknown;
}

export interface AgentToolDefinition<TParams> {
  name: string;
  description: string;
  run: (context: AgentToolContext, params: TParams) => Promise<AgentToolResult>;
}

export interface ConversationAgentTool {
  name: string;
  description: string;
  run: (context: AgentToolContext, params: unknown) => Promise<AgentToolResult>;
}
