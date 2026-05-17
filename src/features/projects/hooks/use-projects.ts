// src/features/projects/hooks/use-projects.ts
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@clerk/nextjs";
import { Id, Doc } from "../../../../convex/_generated/dataModel";
import { resolveUniqueProjectName } from "@/lib/project-name";

function sortProjectsByUpdatedAt(projects: Doc<"projects">[]) {
  return [...projects].sort((a, b) => b.updatedAt - a.updatedAt);
}

function getNextUpdatedAt(...values: number[]) {
  return Math.max(0, ...values) + 1;
}

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
export const useProject = (
  projectId: Id<"projects">,
  options?: { skip?: boolean },
) => {
  return useQuery(
    api.projects.getById,
    options?.skip ? "skip" : { id: projectId },
  );
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
        const uniqueName = resolveUniqueProjectName(
          args.name,
          existingProjects.map(project => project.name),
        );
        const optimisticTimestamp = getNextUpdatedAt(
          ...existingProjects.map(project => project.updatedAt),
        );
        const optimisticCreationTime =
          Math.max(0, ...existingProjects.map(project => project._creationTime)) + 1;

        const newProject: Doc<"projects"> = {
          _id: crypto.randomUUID() as Id<"projects">,
          _creationTime: optimisticCreationTime,
          name: uniqueName || args.name,
          ownerId: userId ?? "anonymous",
          updatedAt: optimisticTimestamp,
        };

        localStore.setQuery(api.projects.get, {}, [
          newProject,
          ...existingProjects,
        ]);
        localStore.setQuery(api.projects.getPartial, { limit: 6 }, [
          newProject,
          ...sortProjectsByUpdatedAt(existingProjects).slice(0, 5),
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

      const uniqueName = resolveUniqueProjectName(
        trimmedName,
        allProjects
          ? allProjects
              .filter(project => project._id !== args.id)
              .map(project => project.name)
          : existingProject
            ? [existingProject.name]
            : [],
      );

      const nextUpdatedAt = getNextUpdatedAt(
        existingProject?.updatedAt ?? 0,
        ...(allProjects?.map(project => project.updatedAt) ?? []),
        ...(partialProjects?.map(project => project.updatedAt) ?? []),
      );

      if (existingProject !== undefined) {
        localStore.setQuery(
          api.projects.getById,
          { id: args.id },
          {
            ...existingProject,
            name: uniqueName || trimmedName,
            updatedAt: nextUpdatedAt,
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
                  name: uniqueName || trimmedName,
                  updatedAt: nextUpdatedAt,
                }
              : project,
          ),
        );
      }

      if (partialProjects !== undefined) {
        localStore.setQuery(
          api.projects.getPartial,
          { limit: 6 },
          sortProjectsByUpdatedAt(
            partialProjects.map(project =>
              project._id === args.id
                ? {
                    ...project,
                    name: uniqueName || trimmedName,
                    updatedAt: nextUpdatedAt,
                  }
                : project,
            ),
          ).slice(0, 6),
        );
      }
    },
  );
};

/**
 * Deletes a project and keeps the cached project lists in sync.
 */
export const useDeleteProject = () => {
  return useMutation(api.projects.deleteProject).withOptimisticUpdate(
    (localStore, args) => {
      const existingProjects = localStore.getQuery(api.projects.get, {});
      const partialProjects = localStore.getQuery(api.projects.getPartial, {
        limit: 6,
      });

      if (existingProjects !== undefined) {
        localStore.setQuery(
          api.projects.get,
          {},
          existingProjects.filter(project => project._id !== args.id),
        );
      }

      if (partialProjects !== undefined) {
        localStore.setQuery(
          api.projects.getPartial,
          { limit: 6 },
          partialProjects.filter(project => project._id !== args.id),
        );
      }

      localStore.setQuery(api.projects.getById, { id: args.id }, undefined);
    },
  );
};
