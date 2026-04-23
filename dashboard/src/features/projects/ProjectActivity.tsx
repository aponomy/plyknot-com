import { useState, useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { Card, CardHeader, CardTitle } from "../../components/ui/card";
import { cn } from "../../lib/utils";
import { getProjectActivity, type AuditEvent, type AuditEventType } from "../../lib/mock-data";

const typeIcon: Record<AuditEventType, string> = {
  "coupling-added": "🔗",
  "crack-opened": "⚡",
  "crack-resolved": "✓",
  "delta-computed": "Δ",
  "embargo-set": "🔒",
  "embargo-released": "🔓",
  "project-created": "📁",
  "project-status-changed": "↔",
  "hypothesis-proposed": "💡",
  "match-judged": "⚖",
  "draft-approved": "📄",
  "entity-created": "◉",
  "meta-review": "📊",
  "experiment-failed": "✕",
};

const actorBg: Record<string, string> = {
  "klas": "bg-[var(--color-accent)]",
  "judge-ensemble": "bg-[var(--color-warning)]",
  "factory": "bg-[var(--color-zinc-600)]",
  "proposer-v2": "bg-[var(--color-success)]",
  "extractor-v3": "bg-[var(--color-accent-muted)]",
  "executor": "bg-[var(--color-zinc-500)]",
  "supervisor": "bg-[var(--color-accent)]",
  "system": "bg-[var(--color-zinc-600)]",
};

export function ProjectActivity({ projectId }: { projectId: string }) {
  const events = getProjectActivity(projectId);
  const [filter, setFilter] = useState<"all" | string>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const actors = useMemo(() => [...new Set(events.map((e) => e.actor))], [events]);
  const filtered = filter === "all" ? events : events.filter((e) => e.actor === filter);

  // Group by phase
  const grouped = useMemo(() => {
    const groups: { phase: string; events: AuditEvent[] }[] = [];
    let currentPhase = "";
    for (const event of filtered) {
      const phase = event.phase ?? "General";
      if (phase !== currentPhase) {
        groups.push({ phase, events: [] });
        currentPhase = phase;
      }
      groups[groups.length - 1].events.push(event);
    }
    return groups;
  }, [filtered]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Activity</CardTitle></CardHeader>
        <p className="text-sm text-[var(--muted-foreground)]">No activity recorded yet.</p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity</CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--muted-foreground)]">{filtered.length} events</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-2 py-0.5 rounded-md bg-[var(--muted)] border border-[var(--border)] text-[10px] text-[var(--foreground)] focus:outline-none"
          >
            <option value="all">All actors</option>
            {actors.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </CardHeader>

      {grouped.map((group) => (
        <div key={group.phase} className="mb-3 last:mb-0">
          {/* Phase header */}
          <div className="flex items-center gap-2 mb-1.5">
            <div className="h-px flex-1 bg-[var(--border)]" />
            <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted-foreground)] shrink-0">
              {group.phase}
            </span>
            <div className="h-px flex-1 bg-[var(--border)]" />
          </div>

          {/* Events */}
          <div className="space-y-px">
            {group.events.map((event) => {
              const isOpen = expanded.has(event.id);
              const hasDetail = !!event.detail;
              const time = event.timestamp.split("T")[1]?.replace("Z", "") ?? "";
              const date = event.timestamp.split("T")[0].slice(5); // MM-DD

              return (
                <div key={event.id}>
                  <div
                    onClick={() => hasDetail && toggleExpand(event.id)}
                    className={cn(
                      "flex items-center gap-2 py-1.5 px-1 rounded transition-colors",
                      hasDetail && "cursor-pointer hover:bg-[var(--muted)]",
                    )}
                  >
                    {/* Avatar */}
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0",
                        actorBg[event.actor] ?? "bg-[var(--color-zinc-600)]",
                      )}
                      title={event.actor}
                    >
                      {event.actorAvatar ?? "?"}
                    </div>

                    {/* Type icon */}
                    <span className="text-xs shrink-0" title={event.type}>{typeIcon[event.type]}</span>

                    {/* Summary */}
                    <span className="text-xs flex-1 min-w-0 truncate">{event.summary}</span>

                    {/* Timestamp */}
                    <span className="text-[10px] font-mono text-[var(--muted-foreground)] shrink-0">
                      {date} {time}
                    </span>

                    {/* Expand indicator */}
                    {hasDetail && (
                      <ChevronRight
                        size={10}
                        className={cn(
                          "text-[var(--muted-foreground)] shrink-0 transition-transform",
                          isOpen && "rotate-90",
                        )}
                      />
                    )}
                  </div>

                  {/* Expanded detail */}
                  {isOpen && event.detail && (
                    <div className="ml-7 mr-1 mb-2 p-2.5 rounded-md bg-[var(--background)] border border-[var(--border)]">
                      <pre className="text-[11px] text-[var(--muted-foreground)] whitespace-pre-wrap font-sans leading-relaxed">
                        {event.detail}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </Card>
  );
}
