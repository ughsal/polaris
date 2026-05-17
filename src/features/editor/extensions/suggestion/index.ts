import {
  EditorState,
  type Extension,
  Prec,
  StateEffect,
  StateField,
  RangeSetBuilder,
} from "@codemirror/state";
import {
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
  keymap,
  type ViewUpdate,
} from "@codemirror/view";

import { fetchSuggestion } from "./fetcher";
import { type SuggestionRequest } from "./schema";

const SUGGESTION_DEBOUNCE_MS = 300;

type SuggestionState = {
  position: number;
  text: string;
};

const setSuggestionEffect = StateEffect.define<SuggestionState | null>();

const suggestionField = StateField.define<SuggestionState | null>({
  create() {
    return null;
  },
  update(value, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(setSuggestionEffect)) {
        return effect.value;
      }
    }

    if (transaction.docChanged || transaction.selection) {
      return null;
    }

    return value;
  },
  provide: field =>
    EditorView.decorations.compute([field], state => {
      const suggestion = state.field(field);

      if (
        !suggestion ||
        !suggestion.text ||
        !state.selection.main.empty ||
        state.selection.main.from !== suggestion.position
      ) {
        return Decoration.none;
      }

      const builder = new RangeSetBuilder<Decoration>();
      builder.add(
        suggestion.position,
        suggestion.position,
        Decoration.widget({
          side: 1,
          widget: new SuggestionWidget(suggestion.text),
        }),
      );

      return builder.finish();
    }),
});

class SuggestionWidget extends WidgetType {
  constructor(private readonly text: string) {
    super();
  }

  eq(other: SuggestionWidget) {
    return other.text === this.text;
  }

  toDOM() {
    const span = document.createElement("span");
    span.className = "cm-ai-suggestion";
    span.textContent = this.text;
    return span;
  }
}

const suggestionTheme = EditorView.baseTheme({
  ".cm-ai-suggestion": {
    color: "rgba(255, 255, 255, 0.28)",
    pointerEvents: "none",
    whiteSpace: "pre",
  },
});

function getContextWindow(lines: readonly string[], lineNumber: number) {
  const previousStart = Math.max(0, lineNumber - 21);
  const previousLines = lines.slice(previousStart, lineNumber - 1);
  const nextLines = lines.slice(lineNumber, lineNumber + 20);

  return {
    previousLines,
    nextLines,
  };
}

function buildSuggestionRequest(
  state: EditorState,
  fileName: string,
): SuggestionRequest | null {
  const selection = state.selection.main;

  if (!selection.empty) {
    return null;
  }

  const document = state.doc;
  const code = document.toString();

  if (!code.trim()) {
    return null;
  }

  const line = document.lineAt(selection.from);
  const lines = code.split("\n");
  const lineNumber = line.number;
  const currentLine = line.text;
  const textBeforeCursor = document.sliceString(line.from, selection.from);
  const textAfterCursor = document.sliceString(selection.from, line.to);

  if (!textBeforeCursor.trim() && !currentLine.trim()) {
    return null;
  }

  const { previousLines, nextLines } = getContextWindow(lines, lineNumber);

  return {
    fileName,
    code,
    currentLine,
    previousLines,
    textBeforeCursor,
    textAfterCursor,
    nextLines,
    lineNumber,
  };
}

function createRequestKey(
  payload: SuggestionRequest,
  cursorPosition: number,
) {
  return JSON.stringify({
    fileName: payload.fileName,
    lineNumber: payload.lineNumber,
    cursorPosition,
    textBeforeCursor: payload.textBeforeCursor,
    textAfterCursor: payload.textAfterCursor,
    currentLine: payload.currentLine,
  });
}

function trimSuggestionOverlap(suggestion: string, textAfterCursor: string) {
  if (!suggestion || !textAfterCursor) {
    return suggestion;
  }

  const maxOverlap = Math.min(suggestion.length, textAfterCursor.length);

  for (let overlap = maxOverlap; overlap > 0; overlap -= 1) {
    if (suggestion.endsWith(textAfterCursor.slice(0, overlap))) {
      return suggestion.slice(0, -overlap);
    }
  }

  return suggestion;
}

function normalizeSuggestion(rawSuggestion: string, textAfterCursor: string) {
  const stripped = rawSuggestion
    .replace(/^```[\w-]*\n?/u, "")
    .replace(/\n?```$/u, "")
    .replace(/\r/g, "");
  const withoutOverlap = trimSuggestionOverlap(stripped, textAfterCursor);

  if (!withoutOverlap.trim()) {
    return "";
  }

  return withoutOverlap;
}

class SuggestionPlugin {
  private timeoutId: number | null = null;
  private abortController: AbortController | null = null;
  private requestKey: string | null = null;

  constructor(
    private readonly view: EditorView,
    private readonly fileName: string,
  ) {
    this.schedule();
  }

  update(update: ViewUpdate) {
    if (!update.docChanged && !update.selectionSet && !update.focusChanged) {
      return;
    }

    if (!update.view.hasFocus || !update.state.selection.main.empty) {
      this.cancelPendingWork();
      return;
    }

    this.schedule();
  }

  destroy() {
    this.cancelPendingWork();
  }

  private schedule() {
    this.cancelPendingWork();

    const payload = buildSuggestionRequest(this.view.state, this.fileName);
    if (!payload || !this.view.hasFocus) {
      return;
    }

    const cursorPosition = this.view.state.selection.main.from;
    this.requestKey = createRequestKey(payload, cursorPosition);

    this.timeoutId = window.setTimeout(() => {
      void this.loadSuggestion(payload, cursorPosition);
    }, SUGGESTION_DEBOUNCE_MS);
  }

  private async loadSuggestion(
    payload: SuggestionRequest,
    cursorPosition: number,
  ) {
    this.abortController = new AbortController();

    const suggestion = await fetchSuggestion(payload, {
      signal: this.abortController.signal,
    });

    this.abortController = null;

    if (!suggestion) {
      return;
    }

    const nextPayload = buildSuggestionRequest(this.view.state, this.fileName);
    const nextRequestKey = nextPayload
      ? createRequestKey(nextPayload, this.view.state.selection.main.from)
      : null;

    if (!nextPayload || nextRequestKey !== this.requestKey) {
      return;
    }

    const normalizedSuggestion = normalizeSuggestion(
      suggestion,
      nextPayload.textAfterCursor,
    );

    if (!normalizedSuggestion) {
      this.view.dispatch({
        effects: setSuggestionEffect.of(null),
      });
      return;
    }

    this.view.dispatch({
      effects: setSuggestionEffect.of({
        position: cursorPosition,
        text: normalizedSuggestion,
      }),
    });
  }

  private cancelPendingWork() {
    this.requestKey = null;

    if (this.timeoutId !== null) {
      window.clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}

function acceptSuggestion(view: EditorView) {
  const suggestion = view.state.field(suggestionField);

  if (!suggestion || !suggestion.text) {
    return false;
  }

  view.dispatch({
    changes: {
      from: suggestion.position,
      insert: suggestion.text,
    },
    selection: {
      anchor: suggestion.position + suggestion.text.length,
    },
    effects: setSuggestionEffect.of(null),
  });

  return true;
}

export function createSuggestionExtension(fileName: string): Extension[] {
  return [
    suggestionField,
    suggestionTheme,
    Prec.highest(
      keymap.of([
        {
          key: "Tab",
          run: acceptSuggestion,
        },
      ]),
    ),
    ViewPlugin.fromClass(
      class extends SuggestionPlugin {
        constructor(view: EditorView) {
          super(view, fileName);
        }
      },
    ),
  ];
}
