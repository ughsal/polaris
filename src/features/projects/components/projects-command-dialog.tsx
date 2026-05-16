// src/features/projects/components/projects-command-dialog.tsx
"use client";

import { useRouter } from "next/navigation";
import { FaGithub } from "react-icons/fa";
import { Globe, AlertCircle, Loader2 } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useProjects } from "../hooks/use-projects";
import { Doc } from "../../../../convex/_generated/dataModel";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProjectsCommandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Same logic as projects-list getProjectIcon but with size-4 icons
 * for the command dialog context.
 */
function getProjectIcon(project: Doc<"projects">) {
  const cls = "size-4 text-muted-foreground";

  if (project.importStatus === "completed") return <FaGithub className={cls} />;
  if (project.importStatus === "failed") return <AlertCircle className={cls} />;
  if (project.importStatus === "importing")
    return <Loader2 className={`${cls} animate-spin`} />;
  return <Globe className={cls} />;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProjectsCommandDialog({
  open,
  onOpenChange,
}: ProjectsCommandDialogProps) {
  const router = useRouter();
  const projects = useProjects();

  function handleSelect(projectId: string) {
    router.push(`/projects/${projectId}`);
    onOpenChange(false);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search projects"
      description="Search and navigate to your project."
    >
      <CommandInput placeholder="Search projects..." />
      <CommandList>
        <CommandEmpty>No projects found.</CommandEmpty>
        <CommandGroup heading="Projects">
          {projects?.map(project => (
            <CommandItem
              key={project._id}
              /**
               * Value combines name + ID so projects with identical names
               * don't all highlight together on search.
               */
              value={`${project.name}-${project._id}`}
              onSelect={() => handleSelect(project._id)}
            >
              {getProjectIcon(project)}
              {project.name}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
