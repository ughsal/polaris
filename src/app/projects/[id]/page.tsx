// src/app/projects/[id]/page.tsx
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { fetchQuery } from "convex/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileCode2, Terminal } from "lucide-react";

interface ProjectPageProps {
  params: { id: string };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Attempt to load the project for the page title.
  // If it doesn't exist or doesn't belong to the user, show a safe fallback.
  let projectName = "Project";

  try {
    // NOTE: fetchQuery is the server-side Convex fetch helper for App Router.
    // This will be wired up properly in Part 2 with a `getById` query.
    // For now we just show the ID as the name if we can't resolve it.
    projectName = `Project · ${(await params).id.slice(0, 8)}`;
  } catch {
    // Silently fall back to generic name — this is a Part 1 stub.
  }

  return (
    <div className="flex h-screen w-full bg-[#0d0e11] text-white overflow-hidden">
      {/* ── Activity Bar (leftmost, VS Code style) ── */}
      <aside className="w-12 flex flex-col items-center py-3 gap-4 border-r border-white/8 bg-[#0a0b0e] shrink-0">
        <Link
          href="/"
          className="p-2 rounded hover:bg-white/8 transition-colors text-white/40 hover:text-white/80"
          title="Back to projects"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="w-6 border-t border-white/10" />
        <button
          className="p-2 rounded hover:bg-white/8 transition-colors text-white/40 hover:text-white/80"
          title="Explorer"
        >
          <FileCode2 className="size-4" />
        </button>
        <button
          className="p-2 rounded hover:bg-white/8 transition-colors text-white/40 hover:text-white/80"
          title="Terminal"
        >
          <Terminal className="size-4" />
        </button>
      </aside>

      {/* ── File Explorer sidebar ── */}
      <aside className="w-56 border-r border-white/8 bg-[#0c0d10] flex flex-col shrink-0">
        <div className="px-3 py-2 border-b border-white/8">
          <p className="text-[11px] uppercase tracking-widest text-white/30 font-semibold select-none">
            Explorer
          </p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-white/20 text-center px-4">
            {/* Part 2 will populate the file tree here */}
            File explorer coming in Part 2
          </p>
        </div>
      </aside>

      {/* ── Main editor area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tab bar */}
        <div className="h-9 border-b border-white/8 flex items-center px-4 gap-2 bg-[#0c0d10] shrink-0">
          <span className="text-xs text-white/50 font-mono">{projectName}</span>
        </div>

        {/* Editor placeholder */}
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <FileCode2 className="size-10 text-white/10" />
          <p className="text-sm text-white/25 font-mono">
            Open a file to start editing
          </p>
          <p className="text-xs text-white/15">
            {/* Part 2: CodeMirror editor, AI agent, terminal, preview */}
            Full IDE shell coming in Part 2
          </p>
        </div>
      </div>
    </div>
  );
}
