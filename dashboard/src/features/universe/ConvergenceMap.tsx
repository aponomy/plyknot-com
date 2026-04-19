import { cn } from "../../lib/utils";
import type { HeatmapCell } from "../../lib/hub-api";

export interface CellSelection {
  inferenceLevel: string;
  complexityLevel: number;
}

export type MapMode = "cracks" | "openings";

interface ConvergenceMapProps {
  cells: HeatmapCell[];
  mode?: MapMode;
  selected?: CellSelection | null;
  onCellClick?: (cell: HeatmapCell, selection: CellSelection) => void;
  onDeselect?: () => void;
}

const inferenceLabels = ["signal", "measurement", "pattern", "model", "hypothesis"];
const inferenceGlyph: Record<string, string> = {
  signal: "①",
  measurement: "②",
  pattern: "③",
  model: "④",
  hypothesis: "⑤",
};
const complexityLabels = ["L0 fund.", "L1 chem.", "L2 bio.", "L3 org.", "L4 cogn.", "L5 social"];

const cracksStatusColor: Record<string, string> = {
  solid: "bg-[var(--color-success)]",
  tension: "bg-[var(--color-warning)]",
  divergent: "bg-[var(--color-danger)]",
  single: "bg-[var(--color-zinc-600)]",
  empty: "bg-[var(--muted)]",
};

const statusLabel: Record<string, string> = {
  solid: "converged",
  tension: "tension",
  divergent: "divergent",
  single: "single",
  empty: "empty",
};

function getCell(cells: HeatmapCell[], inference: string, complexity: number): HeatmapCell | undefined {
  return cells.find((c) => c.inferenceLevel === inference && c.complexityLevel === complexity);
}

export function ConvergenceMap({ cells, mode = "cracks", selected, onCellClick, onDeselect }: ConvergenceMapProps) {
  const isOpenings = mode === "openings";

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && onDeselect) onDeselect();
      }}
    >
      <div className="overflow-x-auto" onClick={(e) => { if (e.target === e.currentTarget && onDeselect) onDeselect(); }}>
        <table className="w-full text-xs" onClick={(e) => { if (e.target === e.currentTarget && onDeselect) onDeselect(); }}>
          <thead>
            <tr>
              <th className="text-left py-2 pr-2 font-medium text-[var(--muted-foreground)]" />
              {complexityLabels.map((label) => (
                <th key={label} className="text-center py-2 px-1 font-medium text-[var(--muted-foreground)] whitespace-nowrap">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...inferenceLabels].reverse().map((inference) => (
              <tr key={inference}>
                <td className="text-right pr-2 py-1 font-medium text-[var(--muted-foreground)] whitespace-nowrap">
                  <span className="mr-1">{inferenceGlyph[inference]}</span>
                  <span className="font-mono">{inference}</span>
                </td>
                {Array.from({ length: 6 }, (_, complexity) => {
                  const cell = getCell(cells, inference, complexity);
                  const status = cell?.status ?? "empty";
                  const isSelected =
                    selected?.inferenceLevel === inference &&
                    selected?.complexityLevel === complexity;
                  const hasData = cell && cell.total > 0;
                  const isEmpty = !hasData;

                  // Openings mode: empty cells are highlighted, filled cells are dimmed
                  // Cracks mode: normal convergence colouring
                  let bgClass: string;
                  let opacityClass = "";
                  if (isOpenings) {
                    bgClass = "bg-[var(--color-accent)]";
                    if (!isEmpty) {
                      opacityClass = "opacity-25";
                    }
                  } else {
                    bgClass = cracksStatusColor[status];
                    if (status === "empty") opacityClass = "opacity-30";
                  }

                  return (
                    <td key={complexity} className="p-1">
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onCellClick) {
                            const cellData: HeatmapCell = cell ?? { inferenceLevel: inference, complexityLevel: complexity, total: 0, cracked: 0, status: "empty" };
                            onCellClick(cellData, { inferenceLevel: inference, complexityLevel: complexity });
                          }
                        }}
                        title={
                          isOpenings
                            ? `${inference} × L${complexity}: ${isEmpty ? "opening — unmeasured" : `${cell!.total} claims (populated)`}`
                            : `${inference} × L${complexity}: ${status}${cell ? ` (${cell.total} claims, ${cell.cracked} cracked)` : ""}`
                        }
                        className={cn(
                          "relative h-9 rounded-md transition-all cursor-pointer hover:opacity-80 flex items-center justify-center",
                          bgClass,
                          opacityClass,
                          isSelected && "ring-2 ring-[var(--foreground)] ring-offset-1 ring-offset-[var(--background)]",
                        )}
                      >
                        {isOpenings ? (
                          <span className={cn("font-mono text-xs", isEmpty ? "text-white/80" : "text-white/20")}>—</span>
                        ) : (
                          hasData && (
                            <>
                              <span className="font-mono font-semibold text-white text-sm">
                                {cell.total}
                              </span>
                              {cell.cracked > 0 && (
                                <span className="absolute bottom-0.5 right-1 font-mono text-[10px] text-white/70">
                                  {cell.cracked}
                                </span>
                              )}
                            </>
                          )
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-xs text-[var(--muted-foreground)]">
        {isOpenings ? (
          <>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-[var(--color-accent)]" />
              <span>opening (unmeasured)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-[var(--color-zinc-700)] opacity-30" />
              <span>populated</span>
            </div>
          </>
        ) : (
          <>
            {Object.entries(cracksStatusColor).map(([status, color]) => (
              <div key={status} className="flex items-center gap-1.5">
                <div className={cn("w-3 h-3 rounded-sm", color, status === "empty" && "opacity-30")} />
                <span>{statusLabel[status]}</span>
              </div>
            ))}
            <span className="ml-2 opacity-60">cell: total · subscript: cracked</span>
          </>
        )}
      </div>
    </div>
  );
}
