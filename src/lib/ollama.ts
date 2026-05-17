import { Ollama } from "ollama";
import { z } from "zod";

import {
  type SuggestionRequest,
  suggestionResponseSchema,
  suggestionRequestSchema,
} from "@/features/editor/extensions/suggestion/schema";

const DEFAULT_OLLAMA_BASE_URL = "http://0.0.0.0:11434";
const DEFAULT_OLLAMA_MODEL = "nemotron-3-super:cloud";

const ollamaGenerateResponseSchema = z.object({
  response: z.string().default(""),
});

const structuredSuggestionSchema = z.object({
  suggestion: z.string(),
});

function buildSuggestionPrompt(input: SuggestionRequest) {
  return [
    "You are an AI coding assistant inside a code editor.",
    "Return only the exact code that should be inserted at the cursor.",
    "Do not return markdown, backticks, explanations, comments about the suggestion, or surrounding context.",
    "Keep the suggestion concise and continue the existing code style.",
    "",
    `File: ${input.fileName}`,
    `Line number: ${input.lineNumber}`,
    "",
    "Previous lines:",
    input.previousLines.join("\n") || "(none)",
    "",
    "Current line:",
    input.currentLine || "(empty line)",
    "",
    "Text before cursor:",
    input.textBeforeCursor || "(empty)",
    "",
    "Text after cursor:",
    input.textAfterCursor || "(empty)",
    "",
    "Next lines:",
    input.nextLines.join("\n") || "(none)",
    "",
    "Full code:",
    input.code,
  ].join("\n");
}

function normalizeModelOutput(text: string) {
  return text
    .replace(/^```[\w-]*\n?/u, "")
    .replace(/\n?```$/u, "")
    .replace(/<think>[\s\S]*?<\/think>/gu, "")
    .replace(/\r/g, "");
}

function getOllamaConfig() {
  const baseUrl = (process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL).replace(
    /\/+$/u,
    "",
  );
  const model = process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL;

  return {
    baseUrl,
    model,
  };
}

export async function generateOllamaSuggestion(
  input: SuggestionRequest,
  signal: AbortSignal,
) {
  const { baseUrl, model } = getOllamaConfig();
  const ollama = new Ollama({
    host: baseUrl,
    fetch: (input, init) => fetch(input, { ...init, signal }),
  });

  const response = await ollama.generate({
    model,
    prompt: buildSuggestionPrompt(suggestionRequestSchema.parse(input)),
    format: "json",
    think: false,
    options: {
      temperature: 0,
    },
    stream: false,
  });

  const parsed = ollamaGenerateResponseSchema.safeParse(response);

  if (!parsed.success) {
    console.error("[ai/suggestion] ollama:invalid-response", {
      model,
      baseUrl,
      response,
    });
    throw new Error("Invalid Ollama response.");
  }

  const cleanedResponse = normalizeModelOutput(parsed.data.response);
  let maybeStructured: unknown;

  try {
    maybeStructured = JSON.parse(cleanedResponse) as unknown;
  } catch (error) {
    console.error("[ai/suggestion] ollama:json-parse-error", {
      model,
      baseUrl,
      cleanedResponse,
      error,
    });
    throw new Error("Invalid Ollama structured response.");
  }

  const structuredSuggestion = structuredSuggestionSchema.safeParse(maybeStructured);

  if (!structuredSuggestion.success) {
    console.error("[ai/suggestion] ollama:structured-parse-error", {
      model,
      baseUrl,
      maybeStructured,
    });
    throw new Error("Invalid Ollama structured response.");
  }

  return suggestionResponseSchema.parse(structuredSuggestion.data).suggestion;
}
