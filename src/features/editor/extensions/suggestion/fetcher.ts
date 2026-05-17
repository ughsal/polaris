"use client";

import {
  suggestionRequestSchema,
  suggestionResponseSchema,
  type SuggestionRequest,
} from "./schema";

const REQUEST_TIMEOUT_MS = 10000;

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function createDebugId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `suggestion-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function fetchSuggestion(
  payload: SuggestionRequest,
  options?: { signal?: AbortSignal },
) {
  const parsedPayload = suggestionRequestSchema.parse(payload);
  const requestId = createDebugId();
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const abortHandler = () => controller.abort();
  options?.signal?.addEventListener("abort", abortHandler);

  if (process.env.NODE_ENV !== "production") {
    console.debug("[ai/suggestion] request:start", {
      requestId,
      fileName: parsedPayload.fileName,
      lineNumber: parsedPayload.lineNumber,
      selectedChars: parsedPayload.code.length,
    });
  }

  try {
    const response = await fetch("/api/suggestion", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parsedPayload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      if (process.env.NODE_ENV !== "production") {
        console.warn("[ai/suggestion] request:failed", {
          requestId,
          status: response.status,
          errorBody,
        });
      }

      throw new Error(
        errorBody && typeof errorBody === "object" && "error" in errorBody
          ? String(errorBody.error)
          : `Suggestion request failed with ${response.status}.`,
      );
    }

    const json = await response.json();
    const parsedResponse = suggestionResponseSchema.parse(json);

    if (process.env.NODE_ENV !== "production") {
      console.debug("[ai/suggestion] request:success", {
        requestId,
        suggestionChars: parsedResponse.suggestion.length,
      });
    }

    return parsedResponse.suggestion || null;
  } catch (error) {
    if (isAbortError(error)) {
      if (process.env.NODE_ENV !== "production") {
        console.debug("[ai/suggestion] request:aborted", { requestId });
      }
      return null;
    }

    if (process.env.NODE_ENV !== "production") {
      console.warn("[ai/suggestion] request:error", {
        requestId,
        error,
      });
    }

    return null;
  } finally {
    window.clearTimeout(timeoutId);
    options?.signal?.removeEventListener("abort", abortHandler);
  }
}
