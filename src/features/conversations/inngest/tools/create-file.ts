import { z } from "zod";

import { api, getCompactError, getInternalKey, getToolConvexClient, toFileId, toProjectId } from "./shared";
import type { AgentToolContext, AgentToolDefinition, AgentToolResult } from "./types";

const createFileSchema = z.object({
  name: z.string().min(1),
  content: z.string(),
  parentId: z.string().min(1).optional(),
});

export const createFileTool: AgentToolDefinition<z.infer<typeof createFileSchema>> = {
  name: "create-file",
  description: "Create one new project file in the current folder or root.",
  async run(context: AgentToolContext, params: unknown): Promise<AgentToolResult> {
    try {
      const input = createFileSchema.parse(params);
      getInternalKey();

      const convex = getToolConvexClient();
      const fileId = await convex.mutation(api.system.createFile, {
        internalKey: context.internalKey,
        projectId: toProjectId(context.projectId),
        parentId: input.parentId ? toFileId(input.parentId) : undefined,
        name: input.name,
        content: input.content,
      });

      return {
        ok: true,
        fileId,
      };
    } catch (error) {
      return {
        ok: false,
        error: getCompactError(error, "Unable to create file."),
      };
    }
  },
};
