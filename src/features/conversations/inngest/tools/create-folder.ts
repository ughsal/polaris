import { z } from "zod";

import { api, getCompactError, getInternalKey, getToolConvexClient, toFileId, toProjectId } from "./shared";
import type { AgentToolContext, AgentToolDefinition, AgentToolResult } from "./types";

const createFolderSchema = z.object({
  name: z.string().min(1),
  parentId: z.string().min(1).optional(),
});

export const createFolderTool: AgentToolDefinition<z.infer<typeof createFolderSchema>> = {
  name: "create-folder",
  description: "Create a new folder in the current project or inside a parent folder.",
  async run(context: AgentToolContext, params: unknown): Promise<AgentToolResult> {
    try {
      const input = createFolderSchema.parse(params);
      getInternalKey();

      const convex = getToolConvexClient();
      const folderId = await convex.mutation(api.system.createFolder, {
        internalKey: context.internalKey,
        projectId: toProjectId(context.projectId),
        parentId: input.parentId ? toFileId(input.parentId) : undefined,
        name: input.name,
      });

      return {
        ok: true,
        folderId,
      };
    } catch (error) {
      return {
        ok: false,
        error: getCompactError(error, "Unable to create folder."),
      };
    }
  },
};
