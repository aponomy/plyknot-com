import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle } from "../../components/ui/card";
import { projects, type ProjectKind } from "../../lib/mock-data";
import { NewProjectWizard } from "./NewProjectWizard";

const kindIcon: Record<ProjectKind, string> = {
  "crack-resolution": "◈",
  "extraction-batch": "□",
  "surveillance": "⬡",
  "opening-extension": "◌",
};

const kindLabel: Record<ProjectKind, string> = {
  "crack-resolution": "Crack resolution",
  "extraction-batch": "Extraction batch",
  "surveillance": "Surveillance",
  "opening-extension": "Opening extension",
};

const kindDetailHeader: Record<ProjectKind, string> = {
  "crack-resolution": "Hypoth.",
  "extraction-batch": "Papers",
  "surveillance": "Signals",
  "opening-extension": "Cluster",
};

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of arr) {
    const k = key(item);
    (result[k] ??= []).push(item);
  }
  return result;
}

function projectDetail(p: typeof projects[number]): string {
  if (p.kind === "extraction-batch") return `${p.ingested_count ?? 0}/${p.target_count ?? 0}`;
  if (p.kind === "surveillance") return `${p.schedule ?? "—"} · ${p.signals_new ?? 0} new`;
  return `${p.hypotheses ?? 0} · ${p.hypotheses_in_tree ?? 0}▸`;
}

function projectBudget(p: typeof projects[number]): string {
  if (p.budget_usd === 0) return "—";
  const pct = Math.round((p.spent_usd / p.budget_usd) * 100);
  return `${pct}% $${p.spent_usd}`;
}

export function ProjectsPage() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const grouped = groupBy(projects, (p) => p.kind);

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Projects</h1>
        <button
          onClick={() => setWizardOpen(true)}
          className="px-3 py-1.5 text-xs font-medium rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition-opacity"
        >
          + New project
        </button>
      </div>
      <NewProjectWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />

      {Object.entries(grouped).map(([kind, items]) => (
        <Card key={kind}>
          <CardHeader>
            <CardTitle>
              {kindIcon[kind as ProjectKind]} {kindLabel[kind as ProjectKind] ?? kind} ({items.length})
            </CardTitle>
          </CardHeader>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-[var(--muted-foreground)] border-b border-[var(--border)]">
                <th className="text-left py-2 font-medium">Name</th>
                <th className="text-left py-2 font-medium">Status</th>
                <th className="text-left py-2 font-medium">Budget</th>
                <th className="text-left py-2 font-medium">{kindDetailHeader[kind as ProjectKind]}</th>
                <th className="text-right py-2 font-medium">Last</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {items.map((p) => (
                <tr key={p.id} className="hover:bg-[var(--muted)] transition-colors">
                  <td className="py-2.5">
                    <Link to={`/projects/${p.id}`} className="text-[var(--foreground)] hover:text-[var(--primary)] transition-colors">
                      {p.name}
                    </Link>
                  </td>
                  <td className="py-2.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${p.status === "active" ? "bg-[color:var(--color-success)]/10 text-[var(--color-success)]" : p.status === "paused" ? "bg-[color:var(--color-warning)]/10 text-[var(--color-warning)]" : "bg-[var(--muted)] text-[var(--muted-foreground)]"}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-2.5 font-mono text-xs">{projectBudget(p)}</td>
                  <td className="py-2.5 font-mono text-xs">{projectDetail(p)}</td>
                  <td className="py-2.5 text-right text-xs text-[var(--muted-foreground)]">{p.last_activity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ))}
    </div>
  );
}
