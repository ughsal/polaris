import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { verifyAuth } from "./auth";

async function assertProjectAccess(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<"projects">,
) {
  const identity = await verifyAuth(ctx);
  const project = await ctx.db.get(projectId);

  if (!project) {
    throw new Error("Project not found.");
  }

  if (project.ownerId !== identity.subject) {
    throw new Error("Unauthorized: you do not have access to this project.");
  }

  return project;
}

async function assertConversationAccess(
  ctx: QueryCtx | MutationCtx,
  conversationId: Id<"conversations">,
) {
  const conversation = await ctx.db.get(conversationId);

  if (!conversation) {
    throw new Error("Conversation not found.");
  }

  await assertProjectAccess(ctx, conversation.projectId);

  return conversation;
}

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    await assertProjectAccess(ctx, args.projectId);

    const conversationId = await ctx.db.insert("conversations", {
      projectId: args.projectId,
      title: args.title.trim(),
      updatedAt: Date.now(),
    });

    return conversationId;
  },
});

export const getById = query({
  args: {
    id: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    return await assertConversationAccess(ctx, args.id);
  },
});

export const getByProject = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    await assertProjectAccess(ctx, args.projectId);

    return await ctx.db
      .query("conversations")
      .withIndex("by_project", q => q.eq("projectId", args.projectId))
      .order("desc")
      .collect();
  },
});

export const getMessages = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const conversation = await assertConversationAccess(ctx, args.conversationId);

    return await ctx.db
      .query("messages")
      .withIndex("by_conversation", q =>
        q.eq("conversationId", conversation._id),
      )
      .order("asc")
      .collect();
  },
});
