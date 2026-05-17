"use client";

import { useEffect, useRef } from "react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { FileCode2, FileX2 } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { useFile, useUpdateFile } from "../../projects/hooks/use-files";
import { useEditor } from "../hooks/use-editor";
import { CodeEditor } from "./code-editor";
import { FileBreadcrumbs } from "./file-breadcrumbs";
import { TopNavigation } from "./top-navigation";

interface EditorViewProps {
  projectId: Id<"projects">;
}

function EmptyState() {
  return (
    <div className="flex h-full min-h-0 items-center justify-center px-6">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <div className="flex size-20 items-center justify-center rounded-2xl border border-border/60 bg-background/80 text-muted-foreground shadow-sm">
          <FileCode2 className="size-10 opacity-50" />
        </div>
        <div className="space-y-1">
          <p className="text-base font-semibold text-foreground">Polaris editor</p>
          <p className="text-sm text-muted-foreground">
            Select a file in the explorer to start editing.
          </p>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex h-full min-h-0 items-center justify-center px-6">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Spinner className="size-4" />
        <span>Loading file...</span>
      </div>
    </div>
  );
}

function BinaryPlaceholder() {
  return (
    <div className="flex h-full min-h-0 items-center justify-center px-6">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <div className="flex size-20 items-center justify-center rounded-2xl border border-border/60 bg-background/80 text-muted-foreground shadow-sm">
          <FileX2 className="size-10 opacity-50" />
        </div>
        <div className="space-y-1">
          <p className="text-base font-semibold text-foreground">
            This file can&apos;t be shown as text
          </p>
          <p className="text-sm text-muted-foreground">
            Binary or storage-backed files are not editable in the text editor.
          </p>
        </div>
      </div>
    </div>
  );
}

export function EditorView({ projectId }: EditorViewProps) {
  const { activeTabId } = useEditor(projectId);
  const activeFile = useFile(activeTabId);
  const updateFile = useUpdateFile();
  const saveTimeoutRef = useRef<number | null>(null);
  const activeFileIdRef = useRef<Id<"files"> | null>(null);

  useEffect(() => {
    activeFileIdRef.current = activeFile?._id ?? null;

    if (saveTimeoutRef.current !== null) {
      window.clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    return () => {
      if (saveTimeoutRef.current !== null) {
        window.clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [activeFile?._id]);

  const handleChange = (content: string) => {
    if (!activeFile || activeFile.type !== "file" || activeFile.storageId) {
      return;
    }

    if (saveTimeoutRef.current !== null) {
      window.clearTimeout(saveTimeoutRef.current);
    }

    const fileId = activeFile._id;
    saveTimeoutRef.current = window.setTimeout(() => {
      if (activeFileIdRef.current !== fileId) {
        return;
      }

      void updateFile({
        id: fileId,
        content,
      });
    }, 750);
  };

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <TopNavigation projectId={projectId} />

      {activeTabId ? <FileBreadcrumbs projectId={projectId} /> : null}

      <div className="min-h-0 flex-1 overflow-hidden">
        {activeTabId ? (
          activeFile === undefined ? (
            <LoadingState />
          ) : activeFile.storageId ? (
            <BinaryPlaceholder />
          ) : activeFile.type === "file" ? (
            <div className="h-full min-h-0 p-3">
              <div className="h-full min-h-0 overflow-hidden rounded-lg border border-border/60 bg-background">
                <CodeEditor
                  key={`${activeFile._id}:${activeFile.name}`}
                  fileName={activeFile.name}
                  initialValue={activeFile.content ?? ""}
                  onChange={handleChange}
                />
              </div>
            </div>
          ) : (
            <BinaryPlaceholder />
          )
        ) : (
          <EmptyState />
        )}
      </div>
    </section>
  );
}
