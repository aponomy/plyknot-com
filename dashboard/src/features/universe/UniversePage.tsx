import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle } from "../../components/ui/card";
import { KpiCard } from "../../components/ui/kpi-card";
import { DataSourceToggle } from "./DataSourceToggle";
import { ConvergenceMap, type CellSelection } from "./ConvergenceMap";
import { cn } from "../../lib/utils";
import {
  fetchStats,
  fetchHeatmap,
  fetchChains,
  fetchCracks,
  type DataSource,
  type Crack,
  type HeatmapCell,
} from "../../lib/hub-api";

type ActiveView = "cracks" | "openings" | "chains" | "couplings" | "entities";

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

export function UniversePage() {
  const [source, setSource] = useState<DataSource>("plyknot.org");
  const [view, setView] = useState<ActiveView>("cracks");
  const [selectedCell, setSelectedCell] = useState<CellSelection | null>(null);
  const [selectedCellData, setSelectedCellData] = useState<HeatmapCell | null>(null);

  const stats = useQuery({
    queryKey: ["stats", source],
    queryFn: () => fetchStats(source),
  });

  const heatmap = useQuery({
    queryKey: ["heatmap", source],
    queryFn: () => fetchHeatmap(source),
  });

  const chains = useQuery({
    queryKey: ["chains", source],
    queryFn: () => fetchChains(source),
  });

  const cracks = useQuery({
    queryKey: ["cracks", source],
    queryFn: () => fetchCracks(source),
  });

  const isLoading = stats.isLoading || heatmap.isLoading;
  const hasError = stats.isError || heatmap.isError;

  // Compute openings count: lattice positions with no data
  const openingsCount = useMemo(() => {
    if (!heatmap.data) return 0;
    const filledCells = heatmap.data.cells.filter((c) => c.total > 0).length;
    return TOTAL_CELLS - filledCells;
  }, [heatmap.data]);

  function handleCellClick(cell: HeatmapCell, selection: CellSelection) {
    if (
      selectedCell?.inferenceLevel === selection.inferenceLevel &&
      selectedCell?.complexityLevel === selection.complexityLevel
    ) {
      deselect();
    } else {
      setSelectedCell(selection);
      setSelectedCellData(cell);
    }
  }

  function deselect() {
    setSelectedCell(null);
    setSelectedCellData(null);
  }

  // Filter cracks to the selected cell's inference level
  const cellCracks: Crack[] = selectedCell && cracks.data
    ? cracks.data.cracks.filter((c) => c.level === selectedCell.inferenceLevel)
    : [];

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Universe</h1>
        <DataSourceToggle value={source} onChange={setSource} />
      </div>

      {/* Error state */}
      {hasError && (
        <div className="rounded-lg border border-[var(--color-danger)] bg-[var(--color-danger)]/5 p-3 text-sm text-[var(--color-danger)]">
          Failed to load from {source}. {source === "plyknot.com" ? "Check authentication." : "Hub may be down."}
        </div>
      )}

      {/* KPI boxes — clickable navigation */}
      {stats.data && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <KpiCard title="Cracks" value={stats.data.crackCount} delta={`across ${stats.data.chainCount} chains`} trend="down" active={view === "cracks"} onClick={() => { setView("cracks"); deselect(); }} />
          <KpiCard title="Openings" value={openingsCount} delta={`of ${TOTAL_CELLS} positions`} active={view === "openings"} onClick={() => { setView("openings"); deselect(); }} />
          <KpiCard title="Chains" value={stats.data.chainCount} active={view === "chains"} onClick={() => { setView("chains"); deselect(); }} />
          <KpiCard title="Couplings" value={stats.data.couplingCount.toLocaleString()} active={view === "couplings"} onClick={() => { setView("couplings"); deselect(); }} />
          <KpiCard title="Entities" value={stats.data.entityCount} active={view === "entities"} onClick={() => { setView("entities"); deselect(); }} />
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
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[var(--muted-foreground)]">
                    {selectedCellData.total} claims · {selectedCellData.cracked} cracked
                  </span>
                  <span className={cn(
                    "text-xs px-1.5 py-0.5 rounded",
                    selectedCellData.status === "divergent" && "bg-[color:var(--color-danger)]/10 text-[var(--color-danger)]",
                    selectedCellData.status === "tension" && "bg-[color:var(--color-warning)]/10 text-[var(--color-warning)]",
                    selectedCellData.status === "solid" && "bg-[color:var(--color-success)]/10 text-[var(--color-success)]",
                    (selectedCellData.status === "single" || selectedCellData.status === "empty") && "bg-[var(--muted)] text-[var(--muted-foreground)]",
                  )}>
                    {selectedCellData.status}
                  </span>
                  <button
                    onClick={deselect}
                    className="w-5 h-5 flex items-center justify-center rounded text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors ml-2"
                    title="Close"
                  >
                    ✕
                  </button>
                </div>
              </CardHeader>

              {view === "cracks" ? (
                cellCracks.length > 0 ? (
                  <div className="divide-y divide-[var(--border)]">
                    {cellCracks.map((crack) => (
                      <div key={crack.crack_id} className="py-3 first:pt-0 last:pb-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{crack.chain}</span>
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

      {/* === VIEW: Couplings === */}
      {view === "couplings" && (
        <Card>
          <CardHeader>
            <CardTitle>Couplings</CardTitle>
            {stats.data && (
              <span className="text-xs text-[var(--muted-foreground)]">
                {stats.data.couplingCount.toLocaleString()} total
              </span>
            )}
          </CardHeader>
          <p className="text-sm text-[var(--muted-foreground)]">
            Coupling browser — query via Hub API or MCP tools.
          </p>
        </Card>
      )}

      {/* === VIEW: Entities === */}
      {view === "entities" && (
        <Card>
          <CardHeader>
            <CardTitle>Entities</CardTitle>
            {stats.data && (
              <span className="text-xs text-[var(--muted-foreground)]">
                {stats.data.entityCount} total
              </span>
            )}
          </CardHeader>
          <p className="text-sm text-[var(--muted-foreground)]">
            Entity browser — query via Hub API or MCP tools.
          </p>
        </Card>
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
            <td className="py-2 font-mono text-xs">{crack.chain}</td>
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
