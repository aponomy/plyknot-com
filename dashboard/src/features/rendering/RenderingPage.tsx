import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle } from "../../components/ui/card";
import { KpiCard } from "../../components/ui/kpi-card";
import { cn } from "../../lib/utils";
import {
  renderingDrafts,
  validatorLog,
  type RenderingStatus,
  type RenderingDraft,
} from "../../lib/mock-data";

const statusLabel: Record<RenderingStatus, string> = {
  "pass-1": "Pass 1",
  "pass-2": "Pass 2",
  "validating": "Validating",
  "approved": "Approved",
  "revision-requested": "Revision requested",
  "rejected": "Rejected",
};

const statusColor: Record<RenderingStatus, string> = {
  "pass-1": "bg-[var(--muted)] text-[var(--muted-foreground)]",
  "pass-2": "bg-[color:var(--color-accent)]/10 text-[var(--color-accent)]",
  "validating": "bg-[color:var(--color-warning)]/10 text-[var(--color-warning)]",
  "approved": "bg-[color:var(--color-success)]/10 text-[var(--color-success)]",
  "revision-requested": "bg-[color:var(--color-danger)]/10 text-[var(--color-danger)]",
  "rejected": "bg-[color:var(--color-danger)]/10 text-[var(--color-danger)]",
};

const kindLabel: Record<RenderingDraft["kind"], string> = {
  satellite: "Satellite",
  "audit-report": "Audit report",
  alert: "Alert",
};

const levelIcon: Record<string, string> = {
  error: "✕",
  warning: "⚠",
  info: "ℹ",
};

const levelColor: Record<string, string> = {
  error: "text-[var(--color-danger)]",
  warning: "text-[var(--color-warning)]",
  info: "text-[var(--muted-foreground)]",
};

type FilterStatus = "all" | "needs-review" | "in-progress" | "done";

export function RenderingPage() {
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [selectedDraft, setSelectedDraft] = useState<string | null>(null);

  const filtered = renderingDrafts.filter((d) => {
    if (filter === "all") return true;
    if (filter === "needs-review") return d.status === "pass-2" || d.status === "validating";
    if (filter === "in-progress") return d.status === "pass-1";
    if (filter === "done") return d.status === "approved" || d.status === "rejected" || d.status === "revision-requested";
    return true;
  });

  const draftLogs = selectedDraft
    ? validatorLog.filter((v) => v.draftId === selectedDraft)
    : validatorLog;

  const approvedCount = renderingDrafts.filter((d) => d.status === "approved").length;
  const pendingCount = renderingDrafts.filter((d) => d.status !== "approved" && d.status !== "rejected").length;
  const totalIssues = validatorLog.filter((v) => v.level === "error").length;
  const totalWarnings = validatorLog.filter((v) => v.level === "warning").length;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Rendering</h1>
        <span className="text-xs text-[var(--muted-foreground)]">{renderingDrafts.length} drafts</span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard title="Approved" value={approvedCount} />
        <KpiCard title="Pending" value={pendingCount} delta={pendingCount > 0 ? "awaiting review" : ""} />
        <KpiCard title="Validator errors" value={totalIssues} trend={totalIssues > 0 ? "up" : undefined} delta={totalIssues > 0 ? "needs fix" : ""} />
        <KpiCard title="Warnings" value={totalWarnings} />
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 text-xs">
        {(["all", "needs-review", "in-progress", "done"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1.5 rounded-md transition-colors",
              filter === f
                ? "bg-[var(--muted)] text-[var(--foreground)]"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
            )}
          >
            {f === "all" ? "All" : f === "needs-review" ? "Needs review" : f === "in-progress" ? "In progress" : "Done"}
          </button>
        ))}
      </div>

      {/* Drafts table */}
      <Card>
        <CardHeader>
          <CardTitle>Drafts</CardTitle>
        </CardHeader>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-[var(--muted-foreground)] border-b border-[var(--border)]">
              <th className="text-left py-2 font-medium">Title</th>
              <th className="text-left py-2 font-medium">Kind</th>
              <th className="text-left py-2 font-medium">Project</th>
              <th className="text-center py-2 font-medium">Status</th>
              <th className="text-center py-2 font-medium">Words</th>
              <th className="text-center py-2 font-medium">Issues</th>
              <th className="text-right py-2 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {filtered.map((d) => (
              <tr
                key={d.id}
                onClick={() => setSelectedDraft(selectedDraft === d.id ? null : d.id)}
                className={cn(
                  "cursor-pointer transition-colors",
                  selectedDraft === d.id
                    ? "bg-[var(--primary)]/5"
                    : "hover:bg-[var(--muted)]",
                )}
              >
                <td className="py-2.5 max-w-[200px] truncate">{d.title}</td>
                <td className="py-2.5 text-xs text-[var(--muted-foreground)]">{kindLabel[d.kind]}</td>
                <td className="py-2.5">
                  <Link
                    to={`/projects/${d.project}`}
                    className="text-xs font-mono text-[var(--muted-foreground)] hover:text-[var(--primary)]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {d.project}
                  </Link>
                </td>
                <td className="py-2.5 text-center">
                  <span className={cn("text-xs px-1.5 py-0.5 rounded", statusColor[d.status])}>
                    {statusLabel[d.status]}
                  </span>
                </td>
                <td className="py-2.5 text-center font-mono text-xs">{d.wordCount.toLocaleString()}</td>
                <td className="py-2.5 text-center">
                  {d.validatorIssues > 0 ? (
                    <span className="text-xs font-mono text-[var(--color-danger)]">{d.validatorIssues} ✕</span>
                  ) : d.validatorWarnings > 0 ? (
                    <span className="text-xs font-mono text-[var(--color-warning)]">{d.validatorWarnings} ⚠</span>
                  ) : (
                    <span className="text-xs text-[var(--color-success)]">✓</span>
                  )}
                </td>
                <td className="py-2.5 text-right text-xs text-[var(--muted-foreground)]">
                  {d.lastUpdated.split("T")[0]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="py-6 text-center text-sm text-[var(--muted-foreground)]">No drafts match this filter.</p>
        )}
      </Card>

      {/* Validator log */}
      <Card>
        <CardHeader>
          <CardTitle>
            Validator log
            {selectedDraft && (
              <span className="ml-2 text-xs font-normal text-[var(--muted-foreground)]">
                — filtered to {renderingDrafts.find((d) => d.id === selectedDraft)?.title}
                <button
                  onClick={() => setSelectedDraft(null)}
                  className="ml-1 text-[var(--primary)] hover:underline"
                >
                  ✕
                </button>
              </span>
            )}
          </CardTitle>
          <span className="text-xs text-[var(--muted-foreground)]">{draftLogs.length} entries</span>
        </CardHeader>
        {draftLogs.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">No validator entries{selectedDraft ? " for this draft" : ""}.</p>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {draftLogs.map((entry, i) => (
              <div key={i} className="py-2.5 first:pt-0 last:pb-0">
                <div className="flex items-center gap-2">
                  <span className={cn("text-sm", levelColor[entry.level])}>{levelIcon[entry.level]}</span>
                  <span className={cn("text-xs font-medium uppercase tracking-wider px-1.5 py-0.5 rounded", levelColor[entry.level])}>
                    {entry.level}
                  </span>
                  <span className="text-xs font-mono text-[var(--muted-foreground)]">{entry.rule}</span>
                  {entry.location && (
                    <span className="text-xs text-[var(--muted-foreground)]">@ {entry.location}</span>
                  )}
                </div>
                <p className="text-sm mt-0.5 ml-6">{entry.message}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
