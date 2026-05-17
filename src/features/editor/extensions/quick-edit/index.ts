import { type Extension, Prec, StateEffect, StateField } from "@codemirror/state";
import {
  EditorView,
  keymap,
  showTooltip,
  type Tooltip,
  type TooltipView,
} from "@codemirror/view";

import { fetchQuickEdit } from "./fetcher";
import { type QuickEditRequest } from "./schema";

type QuickEditState = {
  from: number;
  to: number;
};

type QuickEditContext = Pick<
  QuickEditRequest,
  "selectedCode" | "beforeSelection" | "afterSelection"
>;

const openQuickEditEffect = StateEffect.define<QuickEditState>();
const closeQuickEditEffect = StateEffect.define<void>();

function getSelectionContext(
  view: EditorView,
  selection: QuickEditState,
): QuickEditContext | null {
  const document = view.state.doc;
  const selectedCode = document.sliceString(selection.from, selection.to);

  if (!selectedCode.trim()) {
    return null;
  }

  return {
    selectedCode,
    beforeSelection: document.sliceString(
      Math.max(0, selection.from - 4000),
      selection.from,
    ),
    afterSelection: document.sliceString(
      selection.to,
      Math.min(document.length, selection.to + 4000),
    ),
  };
}

function createQuickEditTooltip(
  selection: QuickEditState,
  fileName: string,
  quickEditStateField: StateField<QuickEditState | null>,
): Tooltip {
  return {
    pos: selection.to,
    end: selection.from,
    above: true,
    strictSide: false,
    arrow: true,
    create(view): TooltipView {
      const dom = document.createElement("div");
      dom.className = "cm-quick-edit";

      const title = document.createElement("div");
      title.className = "cm-quick-edit__title";
      title.textContent = "Quick Edit";

      const textarea = document.createElement("textarea");
      textarea.className = "cm-quick-edit__input";
      textarea.rows = 3;
      textarea.placeholder = "Describe how the selected code should change";

      const footer = document.createElement("div");
      footer.className = "cm-quick-edit__footer";

      const hint = document.createElement("span");
      hint.className = "cm-quick-edit__hint";
      hint.textContent = "Ctrl/Cmd+Enter to apply";

      const actions = document.createElement("div");
      actions.className = "cm-quick-edit__actions";

      const cancelButton = document.createElement("button");
      cancelButton.type = "button";
      cancelButton.className = "cm-quick-edit__button cm-quick-edit__button--ghost";
      cancelButton.textContent = "Cancel";

      const applyButton = document.createElement("button");
      applyButton.type = "button";
      applyButton.className = "cm-quick-edit__button";
      applyButton.textContent = "Apply";

      actions.append(cancelButton, applyButton);
      footer.append(hint, actions);
      dom.append(title, textarea, footer);

      let abortController: AbortController | null = null;

      const close = () => {
        if (abortController) {
          abortController.abort();
          abortController = null;
        }

        view.dispatch({
          effects: closeQuickEditEffect.of(undefined),
        });
        view.focus();
      };

      const setLoading = (isLoading: boolean) => {
        textarea.disabled = isLoading;
        applyButton.disabled = isLoading;
        cancelButton.disabled = false;
        applyButton.textContent = isLoading ? "Applying..." : "Apply";
      };

      const submit = async () => {
        const currentSelection = view.state.field(quickEditStateField, false);
        if (!currentSelection) {
          return;
        }

        const basePayload = getSelectionContext(view, currentSelection);
        const instruction = textarea.value.trim();

        if (!basePayload || !instruction) {
          return;
        }

        abortController?.abort();
        abortController = new AbortController();
        setLoading(true);

        const replacement = await fetchQuickEdit(
          {
            ...basePayload,
            fileName,
            instruction,
          },
          {
            signal: abortController.signal,
          },
        );

        abortController = null;
        setLoading(false);

        if (replacement === null) {
          return;
        }

        const nextSelection = view.state.field(quickEditStateField, false);
        if (!nextSelection) {
          return;
        }

        view.dispatch({
          changes: {
            from: nextSelection.from,
            to: nextSelection.to,
            insert: replacement,
          },
          selection: {
            anchor: nextSelection.from + replacement.length,
          },
          effects: closeQuickEditEffect.of(undefined),
        });
        view.focus();
      };

      cancelButton.addEventListener("click", event => {
        event.preventDefault();
        close();
      });

      applyButton.addEventListener("click", event => {
        event.preventDefault();
        void submit();
      });

      textarea.addEventListener("keydown", event => {
        if (event.key === "Escape") {
          event.preventDefault();
          close();
          return;
        }

        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          void submit();
        }
      });

      return {
        dom,
        mount() {
          textarea.focus();
        },
        destroy() {
          abortController?.abort();
        },
      };
    },
  };
}

export function openQuickEdit(view: EditorView) {
  const selection = view.state.selection.main;

  if (selection.empty) {
    return false;
  }

  view.dispatch({
    selection: {
      anchor: selection.to,
    },
    effects: openQuickEditEffect.of({
      from: selection.from,
      to: selection.to,
    }),
  });

  return true;
}

function createQuickEditStateField(fileName: string) {
  return StateField.define<QuickEditState | null>({
    create() {
      return null;
    },
    update(value, transaction) {
      for (const effect of transaction.effects) {
        if (effect.is(openQuickEditEffect)) {
          return effect.value;
        }

        if (effect.is(closeQuickEditEffect)) {
          return null;
        }
      }

      if (!value) {
        return null;
      }

      if (transaction.docChanged) {
        return null;
      }

      const selection = transaction.state.selection.main;
      if (selection.empty || selection.from !== value.from || selection.to !== value.to) {
        return null;
      }

      return value;
    },
    provide: field =>
      showTooltip.computeN([field], state => {
        const value = state.field(field);
        return value ? [createQuickEditTooltip(value, fileName, field)] : [];
      }),
  });
}

const quickEditTheme = EditorView.baseTheme({
  ".cm-quick-edit": {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    minWidth: "22rem",
    maxWidth: "26rem",
    padding: "0.875rem",
  },
  ".cm-quick-edit__title": {
    fontSize: "0.75rem",
    fontWeight: "600",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: "var(--muted-foreground)",
  },
  ".cm-quick-edit__input": {
    width: "100%",
    resize: "none",
    borderRadius: "0.5rem",
    border: "1px solid var(--border)",
    backgroundColor: "transparent",
    color: "var(--foreground)",
    padding: "0.75rem",
    outline: "none",
    fontFamily: "var(--font-plex-mono), ui-monospace, SFMono-Regular, monospace",
    fontSize: "0.875rem",
    lineHeight: "1.45",
  },
  ".cm-quick-edit__input:focus": {
    borderColor: "var(--ring)",
    boxShadow: "0 0 0 1px var(--ring)",
  },
  ".cm-quick-edit__footer": {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
  },
  ".cm-quick-edit__hint": {
    fontSize: "0.75rem",
    color: "var(--muted-foreground)",
  },
  ".cm-quick-edit__actions": {
    display: "flex",
    gap: "0.5rem",
  },
  ".cm-quick-edit__button": {
    borderRadius: "0.5rem",
    border: "1px solid var(--border)",
    padding: "0.45rem 0.75rem",
    fontSize: "0.75rem",
    fontWeight: "600",
    color: "var(--foreground)",
    backgroundColor: "var(--accent)",
    cursor: "pointer",
  },
  ".cm-quick-edit__button:disabled": {
    opacity: "0.65",
    cursor: "not-allowed",
  },
  ".cm-quick-edit__button--ghost": {
    backgroundColor: "transparent",
  },
});

export function createQuickEditExtension(fileName: string): Extension[] {
  const quickEditStateField = createQuickEditStateField(fileName);

  return [
    quickEditStateField,
    quickEditTheme,
    Prec.highest(
      keymap.of([
        {
          key: "Mod-k",
          run: openQuickEdit,
        },
        {
          key: "Escape",
          run(view) {
            if (!view.state.field(quickEditStateField, false)) {
              return false;
            }

            view.dispatch({
              effects: closeQuickEditEffect.of(undefined),
            });
            return true;
          },
        },
      ]),
    ),
  ];
}
