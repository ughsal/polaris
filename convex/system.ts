import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";

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

function normalizeItemName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function compareFileItems(a: Doc<"files">, b: Doc<"files">) {
  if (a.type !== b.type) {
    return a.type === "folder" ? -1 : 1;
  }

  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

async function getProjectSiblingItems(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<"projects">,
  parentId?: Id<"files">,
) {
  return await ctx.db
    .query("files")
    .withIndex("by_project_and_parent", q =>
      q.eq("projectId", projectId).eq("parentId", parentId),
    )
    .collect();
}

function ensureUniqueSiblingName(
  name: string,
  siblings: Doc<"files">[],
  type: Doc<"files">["type"],
  excludeId?: string,
) {
  const normalizedName = normalizeItemName(name);

  if (!normalizedName) {
    throw new Error("Name cannot be empty.");
  }

  const hasConflict = siblings.some(
    sibling =>
      sibling._id !== excludeId &&
      sibling.type === type &&
      sibling.name.localeCompare(normalizedName, undefined, {
        sensitivity: "base",
      }) === 0,
  );

  if (hasConflict) {
    throw new Error(
      type === "folder"
        ? "A folder with this name already exists here."
        : "A file with this name already exists here.",
    );
  }

  return normalizedName;
}

async function deleteFileTree(ctx: MutationCtx, fileId: Id<"files">) {
  const children = await ctx.db
    .query("files")
    .withIndex("by_parent", q => q.eq("parentId", fileId))
    .collect();

  for (const child of children as Doc<"files">[]) {
    await deleteFileTree(ctx, child._id);
  }

  const file = await ctx.db.get(fileId);
  if (!file) {
    return;
  }

  if (file.storageId) {
    await ctx.storage.delete(file.storageId);
  }

  await ctx.db.delete(fileId);
}

async function touchProject(ctx: MutationCtx, projectId: Id<"projects">) {
  await ctx.db.patch(projectId, {
    updatedAt: Date.now(),
  });
}

async function assertParentFolder(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<"projects">,
  parentId?: Id<"files">,
) {
  if (!parentId) {
    return null;
  }

  const parent = await ctx.db.get(parentId);

  if (!parent || parent.projectId !== projectId) {
    throw new Error("Parent folder not found.");
  }

  if (parent.type !== "folder") {
    throw new Error("Parent must be a folder.");
  }

  return parent;
}

function normalizeProjectName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function makeProjectSuffix() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${timestamp}-${random}`;
}

function resolveUniqueProjectName(
  desiredName: string,
  existingProjects: Doc<"projects">[],
) {
  const baseName = normalizeProjectName(desiredName);

  if (!baseName) {
    throw new Error("Project name cannot be empty.");
  }

  const takenNames = new Set(existingProjects.map(project => project.name));

  if (!takenNames.has(baseName)) {
    return baseName;
  }

  let candidate = `${baseName}-${makeProjectSuffix()}`;

  while (takenNames.has(candidate)) {
    candidate = `${baseName}-${makeProjectSuffix()}`;
  }

  return candidate;
}

async function getOwnedProjects(
  ctx: QueryCtx | MutationCtx,
  ownerId: string,
) {
  return await ctx.db
    .query("projects")
    .withIndex("by_owner", q => q.eq("ownerId", ownerId))
    .collect();
}

async function cleanupProjectFiles(ctx: MutationCtx, projectId: Id<"projects">) {
  const files = await ctx.db
    .query("files")
    .withIndex("by_project", q => q.eq("projectId", projectId))
    .collect();

  const byId = new Map(files.map(file => [file._id, file] as const));

  for (const file of files) {
    const parent = file.parentId ? byId.get(file.parentId) : null;

    if (!parent) {
      await deleteFileTree(ctx, file._id);
    }
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

export const getMessageById = query({
  args: {
    internalKey: v.string(),
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    validateInternalKey(args.internalKey);
    return await ctx.db.get(args.messageId);
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

export const getProjectWithUser = query({
  args: {
    internalKey: v.string(),
    projectId: v.id("projects"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    validateInternalKey(args.internalKey);

    const project = await ctx.db.get(args.projectId);

    if (!project) {
      return null;
    }

    if (project.ownerId !== args.userId) {
      throw new Error("Unauthorized: you do not have access to this project.");
    }

    return project;
  },
});

export const getProjectById = query({
  args: {
    internalKey: v.string(),
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    validateInternalKey(args.internalKey);
    return await ctx.db.get(args.projectId);
  },
});

export const cleanup = mutation({
  args: {
    internalKey: v.string(),
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    validateInternalKey(args.internalKey);
    await cleanupProjectFiles(ctx, args.projectId);
    await touchProject(ctx, args.projectId);
    return args.projectId;
  },
});

export const generateUploadUrl = mutation({
  args: {
    internalKey: v.string(),
  },
  handler: async (ctx, args) => {
    validateInternalKey(args.internalKey);
    return await ctx.storage.generateUploadUrl();
  },
});

export const createBinaryFile = mutation({
  args: {
    internalKey: v.string(),
    projectId: v.id("projects"),
    name: v.string(),
    storageId: v.id("_storage"),
    parentId: v.optional(v.id("files")),
  },
  handler: async (ctx, args) => {
    validateInternalKey(args.internalKey);
    await assertParentFolder(ctx, args.projectId, args.parentId);

    const siblings = await getProjectSiblingItems(
      ctx,
      args.projectId,
      args.parentId,
    );
    const name = ensureUniqueSiblingName(args.name, siblings, "file");

    const fileId = await ctx.db.insert("files", {
      projectId: args.projectId,
      parentId: args.parentId,
      name,
      type: "file",
      storageId: args.storageId,
      updatedAt: Date.now(),
    });

    await touchProject(ctx, args.projectId);

    return fileId;
  },
});

export const updateImportStatus = mutation({
  args: {
    internalKey: v.string(),
    projectId: v.id("projects"),
    status: v.union(
      v.literal("importing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
  },
  handler: async (ctx, args) => {
    validateInternalKey(args.internalKey);

    await ctx.db.patch(args.projectId, {
      importStatus: args.status,
      updatedAt: Date.now(),
    });

    return args.projectId;
  },
});

export const updateExportStatus = mutation({
  args: {
    internalKey: v.string(),
    projectId: v.id("projects"),
    status: v.optional(
      v.union(
        v.literal("exporting"),
        v.literal("completed"),
        v.literal("failed"),
        v.literal("cancelled"),
      ),
    ),
    repoUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    validateInternalKey(args.internalKey);

    await ctx.db.patch(args.projectId, {
      exportStatus: args.status,
      exportRepoUrl: args.repoUrl,
      updatedAt: Date.now(),
    });

    return args.projectId;
  },
});

export const getProjectFilesWithUrls = query({
  args: {
    internalKey: v.string(),
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    validateInternalKey(args.internalKey);

    const items = await ctx.db
      .query("files")
      .withIndex("by_project", q => q.eq("projectId", args.projectId))
      .collect();

    const sortedItems = items.sort(compareFileItems);

    return await Promise.all(
      sortedItems.map(async file => ({
        ...file,
        storageUrl: file.storageId ? await ctx.storage.getUrl(file.storageId) : null,
      })),
    );
  },
});

export const createProject = mutation({
  args: {
    internalKey: v.string(),
    name: v.string(),
    ownerId: v.string(),
  },
  handler: async (ctx, args) => {
    validateInternalKey(args.internalKey);

    const ownedProjects = await getOwnedProjects(ctx, args.ownerId);
    const projectName = resolveUniqueProjectName(args.name, ownedProjects);

    return await ctx.db.insert("projects", {
      name: projectName,
      ownerId: args.ownerId,
      updatedAt: Date.now(),
      importStatus: "importing",
    });
  },
});

export const getProcessingMessages = query({
  args: {
    internalKey: v.string(),
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    validateInternalKey(args.internalKey);

    return await ctx.db
      .query("messages")
      .withIndex("by_project_and_status", q =>
        q.eq("projectId", args.projectId).eq("status", "processing"),
      )
      .collect();
  },
});

export const getRecentMessages = query({
  args: {
    internalKey: v.string(),
    conversationId: v.id("conversations"),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    validateInternalKey(args.internalKey);

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", q =>
        q.eq("conversationId", args.conversationId),
      )
      .order("asc")
      .collect();

    const limit = Math.max(0, Math.floor(args.limit));
    if (limit <= 0) {
      return [];
    }

    return messages.slice(-limit);
  },
});

export const updateConversationTitle = mutation({
  args: {
    internalKey: v.string(),
    conversationId: v.id("conversations"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    validateInternalKey(args.internalKey);

    const title = args.title.trim();
    if (!title) {
      throw new Error("Title cannot be empty.");
    }

    await ctx.db.patch(args.conversationId, {
      title,
      updatedAt: Date.now(),
    });

    return args.conversationId;
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

    await touchProject(ctx, args.projectId);

    return messageId;
  },
});

export const updateMessageStatus = mutation({
  args: {
    internalKey: v.string(),
    messageId: v.id("messages"),
    status: v.union(
      v.literal("processing"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),
  },
  handler: async (ctx, args) => {
    validateInternalKey(args.internalKey);

    const message = await ctx.db.get(args.messageId);

    if (!message) {
      throw new Error("Message not found.");
    }

    await ctx.db.patch(args.messageId, {
      status: args.status,
    });

    await ctx.db.patch(message.conversationId, {
      updatedAt: Date.now(),
    });

    await touchProject(ctx, message.projectId);

    return args.messageId;
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

    await touchProject(ctx, message.projectId);

    return args.messageId;
  },
});

export const getProjectFiles = query({
  args: {
    internalKey: v.string(),
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    validateInternalKey(args.internalKey);

    const items = await ctx.db
      .query("files")
      .withIndex("by_project", q => q.eq("projectId", args.projectId))
      .collect();

    return items.sort(compareFileItems);
  },
});

export const getFileById = query({
  args: {
    internalKey: v.string(),
    fileId: v.id("files"),
  },
  handler: async (ctx, args) => {
    validateInternalKey(args.internalKey);
    return await ctx.db.get(args.fileId);
  },
});

export const updateFile = mutation({
  args: {
    internalKey: v.string(),
    fileId: v.id("files"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    validateInternalKey(args.internalKey);

    const file = await ctx.db.get(args.fileId);

    if (!file) {
      throw new Error("File not found.");
    }

    if (file.type !== "file") {
      throw new Error("Only files can be updated.");
    }

    if (file.storageId) {
      throw new Error("Binary files cannot be updated as text.");
    }

    await ctx.db.patch(args.fileId, {
      content: args.content,
      updatedAt: Date.now(),
    });

    await touchProject(ctx, file.projectId);

    return args.fileId;
  },
});

export const createFile = mutation({
  args: {
    internalKey: v.string(),
    projectId: v.id("projects"),
    parentId: v.optional(v.id("files")),
    name: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    validateInternalKey(args.internalKey);

    if (args.parentId) {
      const parent = await ctx.db.get(args.parentId);
      if (!parent || parent.projectId !== args.projectId) {
        throw new Error("Parent folder not found.");
      }
      if (parent.type !== "folder") {
        throw new Error("Parent must be a folder.");
      }
    }

    const siblings = await getProjectSiblingItems(
      ctx,
      args.projectId,
      args.parentId,
    );
    const name = ensureUniqueSiblingName(args.name, siblings, "file");

    const fileId = await ctx.db.insert("files", {
      projectId: args.projectId,
      parentId: args.parentId,
      name,
      type: "file",
      content: args.content,
      updatedAt: Date.now(),
    });

    await touchProject(ctx, args.projectId);

    return fileId;
  },
});

export const createFiles = mutation({
  args: {
    internalKey: v.string(),
    projectId: v.id("projects"),
    parentId: v.optional(v.id("files")),
    files: v.array(
      v.object({
        name: v.string(),
        content: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    validateInternalKey(args.internalKey);

    if (args.parentId) {
      const parent = await ctx.db.get(args.parentId);
      if (!parent || parent.projectId !== args.projectId) {
        throw new Error("Parent folder not found.");
      }
      if (parent.type !== "folder") {
        throw new Error("Parent must be a folder.");
      }
    }

    const results: Array<
      | { name: string; fileId: string }
      | { name: string; error: string }
    > = [];
    const createdSiblings = await getProjectSiblingItems(
      ctx,
      args.projectId,
      args.parentId,
    );

    for (const file of args.files) {
      try {
        const name = ensureUniqueSiblingName(
          file.name,
          createdSiblings,
          "file",
        );
        const fileId = await ctx.db.insert("files", {
          projectId: args.projectId,
          parentId: args.parentId,
          name,
          type: "file",
          content: file.content,
          updatedAt: Date.now(),
        });
        createdSiblings.push({
          _id: fileId,
          projectId: args.projectId,
          parentId: args.parentId,
          name,
          type: "file",
          content: file.content,
          updatedAt: Date.now(),
        } as Doc<"files">);
        results.push({ name, fileId });
      } catch (error) {
        results.push({
          name: file.name,
          error: error instanceof Error ? error.message : "Unable to create file.",
        });
      }
    }

    await touchProject(ctx, args.projectId);

    return results;
  },
});

export const createFolder = mutation({
  args: {
    internalKey: v.string(),
    projectId: v.id("projects"),
    parentId: v.optional(v.id("files")),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    validateInternalKey(args.internalKey);

    if (args.parentId) {
      const parent = await ctx.db.get(args.parentId);
      if (!parent || parent.projectId !== args.projectId) {
        throw new Error("Parent folder not found.");
      }
      if (parent.type !== "folder") {
        throw new Error("Parent must be a folder.");
      }
    }

    const siblings = await getProjectSiblingItems(
      ctx,
      args.projectId,
      args.parentId,
    );
    const name = ensureUniqueSiblingName(args.name, siblings, "folder");

    const folderId = await ctx.db.insert("files", {
      projectId: args.projectId,
      parentId: args.parentId,
      name,
      type: "folder",
      updatedAt: Date.now(),
    });

    await touchProject(ctx, args.projectId);

    return folderId;
  },
});

export const renameFile = mutation({
  args: {
    internalKey: v.string(),
    fileId: v.id("files"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    validateInternalKey(args.internalKey);

    const file = await ctx.db.get(args.fileId);
    if (!file) {
      throw new Error("File not found.");
    }

    const siblings = await getProjectSiblingItems(
      ctx,
      file.projectId,
      file.parentId,
    );
    const name = ensureUniqueSiblingName(
      args.name,
      siblings,
      file.type,
      file._id,
    );

    await ctx.db.patch(args.fileId, {
      name,
      updatedAt: Date.now(),
    });

    await touchProject(ctx, file.projectId);

    return args.fileId;
  },
});

export const deleteFile = mutation({
  args: {
    internalKey: v.string(),
    fileId: v.id("files"),
  },
  handler: async (ctx, args) => {
    validateInternalKey(args.internalKey);

    const file = await ctx.db.get(args.fileId);
    if (!file) {
      throw new Error("File not found.");
    }

    await deleteFileTree(ctx, args.fileId);
    await touchProject(ctx, file.projectId);
    return args.fileId;
  },
});

export { validateInternalKey };
