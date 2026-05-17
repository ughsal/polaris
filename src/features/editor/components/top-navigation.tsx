"use client";

import type { KeyboardEvent } from "react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { FileCode2, FileText, X } from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useFile } from "../../projects/hooks/use-files";
import { useEditor } from "../hooks/use-editor";

interface TopNavigationProps {
  projectId: Id<"projects">;
}

function getTabIcon(fileName: string) {
  return /\.(tsx?|jsx?|json|css|html|mdx?|py)$/i.test(fileName);
}

interface EditorTabProps {
  projectId: Id<"projects">;
  fileId: Id<"files">;
  isFirst: boolean;
  isActive: boolean;
  isPreview: boolean;
  onActivate: () => void;
  onPin: () => void;
  onClose: () => void;
}

function EditorTab({
  projectId,
  fileId,
  isFirst,
  isActive,
  isPreview,
  onActivate,
  onPin,
  onClose,
}: EditorTabProps) {
  const file = useFile(fileId);
  const isCodeFile = file ? getTabIcon(file.name) : false;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onActivate();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      data-project-id={projectId}
      onClick={onActivate}
      onDoubleClick={onPin}
      onKeyDown={handleKeyDown}
      className={cn(
        "group inline-flex h-9 min-w-0 items-center gap-2 border border-transparent px-3 text-sm transition-colors",
        "text-muted-foreground hover:bg-accent/60 hover:text-foreground focus-visible:bg-accent/60 focus-visible:text-foreground",
        isActive &&
          "z-10 border-border/50 border-b-background bg-background text-foreground shadow-[0_1px_0_0_var(--background)]",
        isPreview && "italic",
        isFirst && "ml-2",
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        {file ? (
          isCodeFile ? (
            <FileCode2 className="size-3.5 shrink-0" />
          ) : (
            <FileText className="size-3.5 shrink-0" />
          )
        ) : (
          <Spinner className="size-3.5 shrink-0" />
        )}
        <span className="max-w-40 truncate">{file?.name ?? "Loading..."}</span>
      </span>

      <button
        type="button"
        aria-label={`Close ${file?.name ?? "file"}`}
        onClick={event => {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }}
        onKeyDown={event => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            event.stopPropagation();
            onClose();
          }
        }}
        className="ml-0.5 inline-flex size-5 items-center justify-center rounded-sm text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

export function TopNavigation({ projectId }: TopNavigationProps) {
  const { openTabs, activeTabId, previewTabId, openFile, closeTab, setActiveTab } =
    useEditor(projectId);

  return (
    <div className="border-b border-border/50 bg-muted/20">
      <ScrollArea
        className="w-full"
        scrollbarOrientation="horizontal"
      >
        <div className="flex min-w-max items-end gap-1 px-2 pt-2">
          {openTabs.map((fileId, index) => (
            <EditorTab
              key={fileId}
              projectId={projectId}
              fileId={fileId}
              isFirst={index === 0}
              isActive={activeTabId === fileId}
              isPreview={previewTabId === fileId}
              onActivate={() => setActiveTab(fileId)}
              onPin={() => openFile(fileId, { pinned: true })}
              onClose={() => closeTab(fileId)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
