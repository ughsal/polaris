import type { Extension } from "@codemirror/state";
import { showMinimap } from "@replit/codemirror-minimap";

export function createMinimapExtension(): Extension {
  return showMinimap.compute(["doc"], () => ({
    create: () => {
      const dom = document.createElement("div");
      dom.className = "cm-minimap-container";
      dom.setAttribute("aria-hidden", "true");
      dom.style.height = "100%";
      return { dom };
    },
    displayText: "blocks",
    showOverlay: "mouse-over",
  }));
}
