import { Card, CardHeader, CardTitle } from "../../components/ui/card";
import type { Project } from "../../lib/mock-data";

export function ExtractionBatchDetail({ project: p }: { project: Project }) {
  const pctBudget = p.budget_usd > 0 ? Math.round((p.spent_usd / p.budget_usd) * 100) : 0;
  const pctPapers = p.target_count ? Math.round(((p.ingested_count ?? 0) / p.target_count) * 100) : 0;
  const estDays = p.scout_rate && p.target_count && p.ingested_count
    ? Math.ceil((p.target_count - p.ingested_count) / p.scout_rate)
    : null;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
          <span className="text-xs px-1.5 py-0.5 rounded bg-[color:var(--color-success)]/10 text-[var(--color-success)]">
            {p.status}
          </span>
        </CardHeader>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-[var(--muted-foreground)]">Kind</p>
            <p>extraction-batch</p>
          </div>
          <div>
            <p className="text-xs text-[var(--muted-foreground)]">Scope</p>
            <p>{p.description}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--muted-foreground)]">Budget</p>
            <p className="font-mono">${p.spent_usd} / ${p.budget_usd} ({pctBudget}%)</p>
          </div>
          <div>
            <p className="text-xs text-[var(--muted-foreground)]">Started</p>
            <p>{p.created_at}</p>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button className="text-xs px-3 py-1.5 rounded-md border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors">
            {p.status === "active" ? "pause" : "resume"}
          </button>
          <button className="text-xs px-3 py-1.5 rounded-md border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors">
            allocate budget
          </button>
          <button className="text-xs px-3 py-1.5 rounded-md border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors">
            export couplings
          </button>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Ingestion progress</CardTitle>
          </CardHeader>
          <p className="text-2xl font-semibold font-mono tabular-nums">
            {p.ingested_count} / {p.target_count}
          </p>
          <div className="w-full h-2 bg-[var(--muted)] rounded-full overflow-hidden mt-2">
            <div className="h-full bg-[var(--primary)] rounded-full transition-all" style={{ width: `${pctPapers}%` }} />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-[var(--muted-foreground)]">
            {estDays !== null && <p>est. {estDays}d to target</p>}
            {p.scout_rate && <p>Scout rate: {p.scout_rate} papers/day</p>}
            {p.extractor_success && <p>Extractor success: {p.extractor_success}%</p>}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Couplings emitted</CardTitle>
          </CardHeader>
          <p className="text-2xl font-semibold font-mono tabular-nums">
            {p.couplings_emitted ?? 0}
          </p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            {p.avg_per_paper ?? 0} per paper
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scope</CardTitle>
        </CardHeader>
        <div className="space-y-2 text-sm">
          <div className="flex flex-wrap gap-1.5">
            <span className="text-xs text-[var(--muted-foreground)] mr-1">Keywords:</span>
            {(p.keywords ?? []).map((kw) => (
              <span key={kw} className="text-xs font-mono px-2 py-0.5 rounded bg-[var(--muted)]">{kw}</span>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className="text-xs text-[var(--muted-foreground)] mr-1">Venues:</span>
            {(p.venues ?? []).map((v) => (
              <span key={v} className="text-xs font-mono px-2 py-0.5 rounded bg-[var(--muted)]">{v}</span>
            ))}
          </div>
          {p.date_range && (
            <p className="text-xs text-[var(--muted-foreground)]">
              Date range: {p.date_range.start} → {p.date_range.end}
            </p>
          )}
        </div>
      </Card>

      {(p.conflicts ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Conflicts</CardTitle>
            <span className="text-xs text-[var(--color-warning)]">{p.conflicts} flagged</span>
          </CardHeader>
          <p className="text-sm text-[var(--muted-foreground)]">
            Open conflicts awaiting review
          </p>
        </Card>
      )}
    </>
  );
}
