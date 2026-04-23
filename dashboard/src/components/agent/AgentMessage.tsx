import { cn } from "../../lib/utils";
import { AgentMarkdown } from "./AgentMarkdown";
import { AgentToolBlock, type ToolBlockProps } from "./AgentToolBlock";

export interface AgentMessageData {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  toolCalls?: ToolBlockProps[];
  timestamp?: string;
}

const roleColor: Record<string, string> = {
  user: "bg-[var(--primary)]",
  assistant: "bg-[var(--color-accent-muted)]",
  system: "bg-[var(--muted)]",
};

const roleLabel: Record<string, string> = {
  user: "You",
  assistant: "Agent",
  system: "System",
};

export function AgentMessage({ message }: { message: AgentMessageData }) {
  const initials = message.role === "user" ? "KE" : message.role === "assistant" ? "AI" : "SY";

  return (
    <div className={cn("flex gap-2.5 py-2", message.role === "system" && "opacity-60")}>
      {/* Avatar */}
      <div
        className={cn(
          "w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-medium text-white shrink-0 mt-0.5",
          roleColor[message.role],
        )}
      >
        {initials}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Role + timestamp */}
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] font-medium text-[var(--foreground)]">
            {roleLabel[message.role]}
          </span>
          {message.timestamp && (
            <span className="text-[10px] text-[var(--muted-foreground)]">
              {formatTime(message.timestamp)}
            </span>
          )}
        </div>

        {/* Text content */}
        {message.content && (
          <div className="text-xs text-[var(--foreground)] leading-relaxed">
            {message.role === "assistant" ? (
              <AgentMarkdown content={message.content} />
            ) : (
              <p className="whitespace-pre-wrap">{message.content}</p>
            )}
          </div>
        )}

        {/* Tool calls */}
        {message.toolCalls?.map((tc, i) => (
          <AgentToolBlock key={i} {...tc} />
        ))}
      </div>
    </div>
  );
}

function formatTime(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return ts;
  }
}
