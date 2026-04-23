import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowUpDown } from "lucide-react";
import { Card } from "../../components/ui/card";
import { KpiCard } from "../../components/ui/kpi-card";
import { cn } from "../../lib/utils";
import { projects, type ProjectKind } from "../../lib/mock-data";
import { NewProjectWizard } from "./NewProjectWizard";

const kindIcon: Record<ProjectKind, string> = {
  "crack-resolution": "◈",
  "extraction-batch": "□",
  "surveillance": "⬡",
  "opening-extension": "◌",
  "investigation": "◇",
};

const kindLabel: Record<ProjectKind, string> = {
  "crack-resolution": "Crack",
  "extraction-batch": "Extraction",
  "surveillance": "Surveillance",
  "opening-extension": "Opening",
  "investigation": "Investigation",
};

type SortKey = "name" | "kind" | "status" | "budget" | "last";
type SortDir = "asc" | "desc";

function projectDetail(p: typeof projects[number]): string {
  if (p.kind === "extraction-batch") return `${p.ingested_count ?? 0}/${p.target_count ?? 0}`;
  if (p.kind === "surveillance") return `${p.schedule ?? "—"} · ${p.signals_new ?? 0} new`;
  return `${p.hypotheses ?? 0} hyp · ${p.hypotheses_in_tree ?? 0} in tree`;
}

function budgetPct(p: typeof projects[number]): number {
  return p.budget_usd > 0 ? Math.round((p.spent_usd / p.budget_usd) * 100) : 0;
}

export function ProjectsPage() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [kindFilter, setKindFilter] = useState<ProjectKind | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const filtered = useMemo(() => {
    let list = projects.filter((p) =>
      showArchived ? !!p.archived : !p.archived,
    );
    if (kindFilter !== "all") {
      list = list.filter((p) => p.kind === kindFilter);
    }
    list = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name": cmp = a.name.localeCompare(b.name); break;
        case "kind": cmp = a.kind.localeCompare(b.kind); break;
        case "status": cmp = a.status.localeCompare(b.status); break;
        case "budget": cmp = budgetPct(a) - budgetPct(b); break;
        case "last": cmp = 0; break; // mock data doesn't have sortable timestamps
      }
      return sortDir === "desc" ? -cmp : cmp;
    });
    return list;
  }, [showArchived, kindFilter, sortKey, sortDir]);

  const currentProjects = projects.filter((p) => showArchived ? !!p.archived : !p.archived);
  const allKinds = [...new Set(projects.map((p) => p.kind))];

  return (
    <div className="space-y-4 max-w-6xl">
      {/* Header */}
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

      {/* KPI boxes — clickable filters */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          title="All"
          value={currentProjects.length}
          active={kindFilter === "all"}
          onClick={() => setKindFilter("all")}
        />
        {allKinds.map((k) => (
          <KpiCard
            key={k}
            title={`${kindIcon[k]} ${kindLabel[k]}`}
            value={currentProjects.filter((p) => p.kind === k).length}
            active={kindFilter === k}
            onClick={() => setKindFilter(kindFilter === k ? "all" : k)}
          />
        ))}
      </div>

      {/* Archive toggle */}
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowArchived(false)}
            className={cn(
              "text-xs px-2.5 py-1 rounded-md transition-colors",
              !showArchived ? "bg-[var(--foreground)] text-[var(--background)]" : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
            )}
          >
            Current
          </button>
          <button
            onClick={() => setShowArchived(true)}
            className={cn(
              "text-xs px-2.5 py-1 rounded-md transition-colors",
              showArchived ? "bg-[var(--foreground)] text-[var(--background)]" : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
            )}
          >
            Archived
          </button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-[var(--muted-foreground)] border-b border-[var(--border)]">
              <SortHeader label="Name" sortKey="name" current={sortKey} dir={sortDir} onClick={toggleSort} />
              <SortHeader label="Type" sortKey="kind" current={sortKey} dir={sortDir} onClick={toggleSort} />
              <SortHeader label="Status" sortKey="status" current={sortKey} dir={sortDir} onClick={toggleSort} />
              <SortHeader label="Budget" sortKey="budget" current={sortKey} dir={sortDir} onClick={toggleSort} />
              <th className="text-left py-2 font-medium">Detail</th>
              <SortHeader label="Last" sortKey="last" current={sortKey} dir={sortDir} onClick={toggleSort} className="text-right" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {filtered.map((p) => {
              const pct = budgetPct(p);
              return (
                <tr key={p.id} className="hover:bg-[var(--muted)] transition-colors">
                  <td className="py-2.5">
                    <Link to={`/projects/${p.id}`} className="text-[var(--foreground)] hover:text-[var(--primary)] transition-colors">
                      {p.name}
                    </Link>
                    {p.phase && (
                      <span className="ml-1.5 text-[10px] text-[var(--muted-foreground)]">· {p.phase}</span>
                    )}
                  </td>
                  <td className="py-2.5">
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {kindIcon[p.kind]} {kindLabel[p.kind]}
                    </span>
                  </td>
                  <td className="py-2.5">
                    <span className={cn(
                      "text-xs px-1.5 py-0.5 rounded",
                      p.status === "active" && "bg-[color:var(--color-success)]/10 text-[var(--color-success)]",
                      p.status === "paused" && "bg-[color:var(--color-warning)]/10 text-[var(--color-warning)]",
                      p.status === "completed" && "bg-[var(--muted)] text-[var(--muted-foreground)]",
                      p.status === "blocked" && "bg-[color:var(--color-danger)]/10 text-[var(--color-danger)]",
                      p.status === "awaiting-wet-lab" && "bg-[color:var(--color-accent)]/10 text-[var(--color-accent)]",
                      p.status === "awaiting-input" && "bg-[color:var(--color-warning)]/10 text-[var(--color-warning)]",
                      p.status === "budget-exceeded" && "bg-[color:var(--color-danger)]/10 text-[var(--color-danger)]",
                    )}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-2.5 font-mono text-xs">
                    {p.budget_usd > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-[var(--muted)] rounded-full overflow-hidden">
                          <div className="h-full bg-[var(--primary)] rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[var(--muted-foreground)]">${p.spent_usd}</span>
                      </div>
                    ) : "—"}
                  </td>
                  <td className="py-2.5 font-mono text-xs text-[var(--muted-foreground)]">{projectDetail(p)}</td>
                  <td className="py-2.5 text-right text-xs text-[var(--muted-foreground)]">{p.last_activity}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
            {showArchived ? "No archived projects." : "No projects match the current filter."}
          </p>
        )}
      </Card>
    </div>
  );
}

function SortHeader({ label, sortKey, current, dir, onClick, className }: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onClick: (key: SortKey) => void;
  className?: string;
}) {
  const active = current === sortKey;
  return (
    <th className={cn("py-2 font-medium", className)}>
      <button
        onClick={() => onClick(sortKey)}
        className="flex items-center gap-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
      >
        {label}
        <ArrowUpDown size={10} className={active ? "text-[var(--foreground)]" : "opacity-30"} />
        {active && <span className="text-[9px]">{dir === "asc" ? "↑" : "↓"}</span>}
      </button>
    </th>
  );
}
