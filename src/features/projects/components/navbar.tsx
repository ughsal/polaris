"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, CloudCheck, Loader2 } from "lucide-react";
import type { Id } from "../../../../convex/_generated/dataModel";

import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { useProject, useRenameProject } from "../hooks/use-projects";

interface NavbarProps {
  projectId: Id<"projects">;
}

export function Navbar({ projectId }: NavbarProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftName, setDraftName] = useState("");
  const project = useProject(projectId);
  const renameProject = useRenameProject();
  const inputRef = useRef<HTMLInputElement>(null);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    if (project && !isRenaming) {
      setDraftName(project.name);
    }
  }, [isRenaming, project]);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const saveLabel =
    project?.importStatus === "importing"
      ? "Importing"
      : project?.updatedAt
        ? `Saved ${formatDistanceToNow(new Date(project.updatedAt), {
            addSuffix: true,
          })}`
        : "Saved recently";

  const handleCancelRename = () => {
    setDraftName(project?.name ?? "");
    setIsRenaming(false);
  };

  const handleSubmitRename = async () => {
    if (!project || isSubmittingRef.current) {
      setIsRenaming(false);
      return;
    }

    const trimmedName = draftName.trim();

    if (!trimmedName || trimmedName === project.name) {
      setDraftName(project.name);
      setIsRenaming(false);
      return;
    }

    isSubmittingRef.current = true;
    setIsRenaming(false);

    try {
      await renameProject({
        id: projectId,
        name: trimmedName,
      });
    } finally {
      isSubmittingRef.current = false;
    }
  };

  return (
    <TooltipProvider>
      <header className="flex h-14 items-center justify-between gap-4 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href="/" aria-label="Back to projects">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>

          <Breadcrumb>
            <BreadcrumbList className="gap-2">
              <BreadcrumbItem>
                <span className="text-sm font-semibold tracking-[0.16em] text-foreground">
                  POLARIS
                </span>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem className="min-w-0">
                {isRenaming ? (
                  <input
                    ref={inputRef}
                    value={draftName}
                    onChange={event => setDraftName(event.target.value)}
                    onBlur={() => void handleSubmitRename()}
                    onKeyDown={event => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void handleSubmitRename();
                      }

                      if (event.key === "Escape") {
                        event.preventDefault();
                        handleCancelRename();
                      }
                    }}
                    className="h-8 w-[240px] max-w-full rounded-md border border-border/60 bg-background px-3 text-sm font-medium text-foreground outline-none ring-0 focus:border-ring"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (!project) {
                        return;
                      }

                      setDraftName(project.name);
                      setIsRenaming(true);
                    }}
                    className={cn(
                      "truncate rounded-md px-2 py-1 text-left text-sm font-medium text-foreground transition-colors hover:bg-accent/60",
                      !project && "pointer-events-none opacity-60",
                    )}
                  >
                    {project?.name ?? "Loading project"}
                  </button>
                )}
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 rounded-md px-2 py-1 text-muted-foreground">
                      {project?.importStatus === "importing" ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <CloudCheck className="size-4" />
                      )}
                      <BreadcrumbPage className="text-xs text-muted-foreground">
                        {project?.importStatus === "importing"
                          ? "Importing"
                          : "Saved"}
                      </BreadcrumbPage>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>{saveLabel}</p>
                  </TooltipContent>
                </Tooltip>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <UserButton />
        </div>
      </header>
    </TooltipProvider>
  );
}
