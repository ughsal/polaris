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
        // eslint-disable-next-line react-hooks/exhaustive-deps
        const now = Date.now();

        const newProject: Doc<"projects"> = {
          _id: crypto.randomUUID() as Id<"projects">,
          _creationTime: now,
          name: args.name,
          ownerId: userId ?? "anonymous",
          updatedAt: now,
        };

        localStore.setQuery(api.projects.get, {}, [
          newProject,
          ...existingProjects,
        ]);
      }
    },
  );
};
