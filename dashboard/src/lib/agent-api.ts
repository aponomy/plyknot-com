import type { AgentMessageData } from "../components/agent/AgentMessage";
import type { ToolBlockProps } from "../components/agent/AgentToolBlock";
import { hubUrl } from "./hub-api";

// SSE frame types from the hub
export type AgentFrame =
  | { type: "content_delta"; delta: string }
  | { type: "tool_executing"; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; name: string; result: unknown; duration_ms: number; error?: boolean }
  | { type: "turn_done"; turn: number; content: string }
  | { type: "error"; message: string }
  | { type: "human_required"; attention_item_id: string }
  | { type: "done" };

export async function* streamAgentChat(
  runId: string | null,
  message: string,
  projectId?: string,
  signal?: AbortSignal,
): AsyncGenerator<AgentFrame> {
  const token = localStorage.getItem("plyknot-hub-token");
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const body: Record<string, unknown> = { message };
  if (runId) body.run_id = runId;
  if (projectId) body.project_id = projectId;

  const response = await fetch(hubUrl("plyknot.com", "/agent/chat"), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "Unknown error");
    yield { type: "error", message: `${response.status}: ${text}` };
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    yield { type: "error", message: "No response body" };
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") return;
        if (!data) continue;
        try {
          yield JSON.parse(data) as AgentFrame;
        } catch {
          // skip malformed
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// Fetch messages for a completed run
export async function fetchRunMessages(runId: string): Promise<AgentMessageData[]> {
  const token = localStorage.getItem("plyknot-hub-token");
  const headers: HeadersInit = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(hubUrl("plyknot.com", `/runs/${runId}/messages`), { headers });
  if (!res.ok) return [];

  const data = await res.json();
  return (data.messages ?? []) as AgentMessageData[];
}

// Build AgentMessageData from SSE frames (used by the hook)
export function buildMessagesFromFrames(
  userMessage: string,
  frames: AgentFrame[],
): AgentMessageData[] {
  const messages: AgentMessageData[] = [
    {
      id: `user-${Date.now()}`,
      role: "user",
      content: userMessage,
      timestamp: new Date().toISOString(),
    },
  ];

  let assistantContent = "";
  const toolCalls: ToolBlockProps[] = [];
  let currentToolIdx = -1;

  for (const frame of frames) {
    switch (frame.type) {
      case "content_delta":
        assistantContent += frame.delta;
        break;
      case "tool_executing":
        currentToolIdx = toolCalls.length;
        toolCalls.push({
          name: frame.name,
          input: frame.input,
          status: "running",
        });
        break;
      case "tool_result":
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
        break;
      case "error":
        assistantContent += `\n\n**Error:** ${frame.message}`;
        break;
    }
  }

  if (assistantContent || toolCalls.length > 0) {
    messages.push({
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: assistantContent,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      timestamp: new Date().toISOString(),
    });
  }

  return messages;
}
