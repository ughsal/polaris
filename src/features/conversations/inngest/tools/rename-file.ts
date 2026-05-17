import { z } from "zod";

import { api, getCompactError, getInternalKey, getToolConvexClient, toFileId } from "./shared";
import type { AgentToolContext, AgentToolDefinition, AgentToolResult } from "./types";

const renameFileSchema = z.object({
  fileId: z.string().min(1),
  name: z.string().min(1),
});

export const renameFileTool: AgentToolDefinition<z.infer<typeof renameFileSchema>> = {
  name: "rename-file",
  description: "Rename a project file or folder.",
  async run(context: AgentToolContext, params: unknown): Promise<AgentToolResult> {
    try {
      const input = renameFileSchema.parse(params);
      getInternalKey();

      const convex = getToolConvexClient();
      const fileId = await convex.mutation(api.system.renameFile, {
        internalKey: context.internalKey,
        fileId: toFileId(input.fileId),
        name: input.name,
      });

      return {
        ok: true,
        fileId,
      };
    } catch (error) {
      return {
        ok: false,
        error: getCompactError(error, "Unable to rename file."),
      };
    }
  },
};
