// convex/auth.ts
import { MutationCtx, QueryCtx } from "./_generated/server";

/**
 * Verifies the caller is authenticated.
 * Returns the Clerk identity object.
 * Throws if unauthenticated.
 *
 * Used in every query and mutation that touches project data.
 */
export async function verifyAuth(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthenticated: you must be signed in.");
  }
  return identity;
}
