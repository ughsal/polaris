import { useMutation, useQuery } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

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
  return useMutation(api.files.updateFile);
};
