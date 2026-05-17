import { Ollama } from "ollama";

import { type SuggestionRequest, suggestionRequestSchema } from "@/features/editor/extensions/suggestion/schema";

const DEFAULT_OLLAMA_BASE_URL = "http://0.0.0.0:11434";
const DEFAULT_OLLAMA_MODEL = "nemotron-3-super:cloud";

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

function extractSuggestion(text: string) {
  const cleaned = normalizeModelOutput(text).trim();

  if (!cleaned) {
    return "";
  }

  try {
    const parsed = JSON.parse(cleaned) as unknown;

    if (typeof parsed === "string") {
      return normalizeModelOutput(parsed).trim();
    }

    if (
      parsed &&
      typeof parsed === "object" &&
      "suggestion" in parsed &&
      typeof parsed.suggestion === "string"
    ) {
      return normalizeModelOutput(parsed.suggestion).trim();
    }
  } catch {
    return cleaned;
  }

  return cleaned;
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

  const responseText =
    typeof response.response === "string" ? response.response : "";

  if (!responseText.trim()) {
    throw new Error("Empty Ollama response.");
  }

  const suggestion = extractSuggestion(responseText);

  if (!suggestion) {
    throw new Error("Empty Ollama suggestion.");
  }

  return suggestion;
}
