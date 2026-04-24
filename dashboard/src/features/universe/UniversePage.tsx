import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle } from "../../components/ui/card";
import { KpiCard } from "../../components/ui/kpi-card";
import { DataSourceToggle } from "./DataSourceToggle";
import { ConvergenceMap, type CellSelection } from "./ConvergenceMap";
import { ProjectsMap, type ProjectCellSelection } from "./ProjectsMap";
import { EntityRef } from "../../components/ui/entity-ref";
import { cn } from "../../lib/utils";
import { Link, useNavigate } from "react-router-dom";
import {
  fetchStats,
  fetchHeatmap,
  fetchChains,
  fetchCracks,
  type DataSource,
  type Crack,
  type HeatmapCell,
} from "../../lib/hub-api";
import { projects as allProjects, type Project, type ProjectKind } from "../../lib/mock-data";

type ActiveView = "cracks" | "openings" | "chains" | "projects";

const INFERENCE_LEVELS = ["signal", "measurement", "pattern", "model", "hypothesis"];
const COMPLEXITY_LEVELS = [0, 1, 2, 3, 4, 5];
const TOTAL_CELLS = INFERENCE_LEVELS.length * COMPLEXITY_LEVELS.length; // 30

const complexityLabel: Record<number, string> = {
  0: "L0 · Fundamental",
  1: "L1 · Atomic",
  2: "L2 · Chemical",
  3: "L3 · Cellular",
  4: "L4 · Organism",
  5: "L5 · Social",
};

const inferenceGlyph: Record<string, string> = {
  signal: "①",
  measurement: "②",
  pattern: "③",
  model: "④",
  hypothesis: "⑤",
};

const projectKindIcon: Record<ProjectKind, string> = {
  "crack-resolution": "◈",
  "extraction-batch": "□",
  "surveillance": "⬡",
  "opening-extension": "◌",
  "investigation": "◇",
};

export function UniversePage() {
  const navigate = useNavigate();
  const [source, setSource] = useState<DataSource>("plyknot.org");
  const [view, setView] = useState<ActiveView>("cracks");
  const [selectedCell, setSelectedCell] = useState<CellSelection | null>(null);
  const [selectedCellData, setSelectedCellData] = useState<HeatmapCell | null>(null);
  const [crackFilter, setCrackFilter] = useState<"all" | "divergent" | "tension" | "solid" | "single">("all");
  const [projectsCell, setProjectsCell] = useState<ProjectCellSelection | null>(null);
  const [projectsCellProjects, setProjectsCellProjects] = useState<Project[]>([]);
  const [projectsShowArchived, setProjectsShowArchived] = useState(false);

  const stats = useQuery({
    queryKey: ["stats", source],
    queryFn: () => fetchStats(source),
    retry: false,
  });

  const heatmap = useQuery({
    queryKey: ["heatmap", source],
    queryFn: () => fetchHeatmap(source),
    retry: false,
  });

  const chains = useQuery({
    queryKey: ["chains", source],
    queryFn: () => fetchChains(source),
    retry: false,
  });

  const cracks = useQuery({
    queryKey: ["cracks", source],
    queryFn: () => fetchCracks(source),
    retry: false,
  });

  const isLoading = stats.isLoading || heatmap.isLoading;
  const hasError = stats.isError || heatmap.isError;

  // Compute openings count: lattice positions with no data
  const openingsCount = useMemo(() => {
    if (!heatmap.data) return 0;
    const filledCells = heatmap.data.cells.filter((c) => c.total > 0).length;
    return TOTAL_CELLS - filledCells;
  }, [heatmap.data]);

  const activeProjectCount = allProjects.filter((p) => !p.archived).length;
  const archivedProjectCount = allProjects.filter((p) => p.archived).length;

  function handleCellClick(cell: HeatmapCell, selection: CellSelection) {
    if (
      selectedCell?.inferenceLevel === selection.inferenceLevel &&
      selectedCell?.complexityLevel === selection.complexityLevel
    ) {
      deselect();
    } else {
      setSelectedCell(selection);
      setSelectedCellData(cell);
      setCrackFilter("all");
    }
  }

  function deselect() {
    setSelectedCell(null);
    setSelectedCellData(null);
    setCrackFilter("all");
  }

  // Filter cracks to the selected cell's inference level
  const cellCracks: Crack[] = selectedCell && cracks.data
    ? cracks.data.cracks.filter((c) => c.level === selectedCell.inferenceLevel)
    : [];

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">
          Universe, <span className="text-[var(--muted-foreground)] font-normal">{
            source === "plyknot.org" ? "open truth" :
            source === "plyknot.com" ? "hidden truth" :
            source === "cybernetics" ? "moving truth" :
            "subjective truth"
          }</span>
        </h1>
        <DataSourceToggle value={source} onChange={setSource} />
      </div>

      {/* KPI boxes — always visible, hub data optional */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard title="Cracks" value={stats.data?.crackCount ?? "—"} delta={stats.data ? `across ${stats.data.chainCount} chains` : ""} trend={stats.data ? "down" : undefined} active={view === "cracks"} onClick={() => { setView("cracks"); deselect(); }} />
        <KpiCard title="Openings" value={stats.data ? openingsCount : "—"} delta={stats.data ? `of ${TOTAL_CELLS} positions` : ""} active={view === "openings"} onClick={() => { setView("openings"); deselect(); }} />
        <KpiCard title="Chains" value={stats.data?.chainCount ?? "—"} active={view === "chains"} onClick={() => { setView("chains"); deselect(); }} />
        <KpiCard title="Projects" value={activeProjectCount} delta={`${archivedProjectCount} archived`} active={view === "projects"} onClick={() => { setView("projects"); deselect(); setProjectsCell(null); }} />
      </div>

      {/* Hub connection notice */}
      {hasError && source === "plyknot.com" && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[var(--muted)] text-xs text-[var(--muted-foreground)]">
          <span className="w-2 h-2 rounded-full bg-[var(--color-warning)] shrink-0" />
          <span>
            hub.plyknot.com requires authentication.{" "}
            <button onClick={() => navigate("/settings/access")} className="text-[var(--primary)] hover:underline">
              Request access
            </button>
          </span>
        </div>
      )}
      {hasError && source === "plyknot.org" && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[var(--muted)] text-xs text-[var(--muted-foreground)]">
          <span className="w-2 h-2 rounded-full bg-[var(--color-danger)] shrink-0" />
          Could not reach hub.plyknot.org.
        </div>
      )}

      {/* === VIEW: Cracks / Openings (convergence map) === */}
      {(view === "cracks" || view === "openings") && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>
                {view === "cracks" ? "Convergence map — cracks" : "Convergence map — openings"}
              </CardTitle>
              {stats.data && (
                <span className="text-xs text-[var(--muted-foreground)]">
                  {view === "cracks"
                    ? `${stats.data.crackCount} cracks across ${stats.data.chainCount} chains`
                    : `${openingsCount} unmeasured positions in the lattice`}
                </span>
              )}
            </CardHeader>

            {isLoading ? (
              <div className="h-48 flex items-center justify-center text-sm text-[var(--muted-foreground)]">Loading…</div>
            ) : heatmap.data ? (
              <ConvergenceMap
                cells={heatmap.data.cells}
                mode={view === "openings" ? "openings" : "cracks"}
                selected={selectedCell}
                onCellClick={handleCellClick}
                onDeselect={deselect}
              />
            ) : null}
          </Card>

          {/* Cell detail: claims list (shown when a cell is selected) */}
          {selectedCell && selectedCellData && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {inferenceGlyph[selectedCell.inferenceLevel]} {selectedCell.inferenceLevel} · {complexityLabel[selectedCell.complexityLevel]}
                </CardTitle>
                <div className="flex items-center gap-1.5">
                  {(["all", "divergent", "tension", "solid", "single"] as const).map((f) => {
                    const count = f === "all"
                      ? cellCracks.length
                      : cellCracks.filter((c) => c.convergence === f).length;
                    if (f !== "all" && count === 0) return null;
                    const colorMap: Record<string, string> = {
                      all: crackFilter === "all" ? "bg-[var(--foreground)] text-[var(--background)]" : "bg-[var(--muted)] text-[var(--muted-foreground)]",
                      divergent: crackFilter === "divergent" ? "bg-[var(--color-danger)] text-white" : "bg-[color:var(--color-danger)]/10 text-[var(--color-danger)]",
                      tension: crackFilter === "tension" ? "bg-[var(--color-warning)] text-white" : "bg-[color:var(--color-warning)]/10 text-[var(--color-warning)]",
                      solid: crackFilter === "solid" ? "bg-[var(--color-success)] text-white" : "bg-[color:var(--color-success)]/10 text-[var(--color-success)]",
                      single: crackFilter === "single" ? "bg-[var(--color-zinc-500)] text-white" : "bg-[var(--muted)] text-[var(--muted-foreground)]",
                    };
                    return (
                      <button
                        key={f}
                        onClick={() => setCrackFilter(crackFilter === f ? "all" : f)}
                        className={cn("text-xs px-1.5 py-0.5 rounded cursor-pointer transition-colors font-mono", colorMap[f])}
                      >
                        {f === "all" ? `${count} claims` : `${count} ${f}`}
                      </button>
                    );
                  })}
                  <button
                    onClick={deselect}
                    className="w-5 h-5 flex items-center justify-center rounded text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors ml-1"
                  >
                    ✕
                  </button>
                </div>
              </CardHeader>

              {view === "cracks" ? (
                cellCracks.length > 0 ? (
                  <>
                    <div className="divide-y divide-[var(--border)]">
                    {cellCracks.filter((c) => crackFilter === "all" || c.convergence === crackFilter).map((crack) => (
                      <div key={crack.crack_id} className="py-3 first:pt-0 last:pb-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium relative"><EntityRef label={crack.chain} /></span>
                          <span className="font-mono text-sm font-semibold">
                            {crack.sigmaTension}σ
                          </span>
                        </div>
                        <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                          {crack.claim}
                        </p>
                        <div className="mt-1">
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded",
                            crack.convergence === "divergent"
                              ? "bg-[color:var(--color-danger)]/10 text-[var(--color-danger)]"
                              : "bg-[color:var(--color-warning)]/10 text-[var(--color-warning)]",
                          )}>
                            {crack.convergence}
                          </span>
                        </div>
                      </div>
                    ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-[var(--muted-foreground)]">
                    No cracks at this position — all claims converge.
                  </p>
                )
              ) : (
                // Openings tab — show empty-cell guidance
                selectedCellData.total === 0 ? (
                  <div className="text-sm space-y-1">
                    <p className="font-medium">Opening</p>
                    <p className="text-[var(--muted-foreground)]">
                      No measurements exist at {inferenceGlyph[selectedCell.inferenceLevel]} {selectedCell.inferenceLevel} × {complexityLabel[selectedCell.complexityLevel]} yet.
                    </p>
                    <p className="text-[var(--muted-foreground)]">
                      This is an opportunity for new independent measurement. Submit data via the Hub API or MCP tools.
                    </p>
                  </div>
                ) : (
                  <div className="text-sm space-y-1">
                    <p className="font-medium">Populated position</p>
                    <p className="text-[var(--muted-foreground)]">
                      {selectedCellData.total} claims exist here ({selectedCellData.cracked} cracked).
                      This position is not an opening — switch to the Cracks tab to see disagreements.
                    </p>
                  </div>
                )
              )}
            </Card>
          )}

          {/* Top cracks / openings table (shown when no cell is selected) */}
          {!selectedCell && view === "cracks" && (
            <Card>
              <CardHeader>
                <CardTitle>Top cracks</CardTitle>
                {cracks.data && (
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {cracks.data.cracks.length} open, sorted by σ
                  </span>
                )}
              </CardHeader>
              {cracks.isLoading ? (
                <div className="h-24 flex items-center justify-center text-sm text-[var(--muted-foreground)]">Loading…</div>
              ) : cracks.data ? (
                <CrackTable cracks={cracks.data.cracks} />
              ) : null}
            </Card>
          )}

          {!selectedCell && view === "openings" && heatmap.data && (
            <Card>
              <CardHeader>
                <CardTitle>Open positions</CardTitle>
                <span className="text-xs text-[var(--muted-foreground)]">
                  {openingsCount} of {TOTAL_CELLS} unmeasured
                </span>
              </CardHeader>
              <OpeningsTable cells={heatmap.data.cells} />
            </Card>
          )}
        </>
      )}

      {/* === VIEW: Inference Chains === */}
      {view === "chains" && (
        <Card>
          <CardHeader>
            <CardTitle>Inference chains</CardTitle>
            {chains.data && (
              <span className="text-xs text-[var(--muted-foreground)]">
                {chains.data.chains.length} chains
              </span>
            )}
          </CardHeader>
          {chains.isLoading ? (
            <div className="h-24 flex items-center justify-center text-sm text-[var(--muted-foreground)]">Loading…</div>
          ) : chains.data ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-[var(--muted-foreground)] border-b border-[var(--border)]">
                  <th className="text-left py-2 font-medium">Chain</th>
                  <th className="text-left py-2 font-medium">Entity</th>
                  <th className="text-center py-2 font-medium">Steps</th>
                  <th className="text-center py-2 font-medium">Cracks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {chains.data.chains.map((chain) => (
                  <tr key={chain.name} className="hover:bg-[var(--muted)] transition-colors">
                    <td className="py-2 font-mono text-xs">{chain.name}</td>
                    <td className="py-2">{chain.entity}</td>
                    <td className="py-2 text-center font-mono">{chain.stepCount}</td>
                    <td className="py-2 text-center">
                      {chain.crackCount > 0 ? (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-[color:var(--color-danger)]/10 text-[var(--color-danger)] font-mono">
                          {chain.crackCount}
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--muted-foreground)]">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </Card>
      )}

      {/* === VIEW: Projects overlay === */}
      {view === "projects" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Project coverage</CardTitle>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setProjectsShowArchived(false); setProjectsCell(null); }}
                  className={cn(
                    "text-xs px-2 py-1 rounded-md transition-colors",
                    !projectsShowArchived ? "bg-[var(--foreground)] text-[var(--background)]" : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
                  )}
                >
                  Current
                </button>
                <button
                  onClick={() => { setProjectsShowArchived(true); setProjectsCell(null); }}
                  className={cn(
                    "text-xs px-2 py-1 rounded-md transition-colors",
                    projectsShowArchived ? "bg-[var(--foreground)] text-[var(--background)]" : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
                  )}
                >
                  + Archived
                </button>
              </div>
            </CardHeader>
            <ProjectsMap
              includeArchived={projectsShowArchived}
              selected={projectsCell}
              onCellClick={(sel, projs) => {
                if (projectsCell?.inferenceLevel === sel.inferenceLevel && projectsCell?.complexityLevel === sel.complexityLevel && projectsCell?.category === sel.category) {
                  setProjectsCell(null);
                  setProjectsCellProjects([]);
                } else {
                  setProjectsCell(sel);
                  setProjectsCellProjects(projs);
                }
              }}
              onDeselect={() => { setProjectsCell(null); setProjectsCellProjects([]); }}
            />
          </Card>

          {/* Project list for selected cell */}
          {projectsCell && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {inferenceGlyph[projectsCell.inferenceLevel]} {projectsCell.inferenceLevel} · {complexityLabel[projectsCell.complexityLevel]} · {projectsCell.category}
                </CardTitle>
                <span className="text-xs text-[var(--muted-foreground)]">{projectsCellProjects.length} project{projectsCellProjects.length !== 1 ? "s" : ""}</span>
              </CardHeader>
              {projectsCellProjects.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">No {projectsCell.category} projects at this position.</p>
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {projectsCellProjects.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                      <span className="font-mono text-sm text-[var(--muted-foreground)]">
                        {projectKindIcon[p.kind]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <Link to={`/projects/${p.id}`} className="text-sm font-medium hover:text-[var(--primary)] transition-colors">
                          {p.name}
                        </Link>
                        <p className="text-xs text-[var(--muted-foreground)] truncate">{p.description}</p>
                      </div>
                      <span className={cn(
                        "text-xs px-1.5 py-0.5 rounded shrink-0",
                        p.status === "active" && "bg-[color:var(--color-success)]/10 text-[var(--color-success)]",
                        p.status === "paused" && "bg-[color:var(--color-warning)]/10 text-[var(--color-warning)]",
                        p.status === "completed" && "bg-[var(--muted)] text-[var(--muted-foreground)]",
                      )}>
                        {p.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// --- Sub-components ---

function CrackTable({ cracks }: { cracks: Crack[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-xs text-[var(--muted-foreground)] border-b border-[var(--border)]">
          <th className="text-left py-2 font-medium">Crack</th>
          <th className="text-left py-2 font-medium">Chain</th>
          <th className="text-left py-2 font-medium">Level</th>
          <th className="text-center py-2 font-medium">σ</th>
          <th className="text-center py-2 font-medium">Status</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[var(--border)]">
        {cracks.map((crack) => (
          <tr key={crack.crack_id} className="hover:bg-[var(--muted)] transition-colors">
            <td className="py-2 text-xs max-w-[200px] truncate" title={crack.claim}>
              {crack.claim}
            </td>
            <td className="py-2 relative"><EntityRef label={crack.chain} /></td>
            <td className="py-2 text-xs">{crack.level}</td>
            <td className="py-2 text-center font-mono font-semibold">
              {crack.sigmaTension}
            </td>
            <td className="py-2 text-center">
              <span
                className={cn(
                  "text-xs px-1.5 py-0.5 rounded",
                  crack.convergence === "divergent"
                    ? "bg-[color:var(--color-danger)]/10 text-[var(--color-danger)]"
                    : "bg-[color:var(--color-warning)]/10 text-[var(--color-warning)]",
                )}
              >
                {crack.convergence}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function OpeningsTable({ cells }: { cells: HeatmapCell[] }) {
  // Build list of empty positions
  const filledSet = new Set(
    cells.filter((c) => c.total > 0).map((c) => `${c.inferenceLevel}:${c.complexityLevel}`),
  );

  const openings: { inference: string; complexity: number }[] = [];
  for (const inference of INFERENCE_LEVELS) {
    for (const complexity of COMPLEXITY_LEVELS) {
      if (!filledSet.has(`${inference}:${complexity}`)) {
        openings.push({ inference, complexity });
      }
    }
  }

  if (openings.length === 0) {
    return <p className="text-sm text-[var(--muted-foreground)]">All lattice positions are populated.</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-xs text-[var(--muted-foreground)] border-b border-[var(--border)]">
          <th className="text-left py-2 font-medium">Inference level</th>
          <th className="text-left py-2 font-medium">Complexity level</th>
          <th className="text-left py-2 font-medium">Status</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[var(--border)]">
        {openings.map(({ inference, complexity }) => (
          <tr key={`${inference}:${complexity}`} className="hover:bg-[var(--muted)] transition-colors">
            <td className="py-2 text-xs">
              <span className="mr-1">{inferenceGlyph[inference]}</span>
              {inference}
            </td>
            <td className="py-2 text-xs">{complexityLabel[complexity]}</td>
            <td className="py-2">
              <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">
                unmeasured
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
