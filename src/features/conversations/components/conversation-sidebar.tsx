"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  Clock3,
  Copy,
  History,
  Loader2,
  MessageSquarePlus,
  Send,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

import { DEFAULT_CONVERSATION_TITLE } from "../constants";
import {
  useConversation,
  useConversations,
  useCreateConversation,
  useMessages,
} from "../hooks/use-conversations";
import { PastConversationsDialog } from "./past-conversations-dialog";

interface ConversationSidebarProps {
  projectId: Id<"projects">;
}

function formatProcessingLabel(isProcessing: boolean) {
  return isProcessing ? "Streaming" : "Send";
}

export function ConversationSidebar({ projectId }: ConversationSidebarProps) {
  const [selectedConversationId, setSelectedConversationId] = useState<
    Id<"conversations"> | null
  >(null);
  const [input, setInput] = useState("");
  const [pastConversationsOpen, setPastConversationsOpen] = useState(false);
  const conversations = useConversations(projectId);
  const createConversation = useCreateConversation();
  const activeConversationId =
    selectedConversationId ?? conversations?.[0]?._id ?? null;
  const activeConversation = useConversation(activeConversationId);
  const messages = useMessages(activeConversationId);
  const endRef = useRef<HTMLDivElement | null>(null);

  const isProcessing =
    messages?.some(message => message.status === "processing") ?? false;

  const assistantMessageIndex = useMemo(() => {
    if (!messages?.length) {
      return -1;
    }

    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (
        messages[index]?.role === "assistant" &&
        messages[index]?.status === "completed"
      ) {
        return index;
      }
    }

    return -1;
  }, [messages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages?.length, isProcessing]);

  const handleCreateConversation = async () => {
    try {
      const conversationId = await createConversation({
        projectId,
        title: DEFAULT_CONVERSATION_TITLE,
      });

      setSelectedConversationId(conversationId);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to create conversation.",
      );
    }
  };

  const handleCancel = async () => {
    try {
      const response = await fetch("/api/messages/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ projectId }),
      });

      const json = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          json && typeof json === "object" && "error" in json && typeof json.error === "string"
            ? json.error
            : "Unable to cancel message.";
        throw new Error(message);
      }

      if (process.env.NODE_ENV !== "production") {
        console.debug("[conversation-sidebar] cancelled messages", json);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to cancel message.");
    }
  };

  const handleSubmit = async () => {
    const trimmedMessage = input.trim();

    if (isProcessing && !trimmedMessage) {
      await handleCancel();
      setInput("");
      return;
    }

    if (!trimmedMessage) {
      return;
    }

    let conversationId = activeConversationId;

    if (!conversationId) {
      try {
        conversationId = await createConversation({
          projectId,
          title: DEFAULT_CONVERSATION_TITLE,
        });
        setSelectedConversationId(conversationId);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Unable to create conversation.",
        );
        return;
      }
    }

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId,
          message: trimmedMessage,
        }),
      });

      const json = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          json && typeof json === "object" && "error" in json && typeof json.error === "string"
            ? json.error
            : "Unable to send message.";
        throw new Error(message);
      }

      setInput("");
      setSelectedConversationId(conversationId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to send message.");
    }
  };

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Copied response.");
    } catch {
      toast.error("Unable to copy response.");
    }
  };

  const handleInputKeyDown = async (
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
      return;
    }

    event.preventDefault();
    await handleSubmit();
  };

  return (
    <aside className="flex h-full min-h-0 flex-col bg-muted/25 text-foreground">
      <PastConversationsDialog
        projectId={projectId}
        open={pastConversationsOpen}
        onOpenChange={setPastConversationsOpen}
        onSelect={conversationId => setSelectedConversationId(conversationId)}
      />

      <div className="flex h-9 items-center justify-between gap-2 border-b border-border/60 px-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {activeConversation?.title ?? DEFAULT_CONVERSATION_TITLE}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setPastConversationsOpen(true)}
            aria-label="Conversation history"
          >
            <History className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => void handleCreateConversation()}
            aria-label="New conversation"
          >
            <Plus className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex min-h-full flex-col gap-3 px-3 py-3">
            {!messages?.length ? (
              <div className="flex flex-1 items-center justify-center px-4 text-center">
                <div className="space-y-2">
                  <div className="mx-auto flex size-11 items-center justify-center rounded-full border border-border/60 bg-background">
                    <MessageSquarePlus className="size-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    Start a conversation
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Messages will appear here once you send one.
                  </p>
                </div>
              </div>
            ) : null}

            {messages?.map((message, index) => {
              const isLatestCompletedAssistant =
                index === assistantMessageIndex &&
                message.role === "assistant" &&
                message.status === "completed";

              return (
                <article
                  key={message._id}
                  className={cn(
                    "group flex flex-col gap-2 rounded-2xl border px-3 py-3 text-sm shadow-sm",
                    message.role === "user"
                      ? "ml-8 border-border/60 bg-background"
                      : "mr-8 border-border/60 bg-muted/40",
                    message.status === "cancelled" && "opacity-75",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {message.role === "user" ? "You" : "Assistant"}
                    </p>

                    {isLatestCompletedAssistant ? (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={() => void handleCopy(message.content)}
                        aria-label="Copy assistant response"
                      >
                        <Copy className="size-3.5" />
                      </Button>
                    ) : null}
                  </div>

                  {message.role === "assistant" && message.status === "processing" ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Spinner className="size-4" />
                      <span className="text-sm font-medium">Thinking</span>
                    </div>
                  ) : message.role === "assistant" && message.status === "cancelled" ? (
                    <p className="italic text-muted-foreground">Request cancelled</p>
                  ) : (
                    <p className="whitespace-pre-wrap break-words leading-6 text-foreground">
                      {message.content || (message.role === "assistant" ? "Thinking" : "")}
                    </p>
                  )}
                </article>
              );
            })}

            <div ref={endRef} />
          </div>
        </ScrollArea>

        <div className="border-t border-border/60 bg-background/70 p-3 backdrop-blur">
          <div className="space-y-2 rounded-2xl border border-border/60 bg-background px-3 py-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Prompt
              </p>
              <Button
                variant="ghost"
                size="xs"
                className="h-6 gap-1 px-2 text-[11px]"
                onClick={() => setPastConversationsOpen(true)}
              >
                <Clock3 className="size-3.5" />
                History
              </Button>
            </div>

            <Textarea
              value={input}
              onChange={event => setInput(event.target.value)}
              onKeyDown={event => void handleInputKeyDown(event)}
              placeholder="Ask the conversation..."
              className="min-h-24 resize-none border-0 bg-muted/30 text-sm shadow-none focus-visible:ring-0"
              disabled={isProcessing}
            />

            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {isProcessing
                  ? "Assistant is processing your message."
                  : "Press Enter to send, Shift+Enter for a new line."}
              </p>

              <div className="flex items-center gap-2">
                {isProcessing ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleCancel()}
                    type="button"
                  >
                    Cancel
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  onClick={() => void handleSubmit()}
                  disabled={!isProcessing && !input.trim()}
                  type="button"
                >
                  {isProcessing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  {formatProcessingLabel(isProcessing)}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
