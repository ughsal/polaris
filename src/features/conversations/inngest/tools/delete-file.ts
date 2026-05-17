import { z } from "zod";

import { api, getCompactError, getInternalKey, getToolConvexClient, toFileId } from "./shared";
import type { AgentToolContext, AgentToolDefinition, AgentToolResult } from "./types";

const deleteFileSchema = z.object({
  fileId: z.string().min(1),
});

export const deleteFileTool: AgentToolDefinition<z.infer<typeof deleteFileSchema>> = {
  name: "delete-file",
  description: "Delete a project file or folder. Folder deletion is recursive.",
  async run(context: AgentToolContext, params: unknown): Promise<AgentToolResult> {
    try {
      const input = deleteFileSchema.parse(params);
      getInternalKey();

      const convex = getToolConvexClient();
      const fileId = await convex.mutation(api.system.deleteFile, {
        internalKey: context.internalKey,
        fileId: toFileId(input.fileId),
      });

      return {
        ok: true,
        fileId,
      };
    } catch (error) {
      return {
        ok: false,
        error: getCompactError(error, "Unable to delete file."),
      };
    }
  },
};
