"use client";

import { useState } from "react";
import type { Doc, Id } from "../../../../../convex/_generated/dataModel";
import {
  ChevronRight,
  FileCode2,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  Loader2,
  Pencil,
  Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  useCreateFile,
  useCreateFolder,
  useDeleteFile,
  useFolderContents,
  useRenameFile,
} from "../../hooks/use-files";
import { CreateInput } from "./create-input";
import { LoadingRow } from "./loading-row";
import { RenameInput } from "./rename-input";
import { TreeItemWrapper } from "./tree-item-wrapper";

interface TreeProps {
  item: Doc<"files">;
  level?: number;
  projectId: Id<"projects">;
}

function isCodeLikeFile(name: string) {
  return /\.(tsx?|jsx?|json|css|html|md|py|yml|yaml|sql)$/i.test(name);
}

function getFileIcon(name: string) {
  return isCodeLikeFile(name) ? FileCode2 : FileText;
}

export function Tree({ item, level = 1, projectId }: TreeProps) {
  const isFolder = item.type === "folder";
  const [isOpen, setIsOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [creating, setCreating] = useState<"file" | "folder" | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const createFile = useCreateFile();
  const createFolder = useCreateFolder();
  const renameFile = useRenameFile();
  const deleteFile = useDeleteFile();
  const contents = useFolderContents(projectId, isFolder ? item._id : undefined, {
    skip: !isFolder || !isOpen,
  });

  const handleRename = async (name: string) => {
    const trimmedName = name.trim();

    if (!trimmedName || trimmedName === item.name) {
      setIsRenaming(false);
      return;
    }

    await renameFile({ id: item._id, name: trimmedName });
    setIsRenaming(false);
  };

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      await deleteFile({ id: item._id });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateFile = async (name: string) => {
    await createFile({
      projectId,
      parentId: item._id,
      name,
      content: "",
    });
    setCreating(null);
    setIsOpen(true);
  };

  const handleCreateFolder = async (name: string) => {
    await createFolder({
      projectId,
      parentId: item._id,
      name,
    });
    setCreating(null);
    setIsOpen(true);
  };

  const FileIcon = getFileIcon(item.name);

  return (
    <div>
      {isRenaming ? (
        <RenameInput
          type={item.type}
          level={level}
          defaultValue={item.name}
          isOpen={isOpen}
          onSubmit={handleRename}
          onCancel={() => setIsRenaming(false)}
        />
      ) : (
        <TreeItemWrapper
          item={item}
          level={level}
          onClick={() => {
            if (isFolder) {
              setIsOpen(current => !current);
              return;
            }

            // TODO: Wire file selection in Sprint 11: Code Editor State.
          }}
          onDoubleClick={() => {
            if (!isFolder) {
              // TODO: Wire persistent/open tab behavior in Sprint 11.
            }
          }}
          onRename={() => setIsRenaming(true)}
          onDelete={() => {
            void handleDelete();
          }}
          onCreateFile={
            isFolder
              ? () => {
                  setCreating("file");
                  setIsOpen(true);
                }
              : undefined
          }
          onCreateFolder={
            isFolder
              ? () => {
                  setCreating("folder");
                  setIsOpen(true);
                }
              : undefined
          }
        >
          {isFolder ? (
            <>
              <ChevronRight
                className={cn(
                  "size-4 shrink-0 text-muted-foreground transition-transform",
                  isOpen && "rotate-90",
                )}
              />
              {isOpen ? (
                <FolderOpen className="size-4 shrink-0 text-sky-400" />
              ) : (
                <Folder className="size-4 shrink-0 text-sky-400" />
              )}
            </>
          ) : (
            <FileIcon className="size-4 shrink-0 text-muted-foreground" />
          )}

          <span className="min-w-0 flex-1 truncate">{item.name}</span>

          {isDeleting ? (
            <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
          ) : null}

          {isFolder ? (
            <div className="hidden items-center gap-1 group-hover:flex">
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground hover:text-foreground"
                onClick={event => {
                  event.stopPropagation();
                  setCreating("file");
                  setIsOpen(true);
                }}
                aria-label="Create file"
              >
                <Plus className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground hover:text-foreground"
                onClick={event => {
                  event.stopPropagation();
                  setCreating("folder");
                  setIsOpen(true);
                }}
                aria-label="Create folder"
              >
                <FolderPlus className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground hover:text-foreground"
                onClick={event => {
                  event.stopPropagation();
                  setIsRenaming(true);
                }}
                aria-label="Rename item"
              >
                <Pencil className="size-3.5" />
              </Button>
            </div>
          ) : null}
        </TreeItemWrapper>
      )}

      {isFolder && isOpen ? (
        <div>
          {creating === "file" ? (
            <CreateInput
              type="file"
              level={level + 1}
              onSubmit={handleCreateFile}
              onCancel={() => setCreating(null)}
            />
          ) : null}

          {creating === "folder" ? (
            <CreateInput
              type="folder"
              level={level + 1}
              onSubmit={handleCreateFolder}
              onCancel={() => setCreating(null)}
            />
          ) : null}

          {contents === undefined ? (
            <LoadingRow level={level + 1} />
          ) : (
            contents.map(child => (
              <Tree
                key={child._id}
                item={child}
                level={level + 1}
                projectId={projectId}
              />
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
