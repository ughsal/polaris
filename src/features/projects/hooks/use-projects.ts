// src/features/projects/hooks/use-projects.ts
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@clerk/nextjs";
import { Id, Doc } from "../../../../convex/_generated/dataModel";

/**
 * Returns ALL projects for the current user.
 */
export const useProjects = () => {
  return useQuery(api.projects.get);
};

/**
 * Returns a limited slice of projects for the current user.
 * Pass the number of projects you want back.
 */
export const useProjectsPartial = (limit: number) => {
  return useQuery(api.projects.getPartial, { limit });
};

/**
 * Returns a single project for the current user.
 */
export const useProject = (projectId: Id<"projects">) => {
  return useQuery(api.projects.getById, { id: projectId });
};

/**
 * Returns a mutation that creates a new project.
 * Includes an optimistic update so the project appears in the list
 * immediately before Convex confirms — this is what makes creation feel instant.
 */
export const useCreateProject = () => {
  const { userId } = useAuth();

  return useMutation(api.projects.create).withOptimisticUpdate(
    (localStore, args) => {
      const existingProjects = localStore.getQuery(api.projects.get, {});

      if (existingProjects !== undefined) {
        const optimisticTimestamp = existingProjects[0]?.updatedAt ?? 0;
        const optimisticCreationTime = existingProjects[0]?._creationTime ?? 0;

        const newProject: Doc<"projects"> = {
          _id: crypto.randomUUID() as Id<"projects">,
          _creationTime: optimisticCreationTime,
          name: args.name,
          ownerId: userId ?? "anonymous",
          updatedAt: optimisticTimestamp,
        };

        localStore.setQuery(api.projects.get, {}, [
          newProject,
          ...existingProjects,
        ]);
      }
    },
  );
};

/**
 * Renames a project and keeps the project header responsive via optimistic updates.
 */
export const useRenameProject = () => {
  return useMutation(api.projects.rename).withOptimisticUpdate(
    (localStore, args) => {
      const trimmedName = args.name.trim();
      const existingProject = localStore.getQuery(api.projects.getById, {
        id: args.id,
      });
      const allProjects = localStore.getQuery(api.projects.get, {});
      const partialProjects = localStore.getQuery(api.projects.getPartial, {
        limit: 6,
      });

      if (!trimmedName) {
        return;
      }

      if (existingProject !== undefined) {
        localStore.setQuery(
          api.projects.getById,
          { id: args.id },
          {
            ...existingProject,
            name: trimmedName,
          },
        );
      }

      if (allProjects !== undefined) {
        localStore.setQuery(
          api.projects.get,
          {},
          allProjects.map(project =>
            project._id === args.id
              ? {
                  ...project,
                  name: trimmedName,
                }
              : project,
          ),
        );
      }

      if (partialProjects !== undefined) {
        localStore.setQuery(
          api.projects.getPartial,
          { limit: 6 },
          partialProjects.map(project =>
            project._id === args.id
              ? {
                  ...project,
                  name: trimmedName,
                }
              : project,
          ),
        );
      }
    },
  );
};
