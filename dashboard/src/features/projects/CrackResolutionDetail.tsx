import { Card, CardHeader, CardTitle } from "../../components/ui/card";
import type { Project } from "../../lib/mock-data";

export function CrackResolutionDetail({ project: p }: { project: Project }) {
  const pct = p.budget_usd > 0 ? Math.round((p.spent_usd / p.budget_usd) * 100) : 0;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
          <StatusBadge status={p.status} />
        </CardHeader>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <Field label="Kind" value="crack-resolution" />
          <Field label="Scope" value={p.description} />
          <Field label="Budget" value={`$${p.spent_usd} / $${p.budget_usd} (${pct}%)`} mono />
          <Field label="Started" value={p.created_at} />
        </div>
        <div className="mt-4">
          <div className="w-full h-2 bg-[var(--muted)] rounded-full overflow-hidden">
            <div className="h-full bg-[var(--primary)] rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <ActionButton label={p.status === "active" ? "pause" : "resume"} />
          <ActionButton label="allocate budget" />
          <ActionButton label="export deltas" />
          <ActionButton label={p.archived ? "unarchive" : "archive"} />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hypothesis tree</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <Field label="Total hypotheses" value={String(p.hypotheses ?? 0)} mono />
          <Field label="In active tree" value={String(p.hypotheses_in_tree ?? 0)} mono />
          <Field label="Elo range" value={p.elo_range ?? "—"} mono />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Crack IDs</CardTitle>
        </CardHeader>
        <div className="flex flex-wrap gap-2">
          {(p.crack_ids ?? []).map((id) => (
            <span key={id} className="text-xs font-mono px-2 py-1 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">
              {id}
            </span>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent deltas</CardTitle>
        </CardHeader>
        <p className="text-sm text-[var(--muted-foreground)]">
          Last activity: {p.last_activity}
        </p>
      </Card>
    </>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
      <p className={mono ? "font-mono" : ""}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = status === "active"
    ? "bg-[color:var(--color-success)]/10 text-[var(--color-success)]"
    : status === "paused"
    ? "bg-[color:var(--color-warning)]/10 text-[var(--color-warning)]"
    : "bg-[var(--muted)] text-[var(--muted-foreground)]";
  return <span className={`text-xs px-1.5 py-0.5 rounded ${color}`}>{status}</span>;
}

function ActionButton({ label }: { label: string }) {
  return (
    <button className="text-xs px-3 py-1.5 rounded-md border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors">
      {label}
    </button>
  );
}
