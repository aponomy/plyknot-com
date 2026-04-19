import { Card, CardHeader, CardTitle } from "../../components/ui/card";
import type { Project } from "../../lib/mock-data";

export function SurveillanceDetail({ project: p }: { project: Project }) {
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
            <p>surveillance</p>
          </div>
          <div>
            <p className="text-xs text-[var(--muted-foreground)]">Schedule</p>
            <p>{p.schedule ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--muted-foreground)]">New signals</p>
            <p className="font-mono">{p.signals_new ?? 0}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--muted-foreground)]">Last run</p>
            <p>{p.last_activity}</p>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Watchlist</CardTitle>
        </CardHeader>
        <div className="space-y-2">
          {(p.watchlist ?? []).map((w) => (
            <div key={w} className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-[var(--color-success)]" />
              <span className="font-mono text-xs">{w}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Signal feed</CardTitle>
        </CardHeader>
        <p className="text-sm text-[var(--muted-foreground)]">
          {p.signals_new ?? 0} new signals since last review
        </p>
      </Card>
    </>
  );
}
