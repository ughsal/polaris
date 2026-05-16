// src/features/projects/components/projects-view.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Poppins } from "next/font/google";
import { cn } from "@/lib/utils";
import { gsap } from "gsap";
import { Sparkles } from "lucide-react";
import { FaGithub } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
  adjectives,
  animals,
  colors,
  uniqueNamesGenerator,
} from "unique-names-generator";

import { ProjectsList } from "./projects-list";
import { ProjectsCommandDialog } from "./projects-command-dialog";
import { useCreateProject } from "../hooks/use-projects";

// ─── Font ─────────────────────────────────────────────────────────────────────

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// ─── Animated Grid Background ─────────────────────────────────────────────────
// GPU-friendly: only animates opacity. No layout thrashing.
// Dot density is low enough to not distract on a functional page.

function GridBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const DOT_SPACING = 28;
    const DOT_RADIUS = 1;
    const BASE_OPACITY = 0.08;
    const PULSE_AMPLITUDE = 0.06;
    const WAVE_SPEED = 0.0008;

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function draw() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cols = Math.ceil(canvas.width / DOT_SPACING) + 1;
      const rows = Math.ceil(canvas.height / DOT_SPACING) + 1;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = col * DOT_SPACING;
          const y = row * DOT_SPACING;

          // Diagonal wave — each dot pulses based on position + time
          const wave =
            Math.sin(col * 0.3 + row * 0.3 - time * 2) * PULSE_AMPLITUDE;

          const opacity = BASE_OPACITY + wave;

          ctx.beginPath();
          ctx.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(140, 160, 255, ${Math.max(0, opacity)})`;
          ctx.fill();
        }
      }

      time += WAVE_SPEED * 16; // ~60fps increment
      animationId = requestAnimationFrame(draw);
    }

    resize();
    draw();

    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      aria-hidden="true"
    />
  );
}

// ─── ProjectsView ─────────────────────────────────────────────────────────────

export function ProjectsView() {
  const [commandDialogOpen, setCommandDialogOpen] = useState(false);
  const createProject = useCreateProject();

  // GSAP entrance refs
  const logoRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // ── GSAP entrance animation ──────────────────────────────────────────────
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        [logoRef.current, actionsRef.current, listRef.current],
        { opacity: 0, y: 18 },
        {
          opacity: 1,
          y: 0,
          duration: 0.55,
          ease: "power2.out",
          stagger: 0.1,
          delay: 0.1,
        },
      );
    });

    return () => ctx.revert();
  }, []);

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;

      // Cmd+K → open command dialog
      if (mod && e.key === "k") {
        e.preventDefault();
        setCommandDialogOpen(true);
      }

      // Cmd+J → create new project
      if (mod && e.key === "j") {
        e.preventDefault();
        handleCreateProject();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleCreateProject() {
    const projectName = uniqueNamesGenerator({
      dictionaries: [adjectives, animals, colors],
      separator: "-",
      length: 3,
    });

    createProject({ name: projectName });
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* Animated dot-grid background */}
      <GridBackground />

      {/* Command dialog — Cmd+K */}
      <ProjectsCommandDialog
        open={commandDialogOpen}
        onOpenChange={setCommandDialogOpen}
      />

      {/* Main layout */}
      <main className="relative z-10 min-h-screen bg-sidebar flex flex-col items-center justify-center px-6 py-16 md:px-16">
        <div className="w-full max-w-sm mx-auto flex flex-col gap-4 items-center">
          {/* ── Logo + Wordmark ───────────────────────────────────────── */}
          <div
            ref={logoRef}
            className="flex justify-between gap-4 w-full items-center"
          >
            <div className="flex items-center gap-2 w-full group/logo">
              {/* ADD LOGO HERE — replace the src below with /logo.svg once you add it to /public */}
              <Image
                src="/vercel.svg"
                alt="Polaris"
                width={32}
                height={46}
                className="size-[32px] md:size-[46px]"
              />
              <span
                className={cn(
                  "text-4xl md:text-5xl font-semibold text-white",
                  poppins.className,
                )}
              >
                polaris
              </span>
            </div>
          </div>

          {/* ── Action Buttons ────────────────────────────────────────── */}
          <div ref={actionsRef} className="flex flex-col gap-2 w-full">
            <div className="grid grid-cols-2 gap-2">
              {/* New Project — Cmd+J */}
              <Button
                variant="outline"
                onClick={handleCreateProject}
                className="h-auto items-start justify-start p-4 bg-background border flex flex-col gap-6 rounded-none hover:bg-accent/40 transition-colors group/new"
              >
                <div className="flex items-center justify-between w-full">
                  <Sparkles className="size-4" />
                  <Kbd className="bg-accent border">
                    {/* ⌘ symbol — on Windows shows Ctrl */}
                    ⌘J
                  </Kbd>
                </div>
                <div className="text-sm">New</div>
              </Button>

              {/* Import Project — placeholder, no real GitHub flow in Part 1 */}
              <Button
                variant="outline"
                onClick={() => {
                  // TODO (Part 2): Open GitHub import dialog
                  // For now this is a placeholder — no action taken.
                }}
                className="h-auto items-start justify-start p-4 bg-background border flex flex-col gap-6 rounded-none hover:bg-accent/40 transition-colors group/import"
              >
                <div className="flex items-center justify-between w-full">
                  <FaGithub className="size-4" />
                  <Kbd className="bg-accent border">I</Kbd>
                </div>
                <div className="text-sm">Import</div>
              </Button>
            </div>
          </div>

          {/* ── Projects List ─────────────────────────────────────────── */}
          <div ref={listRef} className="w-full">
            <ProjectsList onViewAll={() => setCommandDialogOpen(true)} />
          </div>
        </div>
      </main>
    </>
  );
}
