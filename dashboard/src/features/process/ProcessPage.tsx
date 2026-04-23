import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PipelineView } from "./PipelineView";
import { TrackerPage } from "../tracker/TrackerPage";
import { cn } from "../../lib/utils";

type ViewMode = "pipeline" | "themes" | "timeline";

const VIEWS: { id: ViewMode; label: string }[] = [
  { id: "pipeline", label: "Pipeline" },
  { id: "themes", label: "Themes" },
  { id: "timeline", label: "Timeline" },
];

export function ProcessPage() {
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState<ViewMode>(
    (params.get("view") as ViewMode) || "pipeline",
  );

  function switchView(v: ViewMode) {
    setView(v);
    setParams((p) => {
      p.set("view", v);
      return p;
    });
  }

  return (
    <div className="space-y-0 -m-6">
      {/* View mode tabs */}
      <div className="flex items-center gap-1 px-6 pt-4 pb-2 border-b border-[var(--border)] bg-[var(--card)]">
        <h1 className="text-sm font-semibold mr-4">Process</h1>
        {VIEWS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => switchView(id)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
              view === id
                ? "bg-[var(--muted)] text-[var(--foreground)]"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]/50",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6">
        {view === "pipeline" && <PipelineView />}
        {view === "themes" && <TrackerPage />}
        {view === "timeline" && (
          <div className="text-sm text-[var(--muted-foreground)] py-12 text-center">
            Timeline view coming soon — 13-week diamond view across all pipeline stages.
          </div>
        )}
      </div>
    </div>
  );
}
