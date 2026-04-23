import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  Hand,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import {
  fetchTrackerCategories,
  fetchTrackerStats,
  fetchWorkContainers,
  fetchFindings,
  type WorkContainer,
  type Finding,
  type TrackerStats,
} from "../../lib/hub-api";
import { cn } from "../../lib/utils";

/* ── Stage definitions ──────────────────────────────────────────────── */

interface StageConfig {
  id: string;
  label: string;
  color: string;
  bg: string;
}

const STAGES: StageConfig[] = [
  { id: "backlog", label: "Backlog", color: "#71717a", bg: "rgba(113,113,122,0.1)" },
  { id: "active", label: "Projects", color: "#6366f1", bg: "rgba(99,102,241,0.1)" },
  { id: "findings", label: "Findings", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  { id: "delivery", label: "Deliveries", color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
  { id: "completed", label: "Done", color: "#16a34a", bg: "rgba(22,163,74,0.1)" },
];

/* ── Execution mode icon ────────────────────────────────────────────── */

function ExecBadge({ mode }: { mode: string | null }) {
  if (!mode) return null;
  const Icon = mode === "automated" ? Bot : mode === "assisted" ? Sparkles : Hand;
  const label = mode === "automated" ? "Automated" : mode === "assisted" ? "Assisted" : "Manual";
  return (
    <span title={label} className="text-[var(--muted-foreground)]">
      <Icon size={12} />
    </span>
  );
}

/* ── Kind badge ─────────────────────────────────────────────────────── */

const KIND_LABELS: Record<string, string> = {
  "crack-resolution": "Crack",
  "extraction-batch": "Extraction",
  surveillance: "Surveillance",
  "opening-extension": "Opening",
  investigation: "Investigation",
  delivery: "Delivery",
};

const TRACK_LABELS: Record<string, string> = {
  paper: "Paper",
  patent: "Patent",
  "customer-report": "Report",
};

function KindBadge({ kind, track }: { kind: string | null; track: string | null }) {
  if (!kind) return null;
  const label = kind === "delivery" && track
    ? TRACK_LABELS[track] || track
    : KIND_LABELS[kind] || kind;
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">
      {label}
    </span>
  );
}

/* ── Category badge ─────────────────────────────────────────────────── */

const CAT_ICONS: Record<string, string> = {
  "plyknot-com": "C",
  "research-lab": "L",
  cybernetics: "Y",
  "plyknot-org": "O",
  research: "R",
  "ip-legal": "I",
  other: "X",
};

/* ── Container card ─────────────────────────────────────────────────── */

function ContainerCard({ c, onClick }: { c: WorkContainer; onClick: () => void }) {
  const progress = c.issue_count > 0 ? Math.round((c.done_count / c.issue_count) * 100) : 0;

  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--card)] hover:border-[var(--primary)]/40 transition-colors group"
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] font-mono px-1 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">
          {CAT_ICONS[c.category_slug] || "?"}
        </span>
        <KindBadge kind={c.kind} track={c.track} />
        <ExecBadge mode={c.execution_mode} />
        <span className="ml-auto text-[10px] text-[var(--muted-foreground)]">
          {c.done_count}/{c.issue_count}
        </span>
      </div>
      <p className="text-xs font-medium text-[var(--foreground)] line-clamp-2 leading-tight">
        {c.title}
      </p>
      {c.issue_count > 0 && (
        <div className="mt-2 h-1 rounded-full bg-[var(--muted)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--primary)] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </button>
  );
}

/* ── Finding card ───────────────────────────────────────────────────── */

function FindingCard({ f }: { f: Finding }) {
  return (
    <div className="px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--card)]">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">
          {f.finding_type}
        </span>
        <span className={cn(
          "text-[10px] px-1.5 py-0.5 rounded",
          f.status === "confirmed" ? "bg-green-500/10 text-green-400" :
          f.status === "draft" ? "bg-zinc-500/10 text-zinc-400" :
          "bg-amber-500/10 text-amber-400",
        )}>
          {f.status}
        </span>
      </div>
      <p className="text-xs font-medium text-[var(--foreground)] line-clamp-2 leading-tight">
        {f.title}
      </p>
      {f.sigma_resolved != null && f.sigma_after != null && (
        <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">
          {f.sigma_resolved.toFixed(1)} &rarr; {f.sigma_after.toFixed(1)}
        </p>
      )}
    </div>
  );
}

/* ── Stage column ───────────────────────────────────────────────────── */

function StageColumn({
  config,
  containers,
  findings,
  selected,
  onClick,
}: {
  config: StageConfig;
  containers: WorkContainer[];
  findings?: Finding[];
  selected: boolean;
  onClick: () => void;
}) {
  const count = config.id === "findings" ? (findings?.length ?? 0) : containers.length;

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center rounded-xl px-6 py-4 min-w-[120px] transition-all cursor-pointer border",
        selected
          ? "border-[var(--primary)] ring-1 ring-[var(--primary)]/30"
          : "border-[var(--border)] hover:border-[var(--primary)]/30",
      )}
      style={{ background: config.bg }}
    >
      <span
        className="text-2xl font-bold tabular-nums"
        style={{ color: config.color }}
      >
        {count}
      </span>
      <span className="text-xs text-[var(--muted-foreground)] mt-1">{config.label}</span>
    </button>
  );
}

/* ── Main pipeline view ─────────────────────────────────────────────── */

export function PipelineView() {
  const navigate = useNavigate();
  const [selectedStage, setSelectedStage] = useState<string>("active");

  const { data: containersData } = useQuery({
    queryKey: ["work-containers"],
    queryFn: () => fetchWorkContainers(),
  });

  const { data: findingsData } = useQuery({
    queryKey: ["findings-all"],
    queryFn: () => fetchFindings(),
  });

  const { data: statsData } = useQuery({
    queryKey: ["trk-stats"],
    queryFn: fetchTrackerStats,
  });

  const containers = containersData?.containers ?? [];
  const findings = findingsData?.findings ?? [];

  // Bucket containers into pipeline stages
  const staged = useMemo(() => {
    const backlog = containers.filter((c) => c.status === "backlog");
    const active = containers.filter((c) => c.status === "active" && c.kind !== "delivery");
    const delivery = containers.filter(
      (c) => c.kind === "delivery" || (c.track != null && c.status !== "completed"),
    );
    const completed = containers.filter((c) => c.status === "completed" || c.status === "archived");
    return { backlog, active, delivery, completed };
  }, [containers]);

  // What to show in the detail panel
  const stageItems = useMemo(() => {
    switch (selectedStage) {
      case "backlog": return staged.backlog;
      case "active": return staged.active;
      case "delivery": return staged.delivery;
      case "completed": return staged.completed;
      default: return [];
    }
  }, [selectedStage, staged]);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* KPI row */}
      {statsData && (
        <div className="flex items-center gap-4 text-xs text-[var(--muted-foreground)]">
          <span>{statsData.total} issues total</span>
          <span className="text-green-400">{statsData.done} done</span>
          <span className="text-indigo-400">{statsData.doing} doing</span>
          <span>{statsData.todo} todo</span>
          <span className="ml-auto">{containers.length} work containers</span>
        </div>
      )}

      {/* Pipeline funnel */}
      <div className="flex items-center gap-2">
        {STAGES.map((stage, i) => (
          <div key={stage.id} className="flex items-center gap-2">
            <StageColumn
              config={stage}
              containers={
                stage.id === "backlog" ? staged.backlog :
                stage.id === "active" ? staged.active :
                stage.id === "delivery" ? staged.delivery :
                stage.id === "completed" ? staged.completed :
                []
              }
              findings={stage.id === "findings" ? findings : undefined}
              selected={selectedStage === stage.id}
              onClick={() => setSelectedStage(stage.id)}
            />
            {i < STAGES.length - 1 && (
              <ArrowRight size={16} className="text-[var(--muted-foreground)]/40 shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* Detail panel */}
      <div>
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: STAGES.find((s) => s.id === selectedStage)?.color }}
          />
          {STAGES.find((s) => s.id === selectedStage)?.label}
          <span className="text-[var(--muted-foreground)] font-normal">
            ({selectedStage === "findings" ? findings.length : stageItems.length})
          </span>
        </h2>

        {selectedStage === "findings" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {findings.length === 0 ? (
              <p className="text-xs text-[var(--muted-foreground)] col-span-full py-8 text-center">
                No findings yet. Run experiments to generate findings.
              </p>
            ) : (
              findings.map((f) => <FindingCard key={f.id} f={f} />)
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {stageItems.length === 0 ? (
              <p className="text-xs text-[var(--muted-foreground)] col-span-full py-8 text-center">
                No items in {STAGES.find((s) => s.id === selectedStage)?.label?.toLowerCase()}.
              </p>
            ) : (
              stageItems.map((c) => (
                <ContainerCard
                  key={c.id}
                  c={c}
                  onClick={() => navigate(`/process/${encodeURIComponent(c.id)}`)}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
