// convex/projects.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { verifyAuth } from "./auth";

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
  excludeProjectId?: string,
) {
  const baseName = normalizeProjectName(desiredName);

  if (!baseName) {
    throw new Error("Project name cannot be empty.");
  }

  const takenNames = new Set(
    existingProjects
      .filter(project => project._id !== excludeProjectId)
      .map(project => project.name),
  );

  if (!takenNames.has(baseName)) {
    return baseName;
  }

  let candidate = `${baseName}-${makeProjectSuffix()}`;
  while (takenNames.has(candidate)) {
    candidate = `${baseName}-${makeProjectSuffix()}`;
  }

  return candidate;
}

async function getOwnedProjects(ctx: Parameters<typeof verifyAuth>[0], ownerId: string) {
  return await ctx.db
    .query("projects")
    .withIndex("by_owner", q => q.eq("ownerId", ownerId))
    .collect();
}

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
    const ownedProjects = await getOwnedProjects(ctx, identity.subject);
    const projectName = resolveUniqueProjectName(args.name, ownedProjects);

    const projectId = await ctx.db.insert("projects", {
      name: projectName,
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
 * Sorted by last updated descending. Used for the dashboard's "recent projects" list.
 */
export const getPartial = query({
  args: {
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    return await ctx.db
      .query("projects")
      .withIndex("by_owner_updated", q => q.eq("ownerId", identity.subject))
      .order("desc")
      .take(args.limit);
  },
});

export const getById = query({
  args: {
    id: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);
    const project = await ctx.db.get(args.id);

    if (!project) {
      throw new Error("Project not found.");
    }

    if (project.ownerId !== identity.subject) {
      throw new Error("Unauthorized: you do not have access to this project.");
    }

    return project;
  },
});

export const rename = mutation({
  args: {
    id: v.id("projects"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);
    const project = await ctx.db.get(args.id);
    const ownedProjects = await getOwnedProjects(ctx, identity.subject);

    if (!project) {
      throw new Error("Project not found.");
    }

    if (project.ownerId !== identity.subject) {
      throw new Error("Unauthorized: you do not have access to this project.");
    }

    const projectName = resolveUniqueProjectName(
      args.name,
      ownedProjects,
      args.id,
    );

    await ctx.db.patch(args.id, {
      name: projectName,
      updatedAt: Date.now(),
    });
  },
});

export const updateSettings = mutation({
  args: {
    id: v.id("projects"),
    settings: v.optional(
      v.object({
        installCommand: v.optional(v.string()),
        devCommand: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);
    const project = await ctx.db.get(args.id);

    if (!project) {
      throw new Error("Project not found.");
    }

    if (project.ownerId !== identity.subject) {
      throw new Error("Unauthorized: you do not have access to this project.");
    }

    await ctx.db.patch(args.id, {
      settings: args.settings,
      updatedAt: Date.now(),
    });
  },
});

export const deleteProject = mutation({
  args: {
    id: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);
    const project = await ctx.db.get(args.id);

    if (!project) {
      throw new Error("Project not found.");
    }

    if (project.ownerId !== identity.subject) {
      throw new Error("Unauthorized: you do not have access to this project.");
    }

    await ctx.db.delete(args.id);
  },
});
