import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle } from "../../components/ui/card";
import { projects, type ProjectKind } from "../../lib/mock-data";

const kindIcon: Record<ProjectKind, string> = {
  "crack-resolution": "◈",
  "extraction-batch": "□",
  "surveillance": "⬡",
  "opening-extension": "◌",
};

const attentionItems = [
  { icon: "⚠", text: "Judge divergence in match 7 of alphafold-binding-site-v1", sub: "GPT picked H-MSA, Claude+Gemini picked H-pocket" },
  { icon: "⚠", text: "2 extraction conflicts awaiting review", sub: "bioRxiv 2026.03.4231 · arXiv 2026.04.9823" },
  { icon: "⏰", text: "Embargo expires in 6 days", sub: "crack AB-2026-003 → public" },
];

function projectSummary(p: typeof projects[number]): string {
  if (p.kind === "extraction-batch") return `${p.ingested_count ?? 0}/${p.target_count ?? 0} papers`;
  if (p.kind === "surveillance") return `scheduled ${p.schedule ?? "—"}`;
  if (p.status === "paused") return "awaiting wet-lab";
  return `${p.hypotheses ?? 0} hyp · ${p.hypotheses_in_tree ?? 0} in tree`;
}

export function HomePage() {
  return (
    <div className="space-y-6 max-w-6xl">
      {/* Active projects */}
      <Card>
        <CardHeader>
          <CardTitle>Active projects</CardTitle>
          <Link to="/projects" className="text-xs text-[var(--primary)] hover:underline">View all</Link>
        </CardHeader>
        <div className="divide-y divide-[var(--border)]">
          {projects.map((p) => {
            const pct = p.budget_usd > 0 ? Math.round((p.spent_usd / p.budget_usd) * 100) : 0;
            return (
              <Link key={p.id} to={`/projects/${p.id}`} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 hover:bg-[var(--muted)] -mx-4 px-4 transition-colors">
                <span className="w-5 text-center font-mono text-sm text-[var(--muted-foreground)]" title={p.kind}>
                  {kindIcon[p.kind]}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{p.name}</span>
                    <span className="text-xs text-[var(--muted-foreground)] shrink-0">{p.kind}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${p.status === "active" ? "bg-[color:var(--color-success)]/10 text-[var(--color-success)]" : p.status === "paused" ? "bg-[color:var(--color-warning)]/10 text-[var(--color-warning)]" : "bg-[var(--muted)] text-[var(--muted-foreground)]"}`}>
                      {p.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-[var(--muted-foreground)]">
                    {p.budget_usd > 0 && (
                      <>
                        <span className="font-mono">${p.spent_usd}/${p.budget_usd}</span>
                        <div className="w-24 h-1.5 bg-[var(--muted)] rounded-full overflow-hidden">
                          <div className="h-full bg-[var(--primary)] rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </>
                    )}
                    <span>{projectSummary(p)}</span>
                    <span className="ml-auto shrink-0">{p.last_activity}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </Card>

      {/* Needs attention */}
      <Card>
        <CardHeader>
          <CardTitle>Needs your attention</CardTitle>
          <span className="text-xs text-[var(--muted-foreground)]">{attentionItems.length} items</span>
        </CardHeader>
        <div className="divide-y divide-[var(--border)]">
          {attentionItems.map((item, i) => (
            <div key={i} className="py-3 first:pt-0 last:pb-0">
              <p className="text-sm">
                <span className="mr-2">{item.icon}</span>
                {item.text}
              </p>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5 ml-6">{item.sub}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Recent deltas */}
      <Card>
        <CardHeader>
          <CardTitle>Recent deltas</CardTitle>
        </CardHeader>
        <div className="space-y-2 text-sm">
          <p><span className="text-xs text-[var(--muted-foreground)] font-mono w-10 inline-block">17m</span> alphafold-binding-site-v1 — 3 MD pipelines converged; ρ=0.64</p>
          <p><span className="text-xs text-[var(--muted-foreground)] font-mono w-10 inline-block">2h</span> h0-tension — EDE mutation Elo 1247→1312</p>
          <p><span className="text-xs text-[var(--muted-foreground)] font-mono w-10 inline-block">3h</span> mcl1-literature-2024-2026 — ingested 12 papers, 47 couplings</p>
        </div>
      </Card>
    </div>
  );
}
