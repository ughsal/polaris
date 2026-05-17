import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

const INTERNAL_KEY_ENV = "POLARIS_CONVEX_INTERNAL_KEY";

function validateInternalKey(internalKey: string) {
  const expected = process.env[INTERNAL_KEY_ENV];

  if (!expected) {
    throw new Error("Conversation system is not configured.");
  }

  if (!internalKey || internalKey !== expected) {
    throw new Error("Unauthorized internal conversation access.");
  }
}

export const getConversationById = query({
  args: {
    internalKey: v.string(),
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    validateInternalKey(args.internalKey);
    return await ctx.db.get(args.conversationId);
  },
});

export const getConversationWithProject = query({
  args: {
    internalKey: v.string(),
    conversationId: v.id("conversations"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    validateInternalKey(args.internalKey);

    const conversation = await ctx.db.get(args.conversationId);

    if (!conversation) {
      return null;
    }

    const project = await ctx.db.get(conversation.projectId);

    if (!project) {
      return null;
    }

    if (project.ownerId !== args.userId) {
      throw new Error("Unauthorized: you do not have access to this project.");
    }

    return {
      conversation,
      project,
    };
  },
});

export const createMessage = mutation({
  args: {
    internalKey: v.string(),
    conversationId: v.id("conversations"),
    projectId: v.id("projects"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    status: v.optional(
      v.union(
        v.literal("processing"),
        v.literal("completed"),
        v.literal("cancelled"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    validateInternalKey(args.internalKey);

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      projectId: args.projectId,
      role: args.role,
      content: args.content,
      status: args.status,
    });

    await ctx.db.patch(args.conversationId, {
      updatedAt: Date.now(),
    });

    return messageId;
  },
});

export const updateMessageContent = mutation({
  args: {
    internalKey: v.string(),
    messageId: v.id("messages"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    validateInternalKey(args.internalKey);

    const message = await ctx.db.get(args.messageId);

    if (!message) {
      throw new Error("Message not found.");
    }

    await ctx.db.patch(args.messageId, {
      content: args.content,
      status: "completed",
    });

    await ctx.db.patch(message.conversationId, {
      updatedAt: Date.now(),
    });

    return args.messageId;
  },
});

export { validateInternalKey };
