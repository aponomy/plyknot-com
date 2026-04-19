import { Card, CardHeader, CardTitle } from "../../components/ui/card";
import { KpiCard } from "../../components/ui/kpi-card";
import { cn } from "../../lib/utils";
import {
  queueDepth,
  recentMatches,
  costHistory,
  type JudgeAgreement,
} from "../../lib/mock-data";

const agreementColor: Record<JudgeAgreement, string> = {
  "3-agree": "bg-[var(--color-success)]",
  "2-1": "bg-[var(--color-warning)]",
  "1-1-1": "bg-[var(--color-danger)]",
};

const agreementLabel: Record<JudgeAgreement, string> = {
  "3-agree": "unanimous",
  "2-1": "majority",
  "1-1-1": "divergent",
};

const totalCost = costHistory.reduce((s, e) => s + e.cost, 0);
const todayCost = costHistory[costHistory.length - 1]?.cost ?? 0;
const maxBar = Math.max(...queueDepth.map((q) => q.count));

export function FactoryPage() {
  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Factory</h1>
        <span className="text-xs text-[var(--muted-foreground)]">${todayCost} today</span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard title="Queue depth" value={queueDepth.reduce((s, q) => s + q.count, 0)} />
        <KpiCard title="Matches today" value={recentMatches.length} />
        <KpiCard title="Cost (7d)" value={`$${totalCost}`} delta="+11% vs prior week" trend="up" />
        <KpiCard title="Cost today" value={`$${todayCost}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Queue depth */}
        <Card>
          <CardHeader>
            <CardTitle>Queue depth</CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {queueDepth.map((q) => (
              <div key={q.type} className="flex items-center gap-3 text-sm">
                <span className="w-16 text-xs text-[var(--muted-foreground)] font-mono">{q.type}</span>
                <div className="flex-1 h-4 bg-[var(--muted)] rounded overflow-hidden">
                  <div
                    className="h-full bg-[var(--primary)] rounded transition-all"
                    style={{ width: `${(q.count / maxBar) * 100}%` }}
                  />
                </div>
                <span className="w-6 text-right font-mono text-xs">{q.count}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Cost chart */}
        <Card>
          <CardHeader>
            <CardTitle>Cost over last 7 days</CardTitle>
            <span className="text-xs text-[var(--muted-foreground)]">${totalCost} total</span>
          </CardHeader>
          <div className="flex items-end gap-1 h-24">
            {costHistory.map((entry) => {
              const maxCost = Math.max(...costHistory.map((e) => e.cost));
              const heightPct = (entry.cost / maxCost) * 100;
              return (
                <div key={entry.day} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full relative" style={{ height: "80px" }}>
                    <div
                      className="absolute bottom-0 w-full bg-[var(--primary)] rounded-t opacity-80"
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-[var(--muted-foreground)]">{entry.day.split(" ")[1]}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Judge tracker grid */}
      <Card>
        <CardHeader>
          <CardTitle>Judge ensemble — recent matches</CardTitle>
          <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[var(--color-success)]" /> 3-agree</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[var(--color-warning)]" /> 2-1</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[var(--color-danger)]" /> 1-1-1</span>
          </div>
        </CardHeader>

        {/* Tracker grid */}
        <div className="flex gap-1 mb-4">
          {recentMatches.map((match) => (
            <div
              key={match.id}
              title={`Match ${match.id}: ${match.hypothesis} (${agreementLabel[match.agreement]})`}
              className={cn(
                "flex-1 h-8 rounded-md cursor-pointer hover:opacity-80 transition-opacity",
                agreementColor[match.agreement],
              )}
            />
          ))}
        </div>

        {/* Match list */}
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-[var(--muted-foreground)] border-b border-[var(--border)]">
              <th className="text-left py-2 font-medium">#</th>
              <th className="text-left py-2 font-medium">Project</th>
              <th className="text-left py-2 font-medium">Hypothesis</th>
              <th className="text-center py-2 font-medium">Agreement</th>
              <th className="text-left py-2 font-medium">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {recentMatches.map((match) => (
              <tr key={match.id} className="hover:bg-[var(--muted)] transition-colors">
                <td className="py-2 font-mono text-xs">{match.id}</td>
                <td className="py-2 text-xs">{match.project}</td>
                <td className="py-2 font-mono text-xs">{match.hypothesis}</td>
                <td className="py-2 text-center">
                  <span className={cn(
                    "text-xs px-1.5 py-0.5 rounded",
                    match.agreement === "3-agree" && "bg-[color:var(--color-success)]/10 text-[var(--color-success)]",
                    match.agreement === "2-1" && "bg-[color:var(--color-warning)]/10 text-[var(--color-warning)]",
                    match.agreement === "1-1-1" && "bg-[color:var(--color-danger)]/10 text-[var(--color-danger)]",
                  )}>
                    {match.agreement}
                  </span>
                </td>
                <td className="py-2 text-xs text-[var(--muted-foreground)]">{match.result ?? "⚠ needs resolution"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
