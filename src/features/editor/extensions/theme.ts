import { EditorView } from "@codemirror/view";

export const editorTheme = EditorView.theme(
  {
    "&": {
      height: "100%",
      backgroundColor: "transparent",
    },
    ".cm-scroller": {
      fontFamily: "var(--font-plex-mono), ui-monospace, SFMono-Regular, monospace",
      fontSize: "14px",
      lineHeight: "1.65",
      overflow: "auto",
    },
    ".cm-content": {
      caretColor: "var(--foreground)",
    },
    ".cm-gutters": {
      backgroundColor: "transparent",
      border: "none",
      color: "var(--muted-foreground)",
    },
    ".cm-gutterElement": {
      color: "var(--muted-foreground)",
    },
    ".cm-activeLine, .cm-activeLineGutter": {
      backgroundColor: "color-mix(in oklab, var(--accent) 18%, transparent)",
    },
    ".cm-selectionBackground, ::selection": {
      backgroundColor: "color-mix(in oklab, var(--ring) 30%, transparent) !important",
    },
    "&.cm-focused .cm-cursor": {
      borderLeftColor: "var(--foreground)",
    },
    ".cm-tooltip": {
      borderRadius: "0.5rem",
      border: "1px solid var(--border)",
      backgroundColor: "var(--popover)",
      color: "var(--popover-foreground)",
    },
  },
  { dark: true },
);
