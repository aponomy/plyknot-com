import { useState, useRef, useEffect } from "react";
import { Send, Square } from "lucide-react";
import { cn } from "../../lib/utils";

interface AgentInputProps {
  onSend: (message: string) => void;
  onAbort?: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export function AgentInput({ onSend, onAbort, isStreaming, disabled }: AgentInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [value]);

  // Focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed || isStreaming || disabled) return;
    onSend(trimmed);
    setValue("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="border-t border-[var(--border)] px-3 py-2 shrink-0">
      {isStreaming && (
        <div className="flex items-center gap-2 mb-1.5 text-[10px] text-[var(--muted-foreground)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse" />
          Agent is working…
        </div>
      )}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask the agent…"
          rows={1}
          disabled={disabled}
          className={cn(
            "flex-1 resize-none bg-transparent text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]",
            "focus:outline-none",
            "min-h-[24px] max-h-[120px]",
            disabled && "opacity-40",
          )}
        />
        {isStreaming ? (
          <button
            onClick={onAbort}
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md bg-[var(--color-danger)] text-white hover:opacity-80 transition-opacity"
            title="Stop"
          >
            <Square size={10} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!value.trim() || disabled}
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-80 transition-opacity disabled:opacity-30"
            title="Send"
          >
            <Send size={10} />
          </button>
        )}
      </div>
    </div>
  );
}
