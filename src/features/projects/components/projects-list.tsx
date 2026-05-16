// src/features/projects/components/projects-list.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Doc } from "../../../../convex/_generated/dataModel";
import { useDeleteProject, useProjectsPartial } from "../hooks/use-projects";
import { Spinner } from "@/components/ui/spinner";
import { formatDistanceToNow } from "date-fns";
import { Kbd } from "@/components/ui/kbd";
import {
  Globe,
  AlertCircle,
  Loader2,
  ArrowRight,
  Trash2,
} from "lucide-react";
import { FaGithub } from "react-icons/fa";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProjectsListProps {
  onViewAll: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTimestamp(timestamp: number): string {
  return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
}

/**
 * Returns the appropriate icon for a project based on its importStatus.
 * Globe  → default (custom project)
 * GitHub → import completed
 * Alert  → import failed
 * Spinner → currently importing
 */
function getProjectIcon(project: Doc<"projects">) {
  const iconClass = "size-4 text-muted-foreground";

  if (project.importStatus === "completed") {
    return <FaGithub className={iconClass} />;
  }
  if (project.importStatus === "failed") {
    return <AlertCircle className={iconClass} />;
  }
  if (project.importStatus === "importing") {
    return <Loader2 className={`${iconClass} animate-spin`} />;
  }
  return <Globe className={iconClass} />;
}

// ─── ContinueCard ─────────────────────────────────────────────────────────────

function ContinueCard({
  data,
  onDeleteRequest,
}: {
  data: Doc<"projects">;
  onDeleteRequest: (project: Doc<"projects">) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-muted-foreground">Last updated</span>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <Link
            href={`/projects/${data._id}`}
            className="group h-auto items-start justify-start p-4 bg-background border rounded-none flex flex-col gap-2 hover:bg-accent/50 transition-colors text-left w-full"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                {getProjectIcon(data)}
                <span className="font-medium truncate">{data.name}</span>
              </div>
              <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </div>
            <span className="text-xs text-muted-foreground">
              {formatTimestamp(data.updatedAt)}
            </span>
          </Link>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            variant="destructive"
            onSelect={() => onDeleteRequest(data)}
          >
            <Trash2 />
            Delete project
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
}

// ─── ProjectItem ──────────────────────────────────────────────────────────────

function ProjectItem({
  data,
  onDeleteRequest,
}: {
  data: Doc<"projects">;
  onDeleteRequest: (project: Doc<"projects">) => void;
}) {
  return (
    <li>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <Link
            href={`/projects/${data._id}`}
            className="text-sm text-foreground/60 font-medium hover:text-foreground py-1 flex items-center justify-between w-full group transition-colors"
          >
            <div className="flex items-center gap-2">
              {getProjectIcon(data)}
              <span className="truncate">{data.name}</span>
            </div>
            <span className="text-xs text-muted-foreground group-hover:text-foreground/60 transition-colors">
              {formatTimestamp(data.updatedAt)}
            </span>
          </Link>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            variant="destructive"
            onSelect={() => onDeleteRequest(data)}
          >
            <Trash2 />
            Delete project
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </li>
  );
}

// ─── ProjectsList ─────────────────────────────────────────────────────────────

export function ProjectsList({ onViewAll }: ProjectsListProps) {
  const projects = useProjectsPartial(6);
  const deleteProject = useDeleteProject();
  const [deleteTarget, setDeleteTarget] = useState<Doc<"projects"> | null>(
    null,
  );

  if (projects === undefined) {
    return <Spinner className="size-4 text-ring" />;
  }

  const [mostRecent, ...rest] = projects;

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Continue Card — most recently updated project */}
      {mostRecent && (
        <ContinueCard data={mostRecent} onDeleteRequest={setDeleteTarget} />
      )}

      {/* Rest of the projects */}
      {rest.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 w-full">
            <span className="text-xs text-muted-foreground">
              Recent projects
            </span>
            <button
              onClick={onViewAll}
              className="flex items-center gap-2 text-muted-foreground text-xs hover:text-foreground transition-colors"
            >
              View all
              <Kbd className="bg-accent border">K</Kbd>
            </button>
          </div>

          <ul className="flex flex-col">
            {rest.map(project => (
              <ProjectItem
                key={project._id}
                data={project}
                onDeleteRequest={setDeleteTarget}
              />
            ))}
          </ul>
        </div>
      )}

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={open => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {deleteTarget?.name ?? "this project"}
              . This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={event => {
                event.preventDefault();
                if (!deleteTarget) {
                  return;
                }

                void deleteProject({ id: deleteTarget._id });
                setDeleteTarget(null);
              }}
            >
              Delete project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
