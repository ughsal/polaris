import { useMutation, useQuery } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

function getNextUpdatedAt(...values: number[]) {
  return Math.max(0, ...values) + 1;
}

export const useFolderContents = (
  projectId: Id<"projects">,
  parentId?: Id<"files">,
  options?: { skip?: boolean },
) => {
  return useQuery(
    api.files.getFolderContents,
    options?.skip ? "skip" : { projectId, parentId },
  );
};

export const useFiles = (projectId: Id<"projects"> | null) => {
  return useQuery(api.files.getFiles, projectId ? { projectId } : "skip");
};

export const useFile = (fileId: Id<"files"> | null) => {
  return useQuery(api.files.getFile, fileId ? { id: fileId } : "skip");
};

export const useFilePath = (fileId: Id<"files"> | null) => {
  return useQuery(api.files.getFilePath, fileId ? { id: fileId } : "skip");
};

export const useCreateFile = () => {
  return useMutation(api.files.createFile);
};

export const useCreateFolder = () => {
  return useMutation(api.files.createFolder);
};

export const useRenameFile = () => {
  return useMutation(api.files.renameFile);
};

export const useDeleteFile = () => {
  return useMutation(api.files.deleteFile);
};

export const useUpdateFile = () => {
  return useMutation(api.files.updateFile).withOptimisticUpdate(
    (localStore, args) => {
      const existingFile = localStore.getQuery(api.files.getFile, {
        id: args.id,
      });

      if (!existingFile || existingFile.type !== "file") {
        return;
      }

      const project = localStore.getQuery(api.projects.getById, {
        id: existingFile.projectId,
      });
      const projects = localStore.getQuery(api.projects.get, {});
      const partialProjects = localStore.getQuery(api.projects.getPartial, {
        limit: 6,
      });
      const now = getNextUpdatedAt(
        existingFile.updatedAt,
        project?.updatedAt ?? 0,
        ...(projects?.map(item => item.updatedAt) ?? []),
        ...(partialProjects?.map(item => item.updatedAt) ?? []),
      );
      const updatedFile = {
        ...existingFile,
        content: args.content,
        updatedAt: now,
      };

      localStore.setQuery(api.files.getFile, { id: args.id }, updatedFile);

      if (project !== undefined) {
        localStore.setQuery(api.projects.getById, { id: existingFile.projectId }, {
          ...project,
          updatedAt: now,
        });
      }

      if (projects !== undefined) {
        localStore.setQuery(
          api.projects.get,
          {},
          projects.map(item =>
            item._id === existingFile.projectId
              ? {
                  ...item,
                  updatedAt: now,
                }
              : item,
          ),
        );
      }

      if (partialProjects !== undefined) {
        const updatedProjects = partialProjects.map(item =>
          item._id === existingFile.projectId
            ? {
                ...item,
                updatedAt: now,
              }
            : item,
        );

        localStore.setQuery(
          api.projects.getPartial,
          { limit: 6 },
          [...updatedProjects].sort((a, b) => b.updatedAt - a.updatedAt),
        );
      }
    },
  );
};
