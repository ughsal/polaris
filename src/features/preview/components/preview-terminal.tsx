"use client";

import { useEffect, useRef } from "react";
import type { Terminal as XtermTerminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";

interface PreviewTerminalProps {
  output: string;
}

export function PreviewTerminal({ output }: PreviewTerminalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<XtermTerminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const renderedOutputRef = useRef("");

  useEffect(() => {
    if (!containerRef.current || terminalRef.current) {
      return;
    }

    const terminal = new Terminal({
      cursorBlink: false,
      fontFamily:
        "var(--font-plex-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      fontSize: 12,
      theme: {
        background: "#0b0d10",
      },
      convertEol: true,
      scrollback: 2000,
    });
    const fitAddon = new FitAddon();

    terminal.loadAddon(fitAddon);
    terminal.open(containerRef.current);
    fitAddon.fit();

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;
    renderedOutputRef.current = "";

    const observer = new ResizeObserver(() => {
      fitAddon.fit();
    });

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      fitAddon.dispose();
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
      renderedOutputRef.current = "";
    };
  }, []);

  useEffect(() => {
    const terminal = terminalRef.current;

    if (!terminal) {
      return;
    }

    if (output.length < renderedOutputRef.current.length) {
      terminal.reset();
      terminal.write(output);
      renderedOutputRef.current = output;
      fitAddonRef.current?.fit();
      return;
    }

    if (output.startsWith(renderedOutputRef.current)) {
      const nextChunk = output.slice(renderedOutputRef.current.length);
      if (nextChunk) {
        terminal.write(nextChunk);
        renderedOutputRef.current = output;
        fitAddonRef.current?.fit();
      }
      return;
    }

    terminal.reset();
    terminal.write(output);
    renderedOutputRef.current = output;
    fitAddonRef.current?.fit();
  }, [output]);

  return <div ref={containerRef} className="h-full min-h-0 w-full" />;
}
