"use client";

import { useState } from "react";
import { Allotment } from "allotment";
import { FaGithub } from "react-icons/fa";
import { Code2, Eye } from "lucide-react";
import type { Id } from "../../../../convex/_generated/dataModel";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FileExplorer } from "./file-explorer";
import { EditorView } from "../../editor/components/editor-view";
import {
  useProjectConversationActions,
  useProjectConversationOpen,
} from "../store/use-project-layout-store";
import { Bot } from "lucide-react";

type ProjectViewMode = "editor" | "preview";

const FILE_EXPLORER_MIN_WIDTH = 240;
const FILE_EXPLORER_MAX_WIDTH = 420;
const FILE_EXPLORER_DEFAULT_WIDTH = 300;
const EDITOR_DEFAULT_SIZE = 860;

interface ProjectIdViewProps {
  projectId: Id<"projects">;
}

export function ProjectIdView({ projectId }: ProjectIdViewProps) {
  const [activeView, setActiveView] = useState<ProjectViewMode>("editor");
  const isConversationOpen = useProjectConversationOpen(projectId);
  const { toggleConversation } = useProjectConversationActions();

  return (
    <div
      data-project-id={projectId}
      className="flex h-full min-h-0 flex-col bg-background"
    >
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <Button
            variant={isConversationOpen ? "secondary" : "ghost"}
            size="sm"
            onClick={() => toggleConversation(projectId)}
            aria-label={
              isConversationOpen ? "Hide conversation" : "Open conversation"
            }
          >
            <Bot className="size-4" />
          </Button>
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
            "h-full overflow-hidden rounded-lg border border-border/60 bg-muted/20",
            activeView !== "editor" && "hidden",
          )}
        >
          <Allotment
            defaultSizes={[FILE_EXPLORER_DEFAULT_WIDTH, EDITOR_DEFAULT_SIZE]}
            separator
          >
            <Allotment.Pane
              snap
              minSize={FILE_EXPLORER_MIN_WIDTH}
              maxSize={FILE_EXPLORER_MAX_WIDTH}
              preferredSize={FILE_EXPLORER_DEFAULT_WIDTH}
            >
              <FileExplorer projectId={projectId} />
            </Allotment.Pane>
            <Allotment.Pane preferredSize={EDITOR_DEFAULT_SIZE}>
              <EditorView projectId={projectId} />
            </Allotment.Pane>
          </Allotment>
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
