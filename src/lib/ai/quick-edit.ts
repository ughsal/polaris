import { z } from "zod";
import { Ollama } from "ollama";

import {
  quickEditResponseSchema,
  type QuickEditRequest,
} from "@/features/editor/extensions/quick-edit/schema";
import { getFirecrawlContext } from "@/lib/ai/firecrawl";

const DEFAULT_OLLAMA_BASE_URL = "http://0.0.0.0:11434";
const DEFAULT_OLLAMA_MODEL = "nemotron-3-super:cloud";

const ollamaGenerateResponseSchema = z.object({
  response: z.string().default(""),
});

function getOllamaConfig() {
  return {
    host: (process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL).replace(/\/+$/u, ""),
    model: process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL,
  };
}

function buildQuickEditPrompt(input: QuickEditRequest, firecrawlContext: string) {
  return [
    "You are an AI coding assistant performing a targeted code edit.",
    "Return only a JSON object with a single string field named replacement.",
    "The replacement must fully replace the selected code and must not include markdown fences or explanations.",
    "Preserve the surrounding code style and syntax.",
    "",
    `File: ${input.fileName}`,
    "",
    "Instruction:",
    input.instruction,
    "",
    firecrawlContext ? `External context:\n${firecrawlContext}\n` : "",
    "Code before the selection:",
    input.beforeSelection || "(none)",
    "",
    "Selected code to replace:",
    input.selectedCode,
    "",
    "Code after the selection:",
    input.afterSelection || "(none)",
  ]
    .filter(Boolean)
    .join("\n");
}

function normalizeModelOutput(text: string) {
  return text
    .replace(/^```[\w-]*\n?/u, "")
    .replace(/\n?```$/u, "")
    .replace(/<think>[\s\S]*?<\/think>/gu, "")
    .replace(/\r/g, "")
    .trim();
}

export async function generateQuickEdit(
  input: QuickEditRequest,
  signal: AbortSignal,
) {
  const { context } = await getFirecrawlContext(input.instruction);
  const { host, model } = getOllamaConfig();
  const ollama = new Ollama({
    host,
    fetch: (input, init) => fetch(input, { ...init, signal }),
  });

  const response = await ollama.generate({
    model,
    prompt: buildQuickEditPrompt(input, context),
    format: "json",
    think: false,
    options: {
      temperature: 0,
    },
    stream: false,
  });

  const parsed = ollamaGenerateResponseSchema.safeParse(response);

  if (!parsed.success) {
    throw new Error("Invalid quick edit response.");
  }

  const json = JSON.parse(normalizeModelOutput(parsed.data.response)) as unknown;
  return quickEditResponseSchema.parse(json).replacement;
}
