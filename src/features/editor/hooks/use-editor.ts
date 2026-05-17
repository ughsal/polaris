"use client";

import { useCallback } from "react";
import type { Id } from "../../../../convex/_generated/dataModel";

import { EMPTY_TAB_STATE, useEditorStore } from "../store/use-editor-store";

export const useEditor = (projectId: Id<"projects">) => {
  const tabState = useEditorStore(
    state => state.tabs.get(projectId) ?? EMPTY_TAB_STATE,
  );
  const openFileAction = useEditorStore(state => state.openFile);
  const closeTabAction = useEditorStore(state => state.closeTab);
  const closeAllTabsAction = useEditorStore(state => state.closeAllTabs);
  const setActiveTabAction = useEditorStore(state => state.setActiveTab);

  const openFile = useCallback(
    (fileId: Id<"files">, options: { pinned: boolean }) => {
      openFileAction(projectId, fileId, options);
    },
    [openFileAction, projectId],
  );

  const closeTab = useCallback(
    (fileId: Id<"files">) => {
      closeTabAction(projectId, fileId);
    },
    [closeTabAction, projectId],
  );

  const closeAllTabs = useCallback(() => {
    closeAllTabsAction(projectId);
  }, [closeAllTabsAction, projectId]);

  const setActiveTab = useCallback(
    (fileId: Id<"files">) => {
      setActiveTabAction(projectId, fileId);
    },
    [projectId, setActiveTabAction],
  );

  return {
    ...tabState,
    openFile,
    closeTab,
    closeAllTabs,
    setActiveTab,
  };
};
