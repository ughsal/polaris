"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRight, FileText, Folder, FolderOpen } from "lucide-react";

import { cn } from "@/lib/utils";

import { FILE_EXPLORER_ROW_HEIGHT, getItemPadding } from "./constants";

interface RenameInputProps {
  type: "file" | "folder";
  level: number;
  defaultValue: string;
  isOpen?: boolean;
  onSubmit: (name: string) => void | Promise<void>;
  onCancel: () => void;
}

function getSelectionEndForFileName(name: string) {
  const extensionIndex = name.lastIndexOf(".");
  if (extensionIndex <= 0) {
    return name.length;
  }

  return extensionIndex;
}

export function RenameInput({
  type,
  level,
  defaultValue,
  isOpen = false,
  onSubmit,
  onCancel,
}: RenameInputProps) {
  const [value, setValue] = useState(defaultValue);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) {
      return;
    }

    if (type === "folder") {
      input.setSelectionRange(0, defaultValue.length);
      return;
    }

    const selectionEnd = getSelectionEndForFileName(defaultValue);
    input.setSelectionRange(0, selectionEnd);
  }, [defaultValue, type]);

  const submit = async () => {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      onCancel();
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(trimmedValue);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="flex items-center gap-2 px-2"
      style={{
        minHeight: FILE_EXPLORER_ROW_HEIGHT,
        paddingLeft: getItemPadding(level, type === "file"),
      }}
    >
      {type === "folder" ? (
        <>
          <ChevronRight
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              isOpen && "rotate-90",
            )}
          />
          {isOpen ? (
            <FolderOpen className="size-4 text-muted-foreground" />
          ) : (
            <Folder className="size-4 text-muted-foreground" />
          )}
        </>
      ) : (
        <FileText className="size-4 text-muted-foreground" />
      )}
      <input
        ref={inputRef}
        value={value}
        onChange={event => setValue(event.target.value)}
        onKeyDown={event => {
          if (event.key === "Enter") {
            event.preventDefault();
            void submit();
          }

          if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
          }
        }}
        onBlur={() => {
          void submit();
        }}
        autoFocus
        disabled={isSubmitting}
        className={cn(
          "h-6 min-w-0 flex-1 rounded-sm border border-border/60 bg-background px-2 text-sm outline-none",
          "focus:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
        )}
      />
    </div>
  );
}
