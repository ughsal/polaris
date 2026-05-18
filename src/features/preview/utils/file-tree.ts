import type { FileSystemTree } from "@webcontainer/api";

import type { Doc, Id } from "../../../../convex/_generated/dataModel";

function normalizeSegments(segments: string[]) {
  return segments.filter(segment => segment.trim().length > 0);
}

export function getFilePath(
  file: Doc<"files">,
  filesMap: Map<Id<"files">, Doc<"files">>,
) {
  const segments = [file.name];
  const visited = new Set<string>([file._id]);
  let currentParentId = file.parentId;

  while (currentParentId) {
    const parent = filesMap.get(currentParentId);

    if (!parent || visited.has(parent._id)) {
      break;
    }

    segments.unshift(parent.name);
    visited.add(parent._id);
    currentParentId = parent.parentId;
  }

  return normalizeSegments(segments).join("/");
}

function ensureDirectoryNode(tree: Record<string, unknown>, name: string) {
  const existing = tree[name] as { directory?: Record<string, unknown> } | undefined;

  if (existing?.directory) {
    return existing.directory;
  }

  const directory: Record<string, unknown> = {};
  tree[name] = {
    directory,
  };

  return directory;
}

function sortFiles(files: Doc<"files">[]) {
  return [...files].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "folder" ? -1 : 1;
    }

    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

export function buildFileTree(files: Doc<"files">[]): FileSystemTree {
  const filesMap = new Map(files.map(file => [file._id, file] as const));
  const tree: Record<string, unknown> = {};

  for (const file of sortFiles(files)) {
    if (file.storageId) {
      continue;
    }

    const path = getFilePath(file, filesMap);
    const segments = normalizeSegments(path.split("/"));

    if (!segments.length) {
      continue;
    }

    let currentTree = tree;

    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index];
      const isLast = index === segments.length - 1;

      if (isLast) {
        if (file.type === "folder") {
          currentTree[segment] = {
            directory: {},
          };
        } else {
          currentTree[segment] = {
            file: {
              contents: file.content ?? "",
            },
          };
        }
        continue;
      }

      currentTree = ensureDirectoryNode(currentTree, segment);
    }
  }

  return tree as FileSystemTree;
}
