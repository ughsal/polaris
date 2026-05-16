"use client";

import { useState } from "react";
import { FaGithub } from "react-icons/fa";
import { Code2, Eye } from "lucide-react";
import type { Id } from "../../../../convex/_generated/dataModel";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ProjectViewMode = "editor" | "preview";

interface ProjectIdViewProps {
  projectId: Id<"projects">;
}

export function ProjectIdView({ projectId }: ProjectIdViewProps) {
  const [activeView, setActiveView] = useState<ProjectViewMode>("editor");

  return (
    <div
      data-project-id={projectId}
      className="flex h-full min-h-0 flex-col bg-background"
    >
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <Button
            variant={activeView === "editor" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setActiveView("editor")}
          >
            <Code2 className="size-4" />
            Code
          </Button>
          <Button
            variant={activeView === "preview" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setActiveView("preview")}
          >
            <Eye className="size-4" />
            Preview
          </Button>
        </div>

        <Button variant="outline" size="sm" type="button">
          <FaGithub className="size-4" />
          Export to GitHub
        </Button>
      </div>

      <div className="min-h-0 flex-1 p-4">
        <section
          className={cn(
            "h-full rounded-lg border border-border/60 bg-muted/20",
            activeView !== "editor" && "hidden",
          )}
        >
          <div className="flex h-full items-center justify-center px-6 text-center">
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                Editor placeholder
              </p>
              <p className="text-sm text-muted-foreground">
                File explorer and editor state are planned for later sprints.
              </p>
            </div>
          </div>
        </section>

        <section
          className={cn(
            "h-full rounded-lg border border-border/60 bg-muted/20",
            activeView !== "preview" && "hidden",
          )}
        >
          <div className="flex h-full items-center justify-center px-6 text-center">
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                Preview placeholder
              </p>
              <p className="text-sm text-muted-foreground">
                Live preview runtime arrives in a later sprint.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
