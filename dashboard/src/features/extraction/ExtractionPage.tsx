import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle } from "../../components/ui/card";
import { KpiCard } from "../../components/ui/kpi-card";
import {
  projects,
  groundingQuality,
  topEntities,
} from "../../lib/mock-data";

const batches = projects.filter((p) => p.kind === "extraction-batch");
const totalIngested = batches.reduce((s, b) => s + (b.ingested_count ?? 0), 0);
const totalCouplings = batches.reduce((s, b) => s + (b.couplings_emitted ?? 0), 0);
const totalConflicts = batches.reduce((s, b) => s + (b.conflicts ?? 0), 0);

export function ExtractionPage() {
  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Extraction</h1>
        <span className="flex items-center gap-1.5 text-xs">
          <span className="w-2 h-2 rounded-full bg-[var(--color-success)] animate-pulse" />
          live
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard title="Papers ingested" value={totalIngested} delta="47 today" trend="up" />
        <KpiCard title="Couplings emitted" value={totalCouplings.toLocaleString()} delta="213 today" trend="up" />
        <KpiCard title="Avg per paper" value="4.6" />
        <KpiCard title="Conflicts" value={totalConflicts} delta={totalConflicts > 0 ? "awaiting review" : ""} trend={totalConflicts > 0 ? "up" : undefined} />
      </div>

      {/* Active batches */}
      <Card>
        <CardHeader>
          <CardTitle>Active batches</CardTitle>
        </CardHeader>
        <div className="space-y-3">
          {batches.map((b) => {
            const pct = b.target_count ? Math.round(((b.ingested_count ?? 0) / b.target_count) * 100) : 0;
            return (
              <div key={b.id}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <Link to={`/projects/${b.id}`} className="font-mono text-xs hover:text-[var(--primary)] transition-colors">
                    {b.name}
                  </Link>
                  <span className="font-mono text-xs text-[var(--muted-foreground)]">
                    {b.ingested_count}/{b.target_count} — {pct}%
                  </span>
                </div>
                <div className="w-full h-2 bg-[var(--muted)] rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--primary)] rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Grounding quality */}
        <Card>
          <CardHeader>
            <CardTitle>Grounding quality</CardTitle>
          </CardHeader>
          <div className="space-y-2.5">
            {groundingQuality.map((g) => (
              <div key={g.label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-[var(--muted-foreground)]">{g.label}</span>
                  <span className="font-mono">{g.pct}%</span>
                </div>
                <div className="w-full h-2 bg-[var(--muted)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--color-success)] rounded-full transition-all"
                    style={{ width: `${g.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Top entities by activity */}
        <Card>
          <CardHeader>
            <CardTitle>Top entities by activity</CardTitle>
            <span className="text-xs text-[var(--muted-foreground)]">last 7d</span>
          </CardHeader>
          <div className="space-y-2.5">
            {topEntities.map((e) => {
              const maxNew = Math.max(...topEntities.map((x) => x.newCouplings));
              return (
                <div key={e.entity} className="flex items-center gap-3 text-sm">
                  <span className="w-20 truncate">{e.entity}</span>
                  <div className="flex-1 h-4 bg-[var(--muted)] rounded overflow-hidden">
                    <div
                      className="h-full bg-[var(--primary)] rounded transition-all"
                      style={{ width: `${(e.newCouplings / maxNew) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-[var(--muted-foreground)] font-mono w-24 text-right">
                    {e.newCouplings} new{e.conflicts > 0 && ` · ${e.conflicts} ⚠`}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Conflict queue */}
      {totalConflicts > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Conflict queue</CardTitle>
            <span className="text-xs text-[var(--color-warning)]">{totalConflicts} awaiting review</span>
          </CardHeader>
          <p className="text-sm text-[var(--muted-foreground)]">
            See <Link to="/review" className="text-[var(--primary)] hover:underline">Review queue</Link> for inline resolution.
          </p>
        </Card>
      )}

      {/* Aggregate throughput */}
      <Card>
        <CardHeader>
          <CardTitle>Aggregate throughput</CardTitle>
          <span className="text-xs text-[var(--muted-foreground)]">last 7 days</span>
        </CardHeader>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-[var(--muted-foreground)]">Papers ingested</p>
            <p className="font-mono">47 today · 341 last 7d</p>
          </div>
          <div>
            <p className="text-xs text-[var(--muted-foreground)]">Couplings emitted</p>
            <p className="font-mono">213 · 1,684</p>
          </div>
          <div>
            <p className="text-xs text-[var(--muted-foreground)]">Avg per paper</p>
            <p className="font-mono">4.5 · 4.9</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
