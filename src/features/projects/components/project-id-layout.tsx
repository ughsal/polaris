"use client";

import * as React from "react";
import { Allotment } from "allotment";
import Link from "next/link";
import type { Id } from "../../../../convex/_generated/dataModel";
import { ArrowLeft, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Navbar } from "./navbar";

const SIDEBAR_MIN_WIDTH = 280;
const SIDEBAR_MAX_WIDTH = 420;
const SIDEBAR_DEFAULT_WIDTH = 320;
const MAIN_DEFAULT_SIZE = 960;

interface ProjectIdLayoutProps {
  children: React.ReactNode;
  projectId: Id<"projects">;
}

interface ProjectNavbarBoundaryProps {
  children: React.ReactNode;
}

interface ProjectNavbarBoundaryState {
  hasError: boolean;
}

class ProjectNavbarBoundary extends React.Component<
  ProjectNavbarBoundaryProps,
  ProjectNavbarBoundaryState
> {
  state: ProjectNavbarBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-14 items-center justify-between gap-4 border-b border-border/50 px-4">
          <div className="flex min-w-0 items-center gap-3 text-sm text-muted-foreground">
            <TriangleAlert className="size-4 text-destructive" />
            <span>Project not found or no longer available.</span>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="size-4" />
              Back to dashboard
            </Link>
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export function ProjectIdLayout({
  children,
  projectId,
}: ProjectIdLayoutProps) {
  return (
    <div className="flex h-dvh min-h-0 flex-col bg-sidebar text-foreground">
      <ProjectNavbarBoundary>
        <Navbar projectId={projectId} />
      </ProjectNavbarBoundary>
      <div className="min-h-0 flex-1 border-t border-border/50">
        <Allotment
          defaultSizes={[SIDEBAR_DEFAULT_WIDTH, MAIN_DEFAULT_SIZE]}
          separator
        >
          <Allotment.Pane
            snap
            minSize={SIDEBAR_MIN_WIDTH}
            maxSize={SIDEBAR_MAX_WIDTH}
            preferredSize={SIDEBAR_DEFAULT_WIDTH}
          >
            <section className="flex h-full min-h-0 flex-col bg-muted/30">
              <div className="border-b border-border/50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  Conversation
                </p>
              </div>
              <div className="flex flex-1 items-center justify-center px-6 text-center">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    Conversation sidebar
                  </p>
                  <p className="text-sm text-muted-foreground">
                    AI chat and message history arrive in a later sprint.
                  </p>
                </div>
              </div>
            </section>
          </Allotment.Pane>
          <Allotment.Pane preferredSize={MAIN_DEFAULT_SIZE}>
            <div className="h-full min-h-0 min-w-0">{children}</div>
          </Allotment.Pane>
        </Allotment>
      </div>
    </div>
  );
}
