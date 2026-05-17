import { z } from "zod";

import { api, getCompactError, getInternalKey, getToolConvexClient, toFileId, toProjectId } from "./shared";
import type { AgentToolContext, AgentToolDefinition, AgentToolResult } from "./types";

const createFilesSchema = z.object({
  parentId: z.string().min(1).optional(),
  files: z
    .array(
      z.object({
        name: z.string().min(1),
        content: z.string(),
      }),
    )
    .min(1)
    .max(20),
});

export const createFilesTool: AgentToolDefinition<z.infer<typeof createFilesSchema>> = {
  name: "create-files",
  description: "Create multiple files in one action and return per-file results.",
  async run(context: AgentToolContext, params: unknown): Promise<AgentToolResult> {
    try {
      const input = createFilesSchema.parse(params);
      getInternalKey();

      const convex = getToolConvexClient();
      const results = await convex.mutation(api.system.createFiles, {
        internalKey: context.internalKey,
        projectId: toProjectId(context.projectId),
        parentId: input.parentId ? toFileId(input.parentId) : undefined,
        files: input.files,
      });

      return {
        ok: true,
        results,
      };
    } catch (error) {
      return {
        ok: false,
        error: getCompactError(error, "Unable to create files."),
      };
    }
  },
};
