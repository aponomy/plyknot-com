import { cn } from "../../lib/utils";
import { projects, type Project, type ProjectKind } from "../../lib/mock-data";

export type ProjectCategory = "crack" | "opening" | "investigation";

export interface ProjectCellSelection {
  inferenceLevel: string;
  complexityLevel: number;
  category: ProjectCategory;
}

interface ProjectsMapProps {
  includeArchived: boolean;
  selected: ProjectCellSelection | null;
  onCellClick: (selection: ProjectCellSelection, cellProjects: Project[]) => void;
  onDeselect: () => void;
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

const categoryColor: Record<ProjectCategory, string> = {
  crack: "bg-[var(--color-danger)]",
  opening: "bg-[var(--color-success)]",
  investigation: "bg-[var(--color-accent)]",
};


function kindToCategory(kind: ProjectKind): ProjectCategory | null {
  if (kind === "crack-resolution") return "crack";
  if (kind === "opening-extension") return "opening";
  if (kind === "investigation") return "investigation";
  return null; // extraction/surveillance don't map to a category
}

interface CellCounts {
  crack: number;
  opening: number;
  investigation: number;
  total: number;
  projects: Project[];
}

function buildGrid(includeArchived: boolean): Map<string, CellCounts> {
  const grid = new Map<string, CellCounts>();
  const filtered = projects.filter((p) => includeArchived || !p.archived);

  for (const p of filtered) {
    const cat = kindToCategory(p.kind);
    if (!cat || !p.gridPositions) continue;

    for (const pos of p.gridPositions) {
      const key = `${pos.inference}:${pos.complexity}`;
      if (!grid.has(key)) {
        grid.set(key, { crack: 0, opening: 0, investigation: 0, total: 0, projects: [] });
      }
      const cell = grid.get(key)!;
      cell[cat]++;
      cell.total++;
      cell.projects.push(p);
    }
  }
  // Also include extraction batches that have grid positions
  for (const p of filtered) {
    if (p.kind === "extraction-batch" && p.gridPositions) {
      for (const pos of p.gridPositions) {
        const key = `${pos.inference}:${pos.complexity}`;
        if (!grid.has(key)) {
          grid.set(key, { crack: 0, opening: 0, investigation: 0, total: 0, projects: [] });
        }
        const cell = grid.get(key)!;
        if (!cell.projects.includes(p)) {
          cell.total++;
          cell.projects.push(p);
        }
      }
    }
  }
  return grid;
}

export function ProjectsMap({ includeArchived, selected, onCellClick, onDeselect }: ProjectsMapProps) {
  const grid = buildGrid(includeArchived);

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onDeselect(); }}
    >
      <div className="overflow-x-auto" onClick={(e) => { if (e.target === e.currentTarget) onDeselect(); }}>
        <table className="w-full text-xs" onClick={(e) => { if (e.target === e.currentTarget) onDeselect(); }}>
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
                  const key = `${inference}:${complexity}`;
                  const cell = grid.get(key);

                  const isSel = (cat: ProjectCategory) =>
                    selected?.inferenceLevel === inference &&
                    selected?.complexityLevel === complexity &&
                    selected?.category === cat;

                  function clickSub(e: React.MouseEvent, cat: ProjectCategory) {
                    e.stopPropagation();
                    const catKinds: Record<ProjectCategory, ProjectKind[]> = {
                      crack: ["crack-resolution"],
                      opening: ["opening-extension"],
                      investigation: ["investigation"],
                    };
                    const filtered = (cell?.projects ?? []).filter((p) => catKinds[cat].includes(p.kind));
                    onCellClick(
                      { inferenceLevel: inference, complexityLevel: complexity, category: cat },
                      filtered,
                    );
                  }

                  return (
                    <td key={complexity} className="p-1">
                      <div className="flex h-9 rounded-md gap-px relative">
                        {/* Crack sub-cell */}
                        <div
                          onClick={(e) => clickSub(e, "crack")}
                          className={cn(
                            "flex-1 flex items-center justify-center cursor-pointer transition-all hover:opacity-80",
                            (cell?.crack ?? 0) > 0 ? categoryColor.crack : "bg-[var(--color-danger)]/10",
                            isSel("crack") && "ring-2 ring-[var(--foreground)] ring-offset-1 ring-offset-[var(--background)] z-10 rounded-sm",
                          )}
                        >
                          {(cell?.crack ?? 0) > 0 && (
                            <span className="text-[10px] font-mono font-bold text-white">{cell!.crack}</span>
                          )}
                        </div>
                        {/* Opening sub-cell */}
                        <div
                          onClick={(e) => clickSub(e, "opening")}
                          className={cn(
                            "flex-1 flex items-center justify-center cursor-pointer transition-all hover:opacity-80",
                            (cell?.opening ?? 0) > 0 ? categoryColor.opening : "bg-[var(--color-success)]/10",
                            isSel("opening") && "ring-2 ring-[var(--foreground)] ring-offset-1 ring-offset-[var(--background)] z-10 rounded-sm",
                          )}
                        >
                          {(cell?.opening ?? 0) > 0 && (
                            <span className="text-[10px] font-mono font-bold text-white">{cell!.opening}</span>
                          )}
                        </div>
                        {/* Investigation sub-cell */}
                        <div
                          onClick={(e) => clickSub(e, "investigation")}
                          className={cn(
                            "flex-1 flex items-center justify-center cursor-pointer transition-all hover:opacity-80",
                            (cell?.investigation ?? 0) > 0 ? categoryColor.investigation : "bg-[var(--color-accent)]/10",
                            isSel("investigation") && "ring-2 ring-[var(--foreground)] ring-offset-1 ring-offset-[var(--background)] z-10 rounded-sm",
                          )}
                        >
                          {(cell?.investigation ?? 0) > 0 && (
                            <span className="text-[10px] font-mono font-bold text-white">{cell!.investigation}</span>
                          )}
                        </div>
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
      <div className="flex items-center justify-end gap-4 mt-3 text-xs text-[var(--muted-foreground)]">
        <div className="flex items-center gap-1.5">
          <div className={cn("w-3 h-3 rounded-sm", categoryColor.crack)} />
          <span>crack-resolution</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={cn("w-3 h-3 rounded-sm", categoryColor.opening)} />
          <span>opening-extension</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={cn("w-3 h-3 rounded-sm", categoryColor.investigation)} />
          <span>investigation</span>
        </div>
      </div>
    </div>
  );
}
