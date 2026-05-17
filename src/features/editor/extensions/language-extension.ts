import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { python } from "@codemirror/lang-python";
import type { Extension } from "@codemirror/state";
import { css } from "@codemirror/lang-css";

function getExtensionName(fileName: string) {
  const lastDot = fileName.lastIndexOf(".");

  if (lastDot === -1) {
    return "";
  }

  return fileName.slice(lastDot + 1).toLowerCase();
}

export function getLanguageExtension(fileName: string): Extension | null {
  const extension = getExtensionName(fileName);

  switch (extension) {
    case "js":
      return javascript();
    case "jsx":
      return javascript({ jsx: true });
    case "ts":
      return javascript({ typescript: true });
    case "tsx":
      return javascript({ typescript: true, jsx: true });
    case "html":
      return html();
    case "css":
      return css();
    case "json":
      return json();
    case "md":
    case "mdx":
      return markdown({
        defaultCodeLanguage: javascript({
          typescript: true,
          jsx: true,
        }),
      });
    case "py":
      return python();
    default:
      return null;
  }
}
