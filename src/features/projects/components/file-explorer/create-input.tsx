"use client";

import { useState } from "react";
import { FileText, Folder } from "lucide-react";

import { cn } from "@/lib/utils";

import { FILE_EXPLORER_ROW_HEIGHT, getItemPadding } from "./constants";

interface CreateInputProps {
  type: "file" | "folder";
  level: number;
  onSubmit: (name: string) => void | Promise<void>;
  onCancel: () => void;
}

export function CreateInput({
  type,
  level,
  onSubmit,
  onCancel,
}: CreateInputProps) {
  const [value, setValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      {type === "file" ? (
        <FileText className="size-4 text-muted-foreground" />
      ) : (
        <Folder className="size-4 text-muted-foreground" />
      )}
      <input
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
        placeholder={type === "file" ? "new-file.tsx" : "new-folder"}
      />
    </div>
  );
}
