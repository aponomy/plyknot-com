import { useState, useRef, useCallback } from "react";
import type { AgentMessageData } from "./AgentMessage";
import type { ToolBlockProps } from "./AgentToolBlock";
import { streamAgentChat } from "../../lib/agent-api";

interface UseAgentChatOptions {
  projectId?: string;
}

export function useAgentChat(options: UseAgentChatOptions = {}) {
  const [messages, setMessages] = useState<AgentMessageData[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    if (isStreaming) return;

    // Add user message immediately
    const userMsg: AgentMessageData = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };

    // Create placeholder assistant message
    const assistantId = `assistant-${Date.now()}`;
    const assistantMsg: AgentMessageData = {
      id: assistantId,
      role: "assistant",
      content: "",
      toolCalls: [],
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    let accumulated = "";
    const toolCalls: ToolBlockProps[] = [];
    let currentToolIdx = -1;

    try {
      for await (const frame of streamAgentChat(runId, content, options.projectId, controller.signal)) {
        switch (frame.type) {
          case "content_delta":
            accumulated += frame.delta;
            setMessages((prev) =>
              updateLastAssistant(prev, assistantId, { content: accumulated }),
            );
            break;

          case "tool_executing":
            currentToolIdx = toolCalls.length;
            toolCalls.push({
              name: frame.name,
              input: frame.input,
              status: "running",
            });
            setMessages((prev) =>
              updateLastAssistant(prev, assistantId, { toolCalls: [...toolCalls] }),
            );
            break;

          case "tool_result": {
            if (currentToolIdx >= 0 && currentToolIdx < toolCalls.length) {
              toolCalls[currentToolIdx] = {
                ...toolCalls[currentToolIdx],
                result: frame.result,
                status: frame.error ? "error" : "done",
                error: frame.error,
                durationMs: frame.duration_ms,
              };
            }
            currentToolIdx = -1;
            setMessages((prev) =>
              updateLastAssistant(prev, assistantId, { toolCalls: [...toolCalls] }),
            );
            break;
          }

          case "error":
            accumulated += accumulated ? `\n\n**Error:** ${frame.message}` : `**Error:** ${frame.message}`;
            setMessages((prev) =>
              updateLastAssistant(prev, assistantId, { content: accumulated }),
            );
            break;

          case "done":
            break;
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        accumulated += `\n\n**Error:** ${(err as Error).message}`;
        setMessages((prev) =>
          updateLastAssistant(prev, assistantId, { content: accumulated }),
        );
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [isStreaming, runId, options.projectId]);

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clear = useCallback(() => {
    setMessages([]);
    setRunId(null);
  }, []);

  return {
    messages,
    isStreaming,
    sendMessage,
    abort,
    clear,
    runId,
    setRunId,
    setMessages,
  };
}

function updateLastAssistant(
  messages: AgentMessageData[],
  id: string,
  updates: Partial<AgentMessageData>,
): AgentMessageData[] {
  return messages.map((m) =>
    m.id === id ? { ...m, ...updates } : m,
  );
}
