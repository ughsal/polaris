import { ConvexHttpClient } from "convex/browser";

let convexClient: ConvexHttpClient | null = null;

function getConvexUrl() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!url) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured.");
  }

  return url;
}

export function getConvexClient() {
  if (!convexClient) {
    convexClient = new ConvexHttpClient(getConvexUrl());
  }

  return convexClient;
}
