// convex/projects.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { verifyAuth } from "./auth";

/**
 * Creates a new project for the authenticated user.
 * Returns the new project ID.
 */
export const create = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const projectId = await ctx.db.insert("projects", {
      name: args.name,
      ownerId: identity.subject,
      updatedAt: Date.now(),
    });

    return projectId;
  },
});

/**
 * Returns ALL projects owned by the authenticated user.
 * Sorted descending by creation time.
 */
export const get = query({
  args: {},
  handler: async ctx => {
    const identity = await verifyAuth(ctx);

    return await ctx.db
      .query("projects")
      .withIndex("by_owner", q => q.eq("ownerId", identity.subject))
      .order("desc")
      .collect();
  },
});

/**
 * Returns a limited slice of projects owned by the authenticated user.
 * Sorted descending. Used for the dashboard's "recent projects" list.
 */
export const getPartial = query({
  args: {
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    return await ctx.db
      .query("projects")
      .withIndex("by_owner", q => q.eq("ownerId", identity.subject))
      .order("desc")
      .take(args.limit);
  },
});
