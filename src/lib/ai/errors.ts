export function isAbortLikeError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeName =
    "name" in error && typeof error.name === "string" ? error.name : null;
  const maybeMessage =
    "message" in error && typeof error.message === "string"
      ? error.message
      : null;

  return (
    maybeName === "AbortError" ||
    maybeName === "ResponseAborted" ||
    maybeMessage === "This operation was aborted" ||
    maybeMessage === "The operation was aborted." ||
    maybeMessage === "ResponseAborted"
  );
}
