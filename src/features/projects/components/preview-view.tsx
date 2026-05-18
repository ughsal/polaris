"use client";

import { useState } from "react";
import { Allotment } from "allotment";
import { ExternalLink, RotateCcw, TerminalSquare } from "lucide-react";
import type { Id } from "../../../../convex/_generated/dataModel";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";

import { useProject } from "../hooks/use-projects";
import { PreviewTerminal } from "../../preview/components/preview-terminal";
import { PreviewSettingsPopover } from "../../preview/components/preview-settings-popover";
import { useWebContainer } from "../../preview/hooks/use-webcontainer";

interface PreviewViewProps {
  projectId: Id<"projects">;
}

function getStatusLabel(status: string, previewUrl: string | null) {
  if (status === "booting") {
    return "Starting preview...";
  }

  if (status === "installing") {
    return "Installing...";
  }

  if (status === "running" && previewUrl) {
    return previewUrl;
  }

  return "Ready to preview";
}

function getProgressValue(status: string) {
  if (status === "booting") {
    return 20;
  }

  if (status === "installing") {
    return 65;
  }

  if (status === "running") {
    return 100;
  }

  return 0;
}

function getStatusDetail(status: string) {
  if (status === "booting") {
    return "Booting the container and loading browser isolation. The first run can take a few minutes.";
  }

  if (status === "installing") {
    return "Installing dependencies. Please wait a few minutes on the first run.";
  }

  return "The preview will appear when the container is ready.";
}

export function PreviewView({ projectId }: PreviewViewProps) {
  const [showTerminal, setShowTerminal] = useState(true);
  const project = useProject(projectId);
  const { status, previewUrl, error, restart, terminalOutput } = useWebContainer({
    projectId,
    enabled: true,
    settings: project?.settings,
  });

  const isBusy = status === "booting" || status === "installing";
  const statusLabel = getStatusLabel(status, previewUrl);
  const progressValue = getProgressValue(status);
  const statusDetail = getStatusDetail(status);
  const canShowPreview = !error && previewUrl !== null;

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border/60 bg-background">
      <div className="flex h-9 items-center justify-between gap-3 border-b border-border/50 px-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-muted-foreground">
            {status === "running" && previewUrl ? (
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-foreground hover:underline"
              >
                <ExternalLink className="size-3.5" />
                {statusLabel}
              </a>
            ) : (
              statusLabel
            )}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="icon-xs" onClick={() => void restart()} aria-label="Restart preview">
            <RotateCcw className="size-3.5" />
          </Button>
          <Button
            variant={showTerminal ? "secondary" : "ghost"}
            size="icon-xs"
            onClick={() => setShowTerminal(current => !current)}
            aria-label="Toggle terminal"
          >
            <TerminalSquare className="size-3.5" />
          </Button>
          <PreviewSettingsPopover
            projectId={projectId}
            initialValues={project?.settings}
            onSave={() => void restart()}
          />
        </div>
      </div>

      {error ? (
        <div className="flex min-h-0 flex-1 items-center justify-center px-6 text-center">
          <div className="space-y-4">
            <p className="text-sm font-medium text-foreground">{error}</p>
            <Button size="sm" onClick={() => void restart()}>
              <RotateCcw className="size-4" />
              Restart preview
            </Button>
          </div>
        </div>
      ) : isBusy && !previewUrl ? (
        <div className="flex min-h-0 flex-1 items-center justify-center px-6 text-center">
          <div className="w-full max-w-md space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
                <Spinner className="size-4" />
                <span>{statusLabel}</span>
              </div>
              <Progress value={progressValue} />
            </div>
            <p className="text-sm text-muted-foreground">{statusDetail}</p>
          </div>
        </div>
      ) : showTerminal ? (
        <Allotment vertical defaultSizes={[600, 200]} separator>
          <Allotment.Pane preferredSize={600} minSize={100}>
            <div className="h-full min-h-0">
              {canShowPreview ? (
                <iframe
                  title={`Preview for ${project?.name ?? "project"}`}
                  src={previewUrl ?? undefined}
                  className="h-full w-full border-0"
                />
              ) : (
                <div className="flex h-full items-center justify-center px-6 text-center">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      Ready to preview
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Start a runnable web project and the preview will appear here.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Allotment.Pane>
          <Allotment.Pane preferredSize={200} minSize={100} maxSize={500}>
            <div className="flex h-full min-h-0 flex-col border-t border-border/50">
              <div className="border-b border-border/50 px-3 py-2">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Terminal
                </p>
              </div>
              <div className="min-h-0 flex-1">
                <PreviewTerminal output={terminalOutput} />
              </div>
            </div>
          </Allotment.Pane>
        </Allotment>
      ) : (
        <div className="min-h-0 flex-1">
          {canShowPreview ? (
            <iframe
              title={`Preview for ${project?.name ?? "project"}`}
              src={previewUrl ?? undefined}
              className="h-full w-full border-0"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center">
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  Ready to preview
                </p>
                <p className="text-sm text-muted-foreground">
                  Start a runnable web project and the preview will appear here.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
