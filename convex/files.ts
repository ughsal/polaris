import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { verifyAuth } from "./auth";

function normalizeItemName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function compareFileItems(a: Doc<"files">, b: Doc<"files">) {
  if (a.type !== b.type) {
    return a.type === "folder" ? -1 : 1;
  }

  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

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

async function assertFileAccess(
  ctx: QueryCtx | MutationCtx,
  fileId: Id<"files">,
) {
  const file = await ctx.db.get(fileId);

  if (!file) {
    throw new Error("File not found.");
  }

  await assertProjectAccess(ctx, file.projectId);

  return file;
}

async function getSiblingItems(
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
  excludeId?: Id<"files">,
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

async function touchProject(
  ctx: MutationCtx,
  projectId: Id<"projects">,
) {
  await ctx.db.patch(projectId, {
    updatedAt: Date.now(),
  });
}

async function deleteFileTree(
  ctx: MutationCtx,
  fileId: Id<"files">,
) {
  const children = await ctx.db
    .query("files")
    .withIndex("by_parent", q => q.eq("parentId", fileId))
    .collect();

  for (const child of children) {
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

export const getFiles = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    await assertProjectAccess(ctx, args.projectId);

    return await ctx.db
      .query("files")
      .withIndex("by_project", q => q.eq("projectId", args.projectId))
      .collect();
  },
});

export const getFile = query({
  args: {
    id: v.id("files"),
  },
  handler: async (ctx, args) => {
    return await assertFileAccess(ctx, args.id);
  },
});

export const getFolderContents = query({
  args: {
    projectId: v.id("projects"),
    parentId: v.optional(v.id("files")),
  },
  handler: async (ctx, args) => {
    await assertProjectAccess(ctx, args.projectId);
    await assertParentFolder(ctx, args.projectId, args.parentId);

    const items = await ctx.db
      .query("files")
      .withIndex("by_project_and_parent", q =>
        q.eq("projectId", args.projectId).eq("parentId", args.parentId),
      )
      .collect();

    return items.sort(compareFileItems);
  },
});

export const createFile = mutation({
  args: {
    projectId: v.id("projects"),
    parentId: v.optional(v.id("files")),
    name: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    await assertProjectAccess(ctx, args.projectId);
    await assertParentFolder(ctx, args.projectId, args.parentId);

    const siblings = await getSiblingItems(ctx, args.projectId, args.parentId);
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

export const createFolder = mutation({
  args: {
    projectId: v.id("projects"),
    parentId: v.optional(v.id("files")),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await assertProjectAccess(ctx, args.projectId);
    await assertParentFolder(ctx, args.projectId, args.parentId);

    const siblings = await getSiblingItems(ctx, args.projectId, args.parentId);
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
    id: v.id("files"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const file = await assertFileAccess(ctx, args.id);
    const siblings = await getSiblingItems(ctx, file.projectId, file.parentId);
    const name = ensureUniqueSiblingName(
      args.name,
      siblings,
      file.type,
      file._id,
    );

    await ctx.db.patch(args.id, {
      name,
      updatedAt: Date.now(),
    });

    await touchProject(ctx, file.projectId);
  },
});

export const deleteFile = mutation({
  args: {
    id: v.id("files"),
  },
  handler: async (ctx, args) => {
    const file = await assertFileAccess(ctx, args.id);

    await deleteFileTree(ctx, args.id);
    await touchProject(ctx, file.projectId);
  },
});

export const updateFile = mutation({
  args: {
    id: v.id("files"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const file = await assertFileAccess(ctx, args.id);

    if (file.type !== "file") {
      throw new Error("Only files can be updated.");
    }

    await ctx.db.patch(args.id, {
      content: args.content,
      updatedAt: Date.now(),
    });

    await touchProject(ctx, file.projectId);
  },
});
