import { Card, CardHeader, CardTitle } from "../../components/ui/card";
import { cn } from "../../lib/utils";
import { getProjectFailures } from "../../lib/mock-data";

export function ProjectFailures({ projectId }: { projectId: string }) {
  const failures = getProjectFailures(projectId);

  if (failures.length === 0) return null;

  const totalSaved = failures.reduce((s, f) => s + f.prevented_reruns, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Failure graph</CardTitle>
        <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
          <span>{failures.length} entries</span>
          {totalSaved > 0 && <span>· {totalSaved} reruns prevented</span>}
        </div>
      </CardHeader>
      <div className="divide-y divide-[var(--border)]">
        {failures.map((f) => (
          <div key={f.id} className="py-2.5 first:pt-0 last:pb-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn("text-xs px-1.5 py-0.5 rounded",
                f.outcome === "failed" ? "bg-[color:var(--color-danger)]/10 text-[var(--color-danger)]" : "bg-[color:var(--color-warning)]/10 text-[var(--color-warning)]",
              )}>{f.outcome}</span>
              <span className="text-xs font-mono text-[var(--muted-foreground)]">{f.hypothesis}</span>
              <span className="text-[10px] text-[var(--muted-foreground)] ml-auto">${f.cost_usd.toFixed(2)} · {f.timestamp.split("T")[0]}</span>
            </div>
            <p className="text-xs font-medium mb-0.5">{f.experiment}</p>
            <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">{f.reason}</p>
            {f.prevented_reruns > 0 && (
              <p className="text-[10px] text-[var(--color-success)] mt-1">{f.prevented_reruns} rerun{f.prevented_reruns > 1 ? "s" : ""} prevented by this entry</p>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
