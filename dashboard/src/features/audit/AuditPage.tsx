import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle } from "../../components/ui/card";
import { cn } from "../../lib/utils";
import { auditEvents, type AuditEventType } from "../../lib/mock-data";

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

const typeLabel: Record<AuditEventType, string> = {
  "coupling-added": "Coupling added",
  "crack-opened": "Crack opened",
  "crack-resolved": "Crack resolved",
  "delta-computed": "Delta computed",
  "embargo-set": "Embargo set",
  "embargo-released": "Embargo released",
  "project-created": "Project created",
  "project-status-changed": "Status changed",
  "hypothesis-proposed": "Hypothesis proposed",
  "match-judged": "Match judged",
  "draft-approved": "Draft approved",
  "entity-created": "Entity created",
  "meta-review": "Meta-review",
  "experiment-failed": "Experiment failed",
};

const allTypes = [...new Set(auditEvents.map((e) => e.type))];

export function AuditPage() {
  const [typeFilter, setTypeFilter] = useState<AuditEventType | "all">("all");
  const [actorFilter, setActorFilter] = useState<string>("all");

  const actors = [...new Set(auditEvents.map((e) => e.actor))];

  const filtered = auditEvents.filter((e) => {
    if (typeFilter !== "all" && e.type !== typeFilter) return false;
    if (actorFilter !== "all" && e.actor !== actorFilter) return false;
    return true;
  });

  // Group by date
  const grouped: Record<string, typeof auditEvents> = {};
  for (const event of filtered) {
    const date = event.timestamp.split("T")[0];
    (grouped[date] ??= []).push(event);
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Audit</h1>
        <span className="text-xs text-[var(--muted-foreground)]">{auditEvents.length} events</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-[var(--muted-foreground)]">Type:</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as AuditEventType | "all")}
            className="px-2 py-1 rounded-md bg-[var(--muted)] border border-[var(--border)] text-xs text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          >
            <option value="all">All types</option>
            {allTypes.map((t) => (
              <option key={t} value={t}>{typeLabel[t]}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <label className="text-xs text-[var(--muted-foreground)]">Actor:</label>
          <select
            value={actorFilter}
            onChange={(e) => setActorFilter(e.target.value)}
            className="px-2 py-1 rounded-md bg-[var(--muted)] border border-[var(--border)] text-xs text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          >
            <option value="all">All actors</option>
            {actors.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        {(typeFilter !== "all" || actorFilter !== "all") && (
          <button
            onClick={() => { setTypeFilter("all"); setActorFilter("all"); }}
            className="text-xs text-[var(--primary)] hover:underline"
          >
            Clear filters
          </button>
        )}

        <span className="ml-auto text-xs text-[var(--muted-foreground)]">
          {filtered.length} of {auditEvents.length} shown
        </span>
      </div>

      {/* Timeline grouped by date */}
      {Object.entries(grouped).map(([date, events]) => (
        <Card key={date}>
          <CardHeader>
            <CardTitle>{date}</CardTitle>
            <span className="text-xs text-[var(--muted-foreground)]">{events.length} events</span>
          </CardHeader>
          <div className="divide-y divide-[var(--border)]">
            {events.map((event) => (
              <div key={event.id} className="py-2.5 first:pt-0 last:pb-0 flex items-start gap-3">
                {/* Timeline dot + icon */}
                <div className="flex flex-col items-center shrink-0 pt-0.5">
                  <span className="text-sm">{typeIcon[event.type]}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={cn(
                      "text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded",
                      event.type.includes("embargo") ? "bg-[color:var(--color-warning)]/10 text-[var(--color-warning)]"
                        : event.type.includes("crack") ? "bg-[color:var(--color-danger)]/10 text-[var(--color-danger)]"
                        : "bg-[var(--muted)] text-[var(--muted-foreground)]",
                    )}>
                      {typeLabel[event.type]}
                    </span>
                    <span className="text-xs font-mono text-[var(--muted-foreground)]">
                      {event.timestamp.split("T")[1]?.replace("Z", "") ?? ""}
                    </span>
                    <span className="text-xs text-[var(--muted-foreground)]">by {event.actor}</span>
                  </div>
                  <p className="text-sm">{event.summary}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-[var(--muted-foreground)]">
                    {event.project && (
                      <Link
                        to={`/projects/${event.project}`}
                        className="font-mono hover:text-[var(--primary)] transition-colors"
                      >
                        {event.project}
                      </Link>
                    )}
                    {event.entity && (
                      <span className="font-mono">{event.entity}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}

      {filtered.length === 0 && (
        <Card>
          <div className="py-12 text-center">
            <p className="text-sm text-[var(--muted-foreground)]">No events match the current filters.</p>
          </div>
        </Card>
      )}
    </div>
  );
}
