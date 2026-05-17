"use client";

import { formatDistanceToNow } from "date-fns";
import type { Id } from "../../../../convex/_generated/dataModel";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import { useConversations } from "../hooks/use-conversations";

interface PastConversationsDialogProps {
  projectId: Id<"projects">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (conversationId: Id<"conversations">) => void;
}

function formatConversationTime(timestamp: number) {
  return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
}

export function PastConversationsDialog({
  projectId,
  open,
  onOpenChange,
  onSelect,
}: PastConversationsDialogProps) {
  const conversations = useConversations(projectId);

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Past conversations"
      description="Search and select a past conversation"
      className="max-w-2xl"
    >
      <CommandInput placeholder="Search for conversations" />
      <CommandList>
        <CommandEmpty>No conversations found</CommandEmpty>
        <CommandGroup heading="Conversations">
          {conversations?.map(conversation => (
            <CommandItem
              key={conversation._id}
              value={`${conversation.title} ${conversation._id}`}
              onSelect={() => {
                onSelect(conversation._id);
                onOpenChange(false);
              }}
              className="flex items-center justify-between gap-3"
            >
              <span className="min-w-0 flex-1 truncate">{conversation.title}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatConversationTime(conversation._creationTime)}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
