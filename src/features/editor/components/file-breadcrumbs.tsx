"use client";

import { Fragment } from "react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { FileCode2, Folder } from "lucide-react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";
import { useFilePath } from "../../projects/hooks/use-files";
import { useEditor } from "../hooks/use-editor";

interface FileBreadcrumbsProps {
  projectId: Id<"projects">;
}

function getBreadcrumbIcon(isLast: boolean) {
  if (isLast) {
    return FileCode2;
  }

  return Folder;
}

export function FileBreadcrumbs({ projectId }: FileBreadcrumbsProps) {
  const { activeTabId } = useEditor(projectId);
  const path = useFilePath(activeTabId);

  if (!activeTabId) {
    return null;
  }

  if (path === undefined) {
    return (
      <div className="border-b border-border/50 px-4 py-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-3.5 w-16 animate-pulse rounded bg-muted" />
          <div className="h-3.5 w-3 animate-pulse rounded bg-muted/80" />
          <div className="h-3.5 w-24 animate-pulse rounded bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-border/50 px-4 py-2">
      <Breadcrumb>
        <BreadcrumbList className="flex-nowrap">
          {path.map((item, index) => {
            const isLast = index === path.length - 1;
            const Icon = getBreadcrumbIcon(isLast);

            return (
              <Fragment key={item._id}>
                {index > 0 ? <BreadcrumbSeparator /> : null}
                <BreadcrumbItem className={cn("min-w-0", isLast && "font-medium")}>
                  {isLast ? (
                    <BreadcrumbPage className="flex min-w-0 items-center gap-1.5 truncate">
                      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{item.name}</span>
                    </BreadcrumbPage>
                  ) : (
                    <span className="flex min-w-0 items-center gap-1.5 truncate text-muted-foreground">
                      <Icon className="size-3.5 shrink-0" />
                      <span className="truncate">{item.name}</span>
                    </span>
                  )}
                </BreadcrumbItem>
              </Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
