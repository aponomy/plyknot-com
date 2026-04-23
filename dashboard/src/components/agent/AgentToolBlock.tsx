import { useState } from "react";
import { ChevronRight, Check, X, Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";

export interface ToolBlockProps {
  name: string;
  input?: Record<string, unknown>;
  result?: unknown;
  error?: boolean;
  status: "running" | "done" | "error";
  durationMs?: number;
}

export function AgentToolBlock({ name, input, result, error, status, durationMs }: ToolBlockProps) {
  const [expanded, setExpanded] = useState(status === "running");

  const duration = durationMs != null ? (durationMs / 1000).toFixed(1) : null;

  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--background)] my-1.5 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs hover:bg-[var(--muted)] transition-colors"
      >
        <ChevronRight
          size={10}
          className={cn("text-[var(--muted-foreground)] shrink-0 transition-transform", expanded && "rotate-90")}
        />
        <span className="font-mono text-[var(--muted-foreground)]">{name}</span>
        <span className="ml-auto flex items-center gap-1.5">
          {status === "running" && (
            <Loader2 size={10} className="animate-spin text-[var(--primary)]" />
          )}
          {status === "done" && !error && (
            <Check size={10} className="text-[var(--color-success)]" />
          )}
          {(status === "error" || error) && (
            <X size={10} className="text-[var(--color-danger)]" />
          )}
          {duration && (
            <span className="text-[var(--muted-foreground)]">{duration}s</span>
          )}
        </span>
      </button>

      {/* Content */}
      {expanded && (
        <div className="px-2.5 pb-2 border-t border-[var(--border)]">
          {input && Object.keys(input).length > 0 && (
            <div className="mt-1.5">
              <p className="text-[10px] text-[var(--muted-foreground)] mb-0.5">Input</p>
              <pre className="text-[10px] font-mono text-[var(--muted-foreground)] whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
                {formatJson(input)}
              </pre>
            </div>
          )}
          {result != null && (
            <div className="mt-1.5">
              <p className="text-[10px] text-[var(--muted-foreground)] mb-0.5">Result</p>
              <pre className={cn(
                "text-[10px] font-mono whitespace-pre-wrap break-all max-h-48 overflow-y-auto",
                error ? "text-[var(--color-danger)]" : "text-[var(--muted-foreground)]",
              )}>
                {typeof result === "string" ? result : formatJson(result)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatJson(obj: unknown): string {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}
