"use client";

import type { KeyboardEvent, ReactNode } from "react";
import type { Doc } from "../../../../../convex/_generated/dataModel";
import { FilePlus2, FolderPlus, Pencil, Trash2 } from "lucide-react";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";

import { FILE_EXPLORER_ROW_HEIGHT, getItemPadding } from "./constants";

interface TreeItemWrapperProps {
  item: Doc<"files">;
  level: number;
  isActive?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  onCreateFile?: () => void;
  onCreateFolder?: () => void;
  children: ReactNode;
}

export function TreeItemWrapper({
  item,
  level,
  isActive = false,
  onClick,
  onDoubleClick,
  onRename,
  onDelete,
  onCreateFile,
  onCreateFolder,
  children,
}: TreeItemWrapperProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onClick?.();
    }

    if (event.key === "F2") {
      event.preventDefault();
      onRename?.();
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          onClick={onClick}
          onDoubleClick={onDoubleClick}
          onKeyDown={handleKeyDown}
          className={cn(
            "group flex cursor-default items-center gap-2 px-2 text-sm outline-none transition-colors",
            "hover:bg-accent/60 focus-visible:bg-accent/60",
            isActive && "bg-accent text-accent-foreground",
          )}
          style={{
            minHeight: FILE_EXPLORER_ROW_HEIGHT,
            paddingLeft: getItemPadding(level, item.type === "file"),
          }}
        >
          {children}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        {item.type === "folder" ? (
          <>
            <ContextMenuItem onSelect={onCreateFile}>
              <FilePlus2 />
              New File
            </ContextMenuItem>
            <ContextMenuItem onSelect={onCreateFolder}>
              <FolderPlus />
              New Folder
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        ) : null}
        <ContextMenuItem onSelect={onRename}>
          <Pencil />
          Rename
        </ContextMenuItem>
        <ContextMenuItem variant="destructive" onSelect={onDelete}>
          <Trash2 />
          Delete Permanently
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
