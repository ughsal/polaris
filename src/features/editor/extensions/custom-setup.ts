import { keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { basicSetup } from "codemirror";
import { oneDark } from "@codemirror/theme-one-dark";
import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { indentationMarkers } from "@replit/codemirror-indentation-markers";

import { editorTheme } from "./theme";
import { getLanguageExtension } from "./language-extension";
import { createMinimapExtension } from "./minimap";
import { createQuickEditExtension } from "./quick-edit";
import { createSelectionTooltipExtension } from "./selection-tooltip";
import { createSuggestionExtension } from "./suggestion";

export function createEditorExtensions(
  fileName: string,
  onChange: (content: string) => void,
): Extension[] {
  const languageExtension = getLanguageExtension(fileName);

  return [
    basicSetup,
    ...createSelectionTooltipExtension(),
    ...createQuickEditExtension(fileName),
    ...createSuggestionExtension(fileName),
    keymap.of([indentWithTab]),
    oneDark,
    editorTheme,
    ...(languageExtension ? [languageExtension] : []),
    createMinimapExtension(),
    indentationMarkers({
      hideFirstIndent: true,
      markerType: "codeOnly",
      thickness: 1,
      highlightActiveBlock: false,
    }),
    EditorView.updateListener.of(update => {
      if (!update.docChanged) {
        return;
      }

      onChange(update.state.doc.toString());
    }),
  ];
}
