import { z } from "zod";

import { api, getCompactError, getInternalKey, getToolConvexClient, toProjectId } from "./shared";
import type { AgentToolContext, AgentToolDefinition, AgentToolResult } from "./types";

const listFilesSchema = z.object({});

function sortFiles(
  files: Array<{ name: string; type: "file" | "folder" } & Record<string, unknown>>,
) {
  return [...files].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "folder" ? -1 : 1;
    }

    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

export const listFilesTool: AgentToolDefinition<z.infer<typeof listFilesSchema>> = {
  name: "list-files",
  description:
    "List project files as a flat tree. Return only id, name, type, and parentId so the agent can inspect structure before reading files.",
  async run(context: AgentToolContext): Promise<AgentToolResult> {
    try {
      listFilesSchema.parse({});
      getInternalKey();

      const convex = getToolConvexClient();
      const files = await convex.query(api.system.getProjectFiles, {
        internalKey: context.internalKey,
        projectId: toProjectId(context.projectId),
      });

      const sortedFiles = sortFiles(files).map(file => ({
        id: file._id,
        name: file.name,
        type: file.type,
        parentId: file.parentId ?? null,
      }));

      return {
        ok: true,
        files: sortedFiles,
      };
    } catch (error) {
      return {
        ok: false,
        error: getCompactError(error, "Unable to list files."),
      };
    }
  },
};
