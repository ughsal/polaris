"use client";

import { useState } from "react";
import type { Id } from "../../../../../convex/_generated/dataModel";
import {
  ChevronRight,
  FilePlus2,
  Folder,
  FolderOpen,
  FolderPlus,
  RotateCcw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

import {
  useCreateFile,
  useCreateFolder,
  useFolderContents,
} from "../../hooks/use-files";
import { useProject } from "../../hooks/use-projects";
import { CreateInput } from "./create-input";
import { FILE_EXPLORER_ROW_HEIGHT } from "./constants";
import { LoadingRow } from "./loading-row";
import { Tree } from "./tree";

interface FileExplorerProps {
  projectId: Id<"projects">;
}

export function FileExplorer({ projectId }: FileExplorerProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [creating, setCreating] = useState<"file" | "folder" | null>(null);
  const [collapseKey, setCollapseKey] = useState(0);
  const project = useProject(projectId);
  const createFile = useCreateFile();
  const createFolder = useCreateFolder();
  const rootItems = useFolderContents(projectId, undefined, {
    skip: !isOpen,
  });

  const handleCollapseTree = () => {
    setCreating(null);
    setIsOpen(true);
    setCollapseKey(current => current + 1);
  };

  const handleCreateFile = async (name: string) => {
    await createFile({
      projectId,
      name,
      content: "",
    });
    setCreating(null);
    setIsOpen(true);
  };

  const handleCreateFolder = async (name: string) => {
    await createFolder({
      projectId,
      name,
    });
    setCreating(null);
    setIsOpen(true);
  };

  return (
    <section className="flex h-full min-h-0 flex-col border-r border-border/50 bg-muted/20">
      <div className="border-b border-border/50 px-3 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          File Explorer
        </p>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="py-2">
          <div
            className="group flex items-center gap-2 px-2 text-sm transition-colors hover:bg-accent/60"
            style={{ minHeight: FILE_EXPLORER_ROW_HEIGHT }}
          >
            <button
              type="button"
              onClick={() => setIsOpen(current => !current)}
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
            >
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
              <span className="truncate font-medium">
                {project?.name ?? "Project files"}
              </span>
            </button>

            <div className="hidden items-center gap-1 group-hover:flex">
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setCreating("file");
                  setIsOpen(true);
                }}
                aria-label="Create root file"
              >
                <FilePlus2 className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setCreating("folder");
                  setIsOpen(true);
                }}
                aria-label="Create root folder"
              >
                <FolderPlus className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground hover:text-foreground"
                onClick={handleCollapseTree}
                aria-label="Collapse tree"
              >
                <RotateCcw className="size-3.5" />
              </Button>
            </div>
          </div>

          {isOpen ? (
            <div>
              {creating === "file" ? (
                <CreateInput
                  type="file"
                  level={1}
                  onSubmit={handleCreateFile}
                  onCancel={() => setCreating(null)}
                />
              ) : null}

              {creating === "folder" ? (
                <CreateInput
                  type="folder"
                  level={1}
                  onSubmit={handleCreateFolder}
                  onCancel={() => setCreating(null)}
                />
              ) : null}

              {rootItems === undefined ? (
                <LoadingRow level={1} />
              ) : (
                rootItems.map(item => (
                  <Tree
                    key={`${collapseKey}-${item._id}`}
                    item={item}
                    level={1}
                    projectId={projectId}
                  />
                ))
              )}
            </div>
          ) : null}
        </div>
      </ScrollArea>
    </section>
  );
}
