import { useRef, useEffect } from "react";
import { Trash2, PanelRightClose } from "lucide-react";
import { AgentMessage } from "./AgentMessage";
import { AgentInput } from "./AgentInput";
import { useAgentChat } from "./useAgentChat";

interface AgentPanelProps {
  open: boolean;
  onClose: () => void;
  projectId?: string;
  projectName?: string;
}

export function AgentPanel({ open, onClose, projectId, projectName }: AgentPanelProps) {
  const { messages, isStreaming, sendMessage, abort, clear } = useAgentChat({ projectId });
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!open) return null;

  return (
    <aside className="w-[420px] shrink-0 border-l border-[var(--border)] bg-[var(--card)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-12 border-b border-[var(--border)] shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Agent</span>
          {projectName && (
            <span className="text-xs text-[var(--muted-foreground)]">· {projectName}</span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          {messages.length > 0 && (
            <button
              onClick={clear}
              title="Clear conversation"
              className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
            >
              <Trash2 size={14} />
            </button>
          )}
          <button
            onClick={onClose}
            title="Close panel"
            className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
          >
            <PanelRightClose size={14} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3">
        {messages.length === 0 ? (
          <EmptyState projectName={projectName} onSuggestion={sendMessage} />
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {messages.map((msg) => (
              <AgentMessage key={msg.id} message={msg} />
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <AgentInput
        onSend={sendMessage}
        onAbort={abort}
        isStreaming={isStreaming}
      />
    </aside>
  );
}

function EmptyState({ projectName, onSuggestion }: { projectName?: string; onSuggestion: (msg: string) => void }) {
  const suggestions = [
    "What cracks have the highest σ-tension?",
    "Propose a hypothesis for the H₀ crack",
    "Run an extraction for MCL-1 literature",
    "Show me the convergence status of AlphaFold",
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      <div className="w-10 h-10 rounded-full bg-[var(--primary)]/10 flex items-center justify-center mb-3">
        <span className="text-lg">▲</span>
      </div>
      <p className="text-sm font-medium mb-1">Plyknot Agent</p>
      <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
        {projectName
          ? `Ask questions about ${projectName}, propose hypotheses, run extractions, or compute deltas.`
          : "Ask questions about the universe, run analyses, propose hypotheses, or explore cracks and openings."}
      </p>
      <div className="mt-4 space-y-1.5 text-left w-full">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => onSuggestion(s)}
            className="w-full text-left text-[10px] text-[var(--muted-foreground)] px-2.5 py-1.5 rounded bg-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--border)] transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
