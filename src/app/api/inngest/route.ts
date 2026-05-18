import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import { processMessage } from "@/features/conversations/inngest/process-message";
import { cancelMessage } from "@/features/conversations/inngest/cancel-message";
import { importGitHubRepository } from "@/features/projects/inngest/import-github-repository";
import {
  cancelExportToGithub,
  exportToGithub,
} from "@/features/projects/inngest/export-to-github";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processMessage,
    cancelMessage,
    importGitHubRepository,
    exportToGithub,
    cancelExportToGithub,
  ],
});
