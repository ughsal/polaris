"use client";

import { create } from "zustand";
import type { Id } from "../../../../convex/_generated/dataModel";

type ProjectLayoutStore = {
  conversationOpenByProject: Record<string, boolean>;
  toggleConversation: (projectId: Id<"projects">) => void;
  closeConversation: (projectId: Id<"projects">) => void;
};

function getProjectKey(projectId: Id<"projects">) {
  return String(projectId);
}

export const useProjectLayoutStore = create<ProjectLayoutStore>(set => ({
  conversationOpenByProject: {},
  toggleConversation: projectId => {
    const key = getProjectKey(projectId);

    set(state => ({
      conversationOpenByProject: {
        ...state.conversationOpenByProject,
        [key]: !state.conversationOpenByProject[key],
      },
    }));
  },
  closeConversation: projectId => {
    const key = getProjectKey(projectId);

    set(state => ({
      conversationOpenByProject: {
        ...state.conversationOpenByProject,
        [key]: false,
      },
    }));
  },
}));

export const useProjectConversationOpen = (projectId: Id<"projects">) => {
  return useProjectLayoutStore(
    state => state.conversationOpenByProject[getProjectKey(projectId)] ?? false,
  );
};

export const useProjectConversationActions = () => {
  const toggleConversation = useProjectLayoutStore(
    state => state.toggleConversation,
  );
  const closeConversation = useProjectLayoutStore(
    state => state.closeConversation,
  );

  return {
    toggleConversation,
    closeConversation,
  };
};
