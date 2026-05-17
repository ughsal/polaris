import { Ollama } from "ollama";
import { NonRetriableError } from "inngest";

import { inngest } from "@/inngest/client";
import { getConvexClient } from "@/lib/convex-client";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { DEFAULT_CONVERSATION_TITLE } from "../constants";
import {
  CODING_AGENT_SYSTEM_PROMPT,
  TITLE_GENERATOR_SYSTEM_PROMPT,
} from "./constants";
import {
  CONVERSATION_AGENT_TOOLS,
  getConversationAgentTool,
} from "./tools";

const DEFAULT_OLLAMA_BASE_URL = "http://0.0.0.0:11434";
const DEFAULT_OLLAMA_MODEL = "nemotron-3-super:cloud";
const DEFAULT_TITLE_MODEL = DEFAULT_OLLAMA_MODEL;
const RECENT_MESSAGE_LIMIT = 10;
const AGENT_MAX_ITERATIONS = 12;
const MAX_TOOL_RESULT_LENGTH = 8_000;
const FALLBACK_RESPONSE =
  "I processed your request. Let me know if you need anything else.";
const FAILURE_FALLBACK =
  "Something went wrong or the request timed out. Please try again.";

type MessagePayload = {
  messageId?: string;
  conversationId?: string;
  projectId?: string;
  message?: string;
};

type StructuredResponse =
  | { type: "tool"; name: string; args?: Record<string, unknown> }
  | { type: "final"; content: string };

function getInternalKey() {
  const internalKey = process.env.POLARIS_CONVEX_INTERNAL_KEY;

  if (!internalKey) {
    throw new NonRetriableError("POLARIS_CONVEX_INTERNAL_KEY is not configured.");
  }

  return internalKey;
}

function getOllamaConfig() {
  const baseUrl = (process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL).replace(
    /\/+$/u,
    "",
  );
  const chatModel = process.env.OLLAMA_CHAT_MODEL || process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL;
  const titleModel = process.env.OLLAMA_TITLE_MODEL || chatModel || DEFAULT_TITLE_MODEL;

  return {
    baseUrl,
    chatModel,
    titleModel,
  };
}

function createOllama(signal?: AbortSignal) {
  const { baseUrl } = getOllamaConfig();
  return new Ollama({
    host: baseUrl,
    fetch: (input, init) => fetch(input, signal ? { ...init, signal } : init),
  });
}

function normalizeModelOutput(text: string) {
  return text
    .replace(/^```[\w-]*\n?/u, "")
    .replace(/\n?```$/u, "")
    .replace(/<think>[\s\S]*?<\/think>/gu, "")
    .replace(/\r/g, "")
    .trim();
}

function parseStructuredResponse(text: string): StructuredResponse | null {
  const cleaned = normalizeModelOutput(text);

  if (!cleaned) {
    return null;
  }

  try {
    const parsed = JSON.parse(cleaned) as unknown;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    const candidate = parsed as Record<string, unknown>;

    if (candidate.type === "tool") {
      const name = typeof candidate.name === "string" ? candidate.name : "";
      const args =
        candidate.args && typeof candidate.args === "object" && !Array.isArray(candidate.args)
          ? (candidate.args as Record<string, unknown>)
          : {};

      if (!name) {
        return null;
      }

      return {
        type: "tool",
        name,
        args,
      };
    }

    if (candidate.type === "final") {
      const content = typeof candidate.content === "string" ? candidate.content.trim() : "";
      return content ? { type: "final", content } : null;
    }
  } catch {
    return null;
  }

  return null;
}

function parseJsonObject(text: string) {
  const cleaned = normalizeModelOutput(text);

  if (!cleaned) {
    return null;
  }

  try {
    const parsed = JSON.parse(cleaned) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function trimForPrompt(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}\n[truncated]`;
}

function formatConversationHistory(
  messages: Array<{ role: string; content: string; status?: string }>,
) {
  return messages
    .map(message => {
      if (message.role === "assistant" && message.status === "cancelled") {
        return "assistant: Request cancelled";
      }

      return `${message.role}: ${message.content}`.trim();
    })
    .filter(Boolean)
    .join("\n");
}

function buildToolList() {
  return CONVERSATION_AGENT_TOOLS.map(
    tool => `- ${tool.name}: ${tool.description}`,
  ).join("\n");
}

function buildAgentPrompt(
  history: string,
  userMessage: string,
  toolTrace: string,
) {
  return [
    CODING_AGENT_SYSTEM_PROMPT,
    "",
    "Return valid JSON only. Use one of these shapes:",
    '{"type":"tool","name":"list-files","args":{}}',
    '{"type":"final","content":"short response"}',
    "",
    "Available tools:",
    buildToolList(),
    "",
    "Conversation history:",
    history || "(none)",
    "",
    "Current user message:",
    userMessage,
    "",
    "Tool trace:",
    toolTrace || "(none)",
  ].join("\n");
}

function buildTitlePrompt(userMessage: string, history: string) {
  return [
    TITLE_GENERATOR_SYSTEM_PROMPT,
    "",
    "Create a short title from this conversation.",
    "Return valid JSON only in this shape:",
    '{"title":"short title"}',
    "",
    "Conversation history:",
    history || "(none)",
    "",
    "Current message:",
    userMessage,
  ].join("\n");
}

async function generateStructuredResponse(
  model: string,
  prompt: string,
  signal?: AbortSignal,
) {
  const ollama = createOllama(signal);

  const generate = async (instruction: string) => {
    const response = await ollama.generate({
      model,
      prompt: instruction,
      format: "json",
      think: false,
      options: {
        temperature: 0,
      },
      stream: false,
    });

    const responseText = typeof response.response === "string" ? response.response : "";
    return parseStructuredResponse(responseText);
  };

  let parsed = await generate(prompt);

  if (!parsed) {
    parsed = await generate([
      prompt,
      "",
      "The previous output was invalid. Return only valid JSON and nothing else.",
    ].join("\n"));
  }

  return parsed;
}

async function shouldStopForCancellation(
  convex: ReturnType<typeof getConvexClient>,
  internalKey: string,
  messageId: string,
) {
  const message = await convex.query(api.system.getMessageById, {
    internalKey,
    messageId: messageId as Id<"messages">,
  });

  return message?.status === "cancelled";
}

function getEventPayload(eventData: unknown): MessagePayload {
  if (!eventData || typeof eventData !== "object") {
    return {};
  }

  const data = eventData as Record<string, unknown>;

  if (
    typeof data.messageId === "string" ||
    typeof data.conversationId === "string" ||
    typeof data.projectId === "string" ||
    typeof data.message === "string"
  ) {
    return {
      messageId: typeof data.messageId === "string" ? data.messageId : undefined,
      conversationId:
        typeof data.conversationId === "string" ? data.conversationId : undefined,
      projectId: typeof data.projectId === "string" ? data.projectId : undefined,
      message: typeof data.message === "string" ? data.message : undefined,
    };
  }

  const nestedEvent = data.event as { data?: unknown } | undefined;
  if (nestedEvent?.data && typeof nestedEvent.data === "object") {
    return getEventPayload(nestedEvent.data);
  }

  const nestedData = data.data;
  if (nestedData && typeof nestedData === "object") {
    return getEventPayload(nestedData);
  }

  return {};
}

async function resolveAssistantMessageId(args: {
  convex: ReturnType<typeof getConvexClient>;
  internalKey: string;
  payload: MessagePayload;
}) {
  if (args.payload.messageId) {
    return args.payload.messageId;
  }

  if (args.payload.projectId) {
    const processingMessages = await args.convex.query(
      api.system.getProcessingMessages,
      {
        internalKey: args.internalKey,
        projectId: args.payload.projectId as Id<"projects">,
      },
    );

    return processingMessages.at(-1)?._id ?? null;
  }

  return null;
}

async function applyConversationFailureFallback(args: {
  convex: ReturnType<typeof getConvexClient>;
  internalKey: string;
  payload: MessagePayload;
}) {
  const messageId = await resolveAssistantMessageId(args);

  if (!messageId) {
    return;
  }

  await applyFailureFallback(args.convex, args.internalKey, messageId);
}

async function loadConversationContext(args: {
  convex: ReturnType<typeof getConvexClient>;
  internalKey: string;
  payload: MessagePayload;
}) {
  const assistantMessageId =
    args.payload.messageId ??
    (args.payload.projectId
      ? (
          await args.convex.query(api.system.getProcessingMessages, {
            internalKey: args.internalKey,
            projectId: args.payload.projectId as Id<"projects">,
          })
        ).at(-1)?._id ?? null
      : null);

  if (!assistantMessageId) {
    return null;
  }

  const conversationId = args.payload.conversationId;
  const projectId = args.payload.projectId;

  if (!conversationId || !projectId) {
    return null;
  }

  const conversation = await args.convex.query(api.system.getConversationById, {
    internalKey: args.internalKey,
    conversationId: conversationId as Id<"conversations">,
  });

  if (!conversation) {
    throw new NonRetriableError("Conversation not found.");
  }

  const recentMessages = await args.convex.query(api.system.getRecentMessages, {
    internalKey: args.internalKey,
    conversationId: conversationId as Id<"conversations">,
    limit: RECENT_MESSAGE_LIMIT,
  });

  const assistantMessageIndex = recentMessages.findIndex(
    current => current._id === assistantMessageId,
  );
  const priorMessages =
    assistantMessageIndex >= 0
      ? recentMessages.slice(0, assistantMessageIndex)
      : recentMessages;
  const latestUserMessage = [...priorMessages]
    .reverse()
    .find(current => current.role === "user");

  return {
    conversation,
    conversationId: conversationId as Id<"conversations">,
    projectId: projectId as Id<"projects">,
    assistantMessageId: assistantMessageId as Id<"messages">,
    userMessage:
      args.payload.message ??
      latestUserMessage?.content ??
      "",
    recentMessages,
  };
}

async function maybeGenerateTitle(args: {
  convex: ReturnType<typeof getConvexClient>;
  internalKey: string;
  conversationId: Id<"conversations">;
  conversationTitle: string;
  userMessage: string;
  history: string;
}) {
  if (args.conversationTitle !== DEFAULT_CONVERSATION_TITLE) {
    return;
  }

  const { titleModel } = getOllamaConfig();
  const ollama = createOllama();
  const response = await ollama.generate({
    model: titleModel,
    prompt: buildTitlePrompt(args.userMessage, args.history),
    format: "json",
    think: false,
    options: {
      temperature: 0,
    },
    stream: false,
  });

  const responseText = typeof response.response === "string" ? response.response : "";
  const parsed = parseJsonObject(responseText);

  const title =
    typeof parsed?.title === "string" ? parsed.title.trim() : "";

  if (!title) {
    return;
  }

  await args.convex.mutation(api.system.updateConversationTitle, {
    internalKey: args.internalKey,
    conversationId: args.conversationId,
    title,
  });
}

async function runAgentLoop(args: {
  convex: ReturnType<typeof getConvexClient>;
  internalKey: string;
  conversationId: Id<"conversations">;
  projectId: Id<"projects">;
  userMessage: string;
  history: string;
  messageId: string;
  signal?: AbortSignal;
}) {
  const { chatModel } = getOllamaConfig();
  let toolTrace = "";
  let finalResponse = "";

  for (let iteration = 0; iteration < AGENT_MAX_ITERATIONS; iteration += 1) {
    if (await shouldStopForCancellation(args.convex, args.internalKey, args.messageId)) {
      return null;
    }

    const structured = await generateStructuredResponse(
      chatModel,
      buildAgentPrompt(args.history, args.userMessage, toolTrace),
      args.signal,
    );

    if (!structured) {
      finalResponse = FALLBACK_RESPONSE;
      break;
    }

    if (structured.type === "final") {
      finalResponse = structured.content.trim() || FALLBACK_RESPONSE;
      break;
    }

    const tool = getConversationAgentTool(structured.name);
    if (!tool) {
      toolTrace = [
        toolTrace,
        `tool:${structured.name}`,
        "result: {\"ok\":false,\"error\":\"Unknown tool.\"}",
      ]
        .filter(Boolean)
        .join("\n");
      continue;
    }

    const result = await tool.run(
      {
        internalKey: args.internalKey,
        conversationId: args.conversationId,
        projectId: args.projectId,
      },
      structured.args ?? {},
    );

    const serialized = trimForPrompt(JSON.stringify(result), MAX_TOOL_RESULT_LENGTH);
    toolTrace = [
      toolTrace,
      `tool:${structured.name}`,
      `args:${trimForPrompt(JSON.stringify(structured.args ?? {}), 2000)}`,
      `result:${serialized}`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (!finalResponse) {
    finalResponse = FALLBACK_RESPONSE;
  }

  return finalResponse;
}

async function applyFailureFallback(
  convex: ReturnType<typeof getConvexClient>,
  internalKey: string,
  messageId: string | undefined,
) {
  if (!messageId) {
    return;
  }

  const message = await convex.query(api.system.getMessageById, {
    internalKey,
    messageId: messageId as Id<"messages">,
  });

  if (!message || message.status === "cancelled") {
    return;
  }

  await convex.mutation(api.system.updateMessageContent, {
    internalKey,
    messageId: messageId as Id<"messages">,
    content: FAILURE_FALLBACK,
  });
}

export const processMessage = inngest.createFunction(
  {
    id: "conversation-process-message",
    onFailure: async ({ event, step }) => {
      const internalKey = getInternalKey();
      const payload = getEventPayload(event.data);

      const convex = getConvexClient();
      const messageId = await resolveAssistantMessageId({
        convex,
        internalKey,
        payload,
      });

      if (!messageId) {
        return;
      }

      await step.run("apply-failure-fallback", async () => {
        await applyFailureFallback(convex, internalKey, messageId);
      });
    },
  },
  { event: "message/sent" },
  async ({ event, step }) => {
    const internalKey = getInternalKey();
    const payload = getEventPayload(event.data);

    const convex = getConvexClient();

    const context = await step.run("load-conversation-context", async () => {
      return await loadConversationContext({
        convex,
        internalKey,
        payload,
      });
    });

    if (!context) {
      await step.run("mark-missing-context-fallback", async () => {
        await applyConversationFailureFallback({
          convex,
          internalKey,
          payload,
        });
      });

      return null;
    }

    const filteredMessages = context.recentMessages.filter(
      current => current._id !== context.assistantMessageId,
    );
    const userHistory = formatConversationHistory(filteredMessages);

    await step.run("maybe-generate-title", async () => {
      await maybeGenerateTitle({
        convex,
        internalKey,
        conversationId: context.conversationId,
        conversationTitle: context.conversation.title,
        userMessage: context.userMessage,
        history: userHistory,
      });
    });

    const finalResponse = await step.run("run-agent-loop", async () => {
      const response = await runAgentLoop({
        convex,
        internalKey,
        conversationId: context.conversationId,
        projectId: context.projectId,
        userMessage: context.userMessage,
        history: userHistory,
        messageId: context.assistantMessageId,
      });

      return response ?? "";
    });

    if (!finalResponse) {
      await step.run("mark-empty-response-fallback", async () => {
        await applyFailureFallback(
          convex,
          internalKey,
          context.assistantMessageId,
        );
      });

      return null;
    }

    const cancelled = await shouldStopForCancellation(
      convex,
      internalKey,
      context.assistantMessageId,
    );

    if (cancelled) {
      return null;
    }

    await step.run("complete-assistant-message", async () => {
      await convex.mutation(api.system.updateMessageContent, {
        internalKey,
        messageId: context.assistantMessageId,
        content: finalResponse,
      });
    });
  },
);
