import { z } from "zod";

import { api, getCompactError, getInternalKey, getToolConvexClient, toFileId } from "./shared";
import type { AgentToolContext, AgentToolDefinition, AgentToolResult } from "./types";

const updateFileSchema = z.object({
  fileId: z.string().min(1),
  content: z.string(),
});

export const updateFileTool: AgentToolDefinition<z.infer<typeof updateFileSchema>> = {
  name: "update-file",
  description: "Update the full content of one project file.",
  async run(context: AgentToolContext, params: unknown): Promise<AgentToolResult> {
    try {
      const input = updateFileSchema.parse(params);
      getInternalKey();

      const convex = getToolConvexClient();
      const fileId = await convex.mutation(api.system.updateFile, {
        internalKey: context.internalKey,
        fileId: toFileId(input.fileId),
        content: input.content,
      });

      return {
        ok: true,
        fileId,
      };
    } catch (error) {
      return {
        ok: false,
        error: getCompactError(error, "Unable to update file."),
      };
    }
  },
};
