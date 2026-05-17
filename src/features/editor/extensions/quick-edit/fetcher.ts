"use client";

import { toast } from "sonner";

import {
  quickEditRequestSchema,
  quickEditResponseSchema,
  type QuickEditRequest,
} from "./schema";

const REQUEST_TIMEOUT_MS = 20000;

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

export async function fetchQuickEdit(
  payload: QuickEditRequest,
  options?: { signal?: AbortSignal },
) {
  const parsedPayload = quickEditRequestSchema.parse(payload);
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const abortHandler = () => controller.abort();
  options?.signal?.addEventListener("abort", abortHandler);

  try {
    const response = await fetch("/api/ai/quick-edit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parsedPayload),
      signal: controller.signal,
    });

    const json = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        json && typeof json === "object" && "error" in json && typeof json.error === "string"
          ? json.error
          : "Quick edit failed.";
      throw new Error(message);
    }

    const parsedResponse = quickEditResponseSchema.parse(json);
    return parsedResponse.replacement;
  } catch (error) {
    if (isAbortError(error)) {
      return null;
    }

    toast.error(error instanceof Error ? error.message : "Quick edit failed.");
    return null;
  } finally {
    window.clearTimeout(timeoutId);
    options?.signal?.removeEventListener("abort", abortHandler);
  }
}
