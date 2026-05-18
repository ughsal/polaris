"use client";

import { useEffect, useMemo, useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, CheckCircle2, CircleX, Github } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useProject } from "../hooks/use-projects";
import { sanitizeGitHubRepoName } from "@/lib/github";
import type { Id } from "../../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  repoName: z
    .string()
    .trim()
    .min(1, "Repository name is required.")
    .max(100, "Repository name is too long.")
    .regex(
      /^[A-Za-z0-9._-]+$/u,
      "Repository names may only contain letters, numbers, dots, hyphens, and underscores.",
    ),
  visibility: z.enum(["public", "private"]),
  description: z.string().trim().max(350).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ExportPopoverProps {
  projectId: Id<"projects">;
}

function getTriggerIcon(status?: string) {
  if (status === "exporting") {
    return <Loader2 className="size-4 animate-spin" />;
  }

  if (status === "completed") {
    return <CheckCircle2 className="size-4" />;
  }

  if (status === "failed" || status === "cancelled") {
    return <CircleX className="size-4" />;
  }

  return <Github className="size-4" />;
}

export function ExportPopover({ projectId }: ExportPopoverProps) {
  const router = useRouter();
  const clerk = useClerk();
  const project = useProject(projectId);
  const [open, setOpen] = useState(false);

  const defaultRepoName = useMemo(
    () => sanitizeGitHubRepoName(project?.name ?? "polaris-export"),
    [project?.name],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      repoName: defaultRepoName,
      visibility: "private",
      description: "",
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset({
        repoName: defaultRepoName,
        visibility: "private",
        description: "",
      });
    }
  }, [defaultRepoName, form, open]);

  useEffect(() => {
    if (open) {
      form.reset({
        repoName: defaultRepoName,
        visibility: "private",
        description: "",
      });
    }
  }, [defaultRepoName, form, open]);

  const handleGitHubNotConnected = () => {
    toast.error("GitHub access needs to be reconnected.", {
      action: {
        label: "Open profile",
        onClick: () => clerk.openUserProfile(),
      },
    });
  };

  const startExport = form.handleSubmit(async values => {
    try {
      const response = await fetch("/api/github/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          repoName: values.repoName,
          visibility: values.visibility,
          description: values.description?.trim() || undefined,
        }),
      });

      const json = (await response.json().catch(() => null)) as
        | { success?: boolean; error?: string }
        | null;
      const errorMessage = json?.error ?? "";

      if (!response.ok) {
        if (
          errorMessage.includes("GitHub") &&
          (errorMessage.includes("connected") ||
            errorMessage.includes("access token") ||
            errorMessage.includes("repo scope") ||
            errorMessage.includes("repository access"))
        ) {
          handleGitHubNotConnected();
          return;
        }

        toast.error(errorMessage || "Unable to export project.");
        return;
      }

      toast.success("Exporting to GitHub.");
      router.refresh();
    } catch {
      toast.error("Unable to export project.");
    }
  });

  const cancelExport = async () => {
    try {
      const response = await fetch("/api/github/export/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ projectId }),
      });

      const json = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        toast.error(json?.error ?? "Unable to cancel export.");
        return;
      }

      toast.message("Export cancelled.");
    } catch {
      toast.error("Unable to cancel export.");
    }
  };

  const resetExport = async () => {
    try {
      const response = await fetch("/api/github/export/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ projectId }),
      });

      const json = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        toast.error(json?.error ?? "Unable to reset export state.");
        return;
      }

      form.reset({
        repoName: defaultRepoName,
        visibility: "private",
        description: "",
      });
      router.refresh();
    } catch {
      toast.error("Unable to reset export state.");
    }
  };

  const status = project?.exportStatus;
  const isExporting = status === "exporting";
  const isCompleted = status === "completed" && Boolean(project?.exportRepoUrl);
  const isFailed = status === "failed" || status === "cancelled";
  const failureLabel =
    status === "cancelled" ? "Export cancelled" : "Export failed";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" type="button">
          {getTriggerIcon(status)}
          <span
            className={cn(
              "inline-flex items-center gap-1",
              status === "exporting" && "text-foreground",
            )}
          >
            Export to GitHub
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[360px]">
        <div className="grid gap-4">
          {isExporting ? (
            <div className="grid gap-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Loader2 className="size-4 animate-spin" />
                Exporting to GitHub
              </div>
              <Button variant="outline" onClick={() => void cancelExport()}>
                Cancel
              </Button>
            </div>
          ) : isCompleted ? (
            <div className="grid gap-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 className="size-4 text-emerald-500" />
                Repository created
              </div>
              {project?.exportRepoUrl ? (
                <Button asChild variant="outline">
                  <a
                    href={project.exportRepoUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View on GitHub
                  </a>
                </Button>
              ) : null}
              <Button variant="secondary" onClick={() => void resetExport()}>
                Close / reset
              </Button>
            </div>
          ) : isFailed ? (
            <div className="grid gap-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CircleX className="size-4 text-destructive" />
                {failureLabel}
              </div>
              <p className="text-sm text-muted-foreground">
                The export could not be completed.
              </p>
              <Button onClick={() => void resetExport()}>Reset / try again</Button>
            </div>
          ) : (
            <form className="grid gap-4" onSubmit={startExport}>
              <div className="grid gap-2">
                <label htmlFor="repo-name" className="text-sm font-medium">
                  Repository name
                </label>
                <Input
                  id="repo-name"
                  autoComplete="off"
                  {...form.register("repoName")}
                />
                {form.formState.errors.repoName ? (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.repoName.message}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-2">
                <label htmlFor="repo-visibility" className="text-sm font-medium">
                  Visibility
                </label>
                <select
                  id="repo-visibility"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-0 focus:border-ring"
                  {...form.register("visibility")}
                >
                  <option value="private">Private</option>
                  <option value="public">Public</option>
                </select>
              </div>

              <div className="grid gap-2">
                <label htmlFor="repo-description" className="text-sm font-medium">
                  Description
                </label>
                <Textarea
                  id="repo-description"
                  rows={4}
                  maxLength={350}
                  placeholder="Exported from Polaris"
                  {...form.register("description")}
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  Creates a new repository and pushes the project files.
                </p>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Exporting
                    </>
                  ) : (
                    "Create repository"
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
