"use client";

import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

import { FILE_EXPLORER_ROW_HEIGHT, getItemPadding } from "./constants";

interface LoadingRowProps {
  level?: number;
  className?: string;
}

export function LoadingRow({
  level = 0,
  className,
}: LoadingRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2 text-sm text-muted-foreground",
        className,
      )}
      style={{
        minHeight: FILE_EXPLORER_ROW_HEIGHT,
        paddingLeft: getItemPadding(level, true),
      }}
    >
      <Spinner className="size-3.5" />
      <span>Loading...</span>
    </div>
  );
}
