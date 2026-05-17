import { z } from "zod";

import type { Id } from "../../../../../convex/_generated/dataModel";
import { api, getCompactError, getInternalKey, getToolConvexClient, toFileId } from "./shared";
import type { AgentToolContext, AgentToolDefinition, AgentToolResult } from "./types";

const readFilesSchema = z.object({
  fileIds: z.array(z.string().min(1)).min(1).max(20),
});

const MAX_CONTENT_LENGTH = 12_000;

function trimContent(content: string) {
  if (content.length <= MAX_CONTENT_LENGTH) {
    return { content, truncated: false };
  }

  return {
    content: `${content.slice(0, MAX_CONTENT_LENGTH)}\n\n[truncated]`,
    truncated: true,
  };
}

export const readFilesTool: AgentToolDefinition<z.infer<typeof readFilesSchema>> = {
  name: "read-files",
  description:
    "Read specific project files by file ID. Require explicit IDs and use list-files first if you need file discovery.",
  async run(context: AgentToolContext, params: unknown): Promise<AgentToolResult> {
    try {
      const input = readFilesSchema.parse(params);
      getInternalKey();

      const convex = getToolConvexClient();
      const files = await Promise.all(
        input.fileIds.map(async fileId => {
          const file = await convex.query(api.system.getFileById, {
            internalKey: context.internalKey,
            fileId: toFileId(fileId),
          });

          if (!file) {
            return null;
          }

          const trimmed = trimContent(file.content ?? "");
          return {
            id: file._id,
            name: file.name,
            content: trimmed.content,
            truncated: trimmed.truncated,
          };
        }),
      );

      const foundFiles = files.filter(
        (file): file is { id: Id<"files">; name: string; content: string; truncated: boolean } =>
          file !== null,
      );

      if (!foundFiles.length) {
        return {
          ok: false,
          error: "No files were found. Use list-files first.",
        };
      }

      return {
        ok: true,
        files: foundFiles,
      };
    } catch (error) {
      return {
        ok: false,
        error: getCompactError(error, "Unable to read files."),
      };
    }
  },
};
