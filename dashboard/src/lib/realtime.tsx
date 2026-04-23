import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// --- Event types ---

export type StreamEventType =
  | "coupling-added"
  | "match-judged"
  | "hypothesis-proposed"
  | "delta-computed"
  | "project-updated"
  | "embargo-set"
  | "draft-rendered"
  | "trust-updated"
  | "crack-detected"
  | "entity-created"
  | "extraction-progress";

export interface StreamEvent {
  type: StreamEventType;
  projectId?: string;
  entityId?: number;
  timestamp: string;
  summary: string;
  data?: Record<string, unknown>;
}

// --- Connection state ---

export type ConnectionStatus = "connected" | "connecting" | "disconnected";

interface RealtimeContext {
  status: ConnectionStatus;
  statusCode: number | null;
  statusMessage: string;
  events: StreamEvent[];
  lastEvent: StreamEvent | null;
}

const RealtimeCtx = createContext<RealtimeContext>({
  status: "disconnected",
  statusCode: null,
  statusMessage: "",
  events: [],
  lastEvent: null,
});

export function useRealtime() {
  return useContext(RealtimeCtx);
}

// --- SSE reader (adapted from knowing-app sseReader.ts) ---

async function readSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onEvent: (event: StreamEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  const decoder = new TextDecoder();
  let buffer = "";

  while (!signal.aborted) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      // Heartbeat
      if (line.startsWith(":")) continue;
      // SSE data line
      if (!line.startsWith("data: ")) continue;

      const data = line.slice(6).trim();
      if (data === "[DONE]") return;

      try {
        const event = JSON.parse(data) as StreamEvent;
        onEvent(event);
      } catch {
        // Skip malformed events
      }
    }
  }
}

// --- Query key mapping ---

const EVENT_TO_QUERY_KEYS: Record<StreamEventType, string[][]> = {
  "coupling-added": [["stats"], ["heatmap"], ["couplings"], ["cracks"]],
  "match-judged": [["stats"]],
  "hypothesis-proposed": [],
  "delta-computed": [["stats"], ["heatmap"]],
  "project-updated": [],
  "embargo-set": [],
  "draft-rendered": [],
  "trust-updated": [],
  "crack-detected": [["stats"], ["heatmap"], ["cracks"]],
  "entity-created": [["stats"]],
  "extraction-progress": [],
};

const HIGH_PRIORITY_EVENTS: StreamEventType[] = [
  "crack-detected",
  "trust-updated",
];

// --- Provider ---

const SSE_URL = import.meta.env.DEV ? "/api/stream" : "https://hub.plyknot.com/v1/stream";
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30000;
const MAX_EVENTS = 200;

interface RealtimeProviderProps {
  children: ReactNode;
  enabled?: boolean;
}

export function RealtimeProvider({ children, enabled = true }: RealtimeProviderProps) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [lastEvent, setLastEvent] = useState<StreamEvent | null>(null);
  const queryClient = useQueryClient();
  const abortRef = useRef<AbortController | null>(null);
  const retriesRef = useRef(0);

  const handleEvent = useCallback((event: StreamEvent) => {
    // Store event
    setEvents((prev) => [event, ...prev].slice(0, MAX_EVENTS));
    setLastEvent(event);

    // Invalidate relevant queries
    const keys = EVENT_TO_QUERY_KEYS[event.type] ?? [];
    for (const key of keys) {
      queryClient.invalidateQueries({ queryKey: key });
    }

    // Toast for high-priority events
    if (HIGH_PRIORITY_EVENTS.includes(event.type)) {
      toast(event.summary, { description: event.type.replace(/-/g, " ") });
    }
  }, [queryClient]);

  const connect = useCallback(async () => {
    if (!enabled) return;

    const abort = new AbortController();
    abortRef.current = abort;
    setStatus("connecting");

    try {
      const token = localStorage.getItem("plyknot-hub-token");
      if (!token) {
        setStatus("disconnected");
        setStatusCode(401);
        setStatusMessage("No API key. Sign in to hub.plyknot.com to connect.");
        return; // Don't retry — user needs to authenticate first
      }

      const headers: HeadersInit = {
        Accept: "text/event-stream",
        Authorization: `Bearer ${token}`,
      };

      const response = await fetch(SSE_URL, {
        headers,
        signal: abort.signal,
      });

      if (!response.ok || !response.body) {
        setStatusCode(response.status);
        if (response.status === 401 || response.status === 403) {
          setStatus("disconnected");
          setStatusMessage(response.status === 401 ? "Unauthorized. API key may be invalid." : "Access denied. Check org membership.");
          return; // Don't retry auth errors
        }
        throw new Error(`${response.status}`);
      }

      setStatus("connected");
      setStatusCode(null);
      setStatusMessage("");
      retriesRef.current = 0;

      const reader = response.body.getReader();
      await readSSEStream(reader, handleEvent, abort.signal);
    } catch (err) {
      if (abort.signal.aborted) return;
      setStatusMessage("Connection lost. Reconnecting…");
    } finally {
      if (!abort.signal.aborted && status !== "disconnected") {
        setStatus("disconnected");
        // Exponential backoff reconnect (only for non-auth errors)
        const delay = Math.min(
          RECONNECT_BASE_MS * Math.pow(2, retriesRef.current),
          RECONNECT_MAX_MS,
        );
        retriesRef.current++;
        setTimeout(() => connect(), delay);
      }
    }
  }, [enabled, handleEvent]);

  useEffect(() => {
    connect();
    return () => {
      abortRef.current?.abort();
    };
  }, [connect]);

  return (
    <RealtimeCtx.Provider value={{ status, statusCode, statusMessage, events, lastEvent }}>
      {children}
    </RealtimeCtx.Provider>
  );
}
