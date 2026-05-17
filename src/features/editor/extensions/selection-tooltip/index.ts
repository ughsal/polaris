"use client";

import { type Extension, StateField } from "@codemirror/state";
import {
  EditorView,
  showTooltip,
  type Tooltip,
  type TooltipView,
} from "@codemirror/view";
import { toast } from "sonner";

import { openQuickEdit } from "../quick-edit";

type SelectionTooltipState = {
  from: number;
  to: number;
};

function createIcon(icon: "quick-edit" | "chat") {
  const container = document.createElement("span");
  container.className = "cm-selection-actions__icon";
  container.textContent = icon === "quick-edit" ? "AI" : "Chat";
  return container;
}

function createActionButton(
  label: string,
  icon: "quick-edit" | "chat",
  onClick: () => void,
) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "cm-selection-actions__button";
  button.append(createIcon(icon), document.createTextNode(label));
  button.addEventListener("mousedown", event => {
    event.preventDefault();
  });
  button.addEventListener("click", event => {
    event.preventDefault();
    onClick();
  });
  return button;
}

function createSelectionTooltip(selection: SelectionTooltipState): Tooltip {
  return {
    pos: selection.to,
    end: selection.from,
    above: true,
    strictSide: false,
    arrow: true,
    create(view): TooltipView {
      const dom = document.createElement("div");
      dom.className = "cm-selection-actions";
      dom.addEventListener("mousedown", event => {
        event.preventDefault();
      });

      const quickEditButton = createActionButton("Quick Edit", "quick-edit", () => {
        openQuickEdit(view);
      });

      const addToChatButton = createActionButton("Add to Chat", "chat", () => {
        toast.message("Add to Chat arrives with the conversation sprint.");
      });

      dom.append(quickEditButton, addToChatButton);

      return {
        dom,
      };
    },
  };
}

const selectionTooltipTheme = EditorView.baseTheme({
  ".cm-selection-actions": {
    display: "flex",
    alignItems: "center",
    gap: "0.375rem",
    padding: "0.375rem",
    borderRadius: "0.75rem",
    border: "1px solid color-mix(in srgb, var(--border) 85%, transparent)",
    backgroundColor: "color-mix(in srgb, var(--background) 84%, #0f172a 16%)",
    boxShadow: "0 18px 40px rgba(0, 0, 0, 0.28)",
    backdropFilter: "blur(12px)",
  },
  ".cm-selection-actions__button": {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.375rem",
    borderRadius: "0.625rem",
    border: "1px solid transparent",
    backgroundColor: "transparent",
    color: "var(--foreground)",
    padding: "0.45rem 0.65rem",
    fontSize: "0.75rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 120ms ease, border-color 120ms ease",
  },
  ".cm-selection-actions__button:hover": {
    backgroundColor: "var(--accent)",
    borderColor: "color-mix(in srgb, var(--border) 80%, transparent)",
  },
  ".cm-selection-actions__icon": {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--muted-foreground)",
  },
});

const selectionTooltipStateField = StateField.define<SelectionTooltipState | null>({
  create(state) {
    const selection = state.selection.main;
    return selection.empty ? null : { from: selection.from, to: selection.to };
  },
  update(_, transaction) {
    const selection = transaction.state.selection.main;
    return selection.empty ? null : { from: selection.from, to: selection.to };
  },
  provide: field =>
    showTooltip.computeN([field], state => {
      const value = state.field(field);
      return value ? [createSelectionTooltip(value)] : [];
    }),
});

export function createSelectionTooltipExtension(): Extension[] {
  return [selectionTooltipStateField, selectionTooltipTheme];
}
