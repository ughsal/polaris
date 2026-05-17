"use client";

import { create } from "zustand";
import type { Id } from "../../../../convex/_generated/dataModel";

export interface TabState {
  openTabs: Id<"files">[];
  activeTabId: Id<"files"> | null;
  previewTabId: Id<"files"> | null;
}

interface EditorStoreState {
  tabs: Map<Id<"projects">, TabState>;
  getTabState: (projectId: Id<"projects">) => TabState;
  openFile: (
    projectId: Id<"projects">,
    fileId: Id<"files">,
    options: { pinned: boolean },
  ) => void;
  closeTab: (projectId: Id<"projects">, fileId: Id<"files">) => void;
  closeAllTabs: (projectId: Id<"projects">) => void;
  setActiveTab: (projectId: Id<"projects">, fileId: Id<"files">) => void;
}

export const EMPTY_TAB_STATE: TabState = {
  openTabs: [],
  activeTabId: null,
  previewTabId: null,
};

function cloneTabState(tabState?: TabState) {
  return {
    openTabs: [...(tabState?.openTabs ?? [])],
    activeTabId: tabState?.activeTabId ?? null,
    previewTabId: tabState?.previewTabId ?? null,
  };
}

function getNextActiveTab(openTabs: Id<"files">[], closedIndex: number) {
  if (openTabs.length === 0) {
    return null;
  }

  return openTabs[Math.min(closedIndex, openTabs.length - 1)] ?? null;
}

export const useEditorStore = create<EditorStoreState>((set, get) => ({
  tabs: new Map(),
  getTabState: projectId => {
    return cloneTabState(get().tabs.get(projectId));
  },
  openFile: (projectId, fileId, options) => {
    set(state => {
      const tabs = new Map(state.tabs);
      const current = cloneTabState(tabs.get(projectId));
      const openTabs = [...current.openTabs];
      const alreadyOpenIndex = openTabs.indexOf(fileId);
      const previewIndex = current.previewTabId
        ? openTabs.indexOf(current.previewTabId)
        : -1;

      if (options.pinned) {
        if (alreadyOpenIndex === -1) {
          openTabs.push(fileId);
        }

        tabs.set(projectId, {
          openTabs,
          activeTabId: fileId,
          previewTabId:
            current.previewTabId === fileId ? null : current.previewTabId,
        });

        return { tabs };
      }

      if (alreadyOpenIndex !== -1) {
        tabs.set(projectId, {
          openTabs,
          activeTabId: fileId,
          previewTabId: current.previewTabId,
        });

        return { tabs };
      }

      const nextOpenTabs =
        previewIndex === -1 || current.previewTabId === fileId
          ? [...openTabs, fileId]
          : [
              ...openTabs.filter(tabId => tabId !== current.previewTabId),
              fileId,
            ];

      tabs.set(projectId, {
        openTabs: nextOpenTabs,
        activeTabId: fileId,
        previewTabId: fileId,
      });

      return { tabs };
    });
  },
  closeTab: (projectId, fileId) => {
    set(state => {
      const current = state.tabs.get(projectId);

      if (!current) {
        return state;
      }

      const closedIndex = current.openTabs.indexOf(fileId);

      if (closedIndex === -1) {
        return state;
      }

      const openTabs = current.openTabs.filter(tabId => tabId !== fileId);
      const activeTabId =
        current.activeTabId === fileId
          ? getNextActiveTab(openTabs, closedIndex)
          : current.activeTabId;
      const previewTabId =
        current.previewTabId === fileId ? null : current.previewTabId;

      const tabs = new Map(state.tabs);

      if (openTabs.length === 0) {
        tabs.delete(projectId);
      } else {
        tabs.set(projectId, {
          openTabs,
          activeTabId,
          previewTabId,
        });
      }

      return { tabs };
    });
  },
  closeAllTabs: projectId => {
    set(state => {
      const tabs = new Map(state.tabs);
      tabs.delete(projectId);
      return { tabs };
    });
  },
  setActiveTab: (projectId, fileId) => {
    set(state => {
      const tabs = new Map(state.tabs);
      const current = cloneTabState(tabs.get(projectId));

      if (!current.openTabs.includes(fileId)) {
        current.openTabs.push(fileId);
      }

      current.activeTabId = fileId;
      tabs.set(projectId, current);

      return { tabs };
    });
  },
}));
