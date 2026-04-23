import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Bot,
  Hand,
  Sparkles,
} from "lucide-react";
import {
  fetchWorkContainers,
  fetchFindings,
  type WorkContainer,
  type Finding,
} from "../../lib/hub-api";
import { KpiCard } from "../../components/ui/kpi-card";
import { cn } from "../../lib/utils";

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

/* ── Stage key ──────────────────────────────────────────────────────── */

type StageKey = "backlog" | "active" | "findings" | "delivery" | "completed";

/* ── Main pipeline view ─────────────────────────────────────────────── */

export function PipelineView() {
  const navigate = useNavigate();
  const [selectedStage, setSelectedStage] = useState<StageKey>("active");

  // Only fetch pipeline containers (kind IS NOT NULL)
  const { data: containersData } = useQuery({
    queryKey: ["pipeline-containers"],
    queryFn: () => fetchWorkContainers({ pipeline: true }),
  });

  const { data: findingsData } = useQuery({
    queryKey: ["findings-all"],
    queryFn: () => fetchFindings(),
  });

  const containers = containersData?.containers ?? [];
  const findings = findingsData?.findings ?? [];

  // Bucket containers into pipeline stages
  const staged = useMemo(() => {
    const backlog = containers.filter((c) => c.status === "backlog");
    const active = containers.filter((c) => c.status === "active" && c.kind !== "delivery");
    const delivery = containers.filter(
      (c) => c.kind === "delivery" && c.status !== "completed",
    );
    const completed = containers.filter((c) => c.status === "completed" || c.status === "archived");
    return { backlog, active, delivery, completed };
  }, [containers]);

  const pendingFindings = findings.filter((f) => f.triage === "pending" || !f.triage);

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
      {/* KPI header row — matching Universe / Factory style */}
      <div className="grid grid-cols-5 gap-4">
        <KpiCard
          title="Backlog"
          value={staged.backlog.length}
          active={selectedStage === "backlog"}
          onClick={() => setSelectedStage("backlog")}
        />
        <KpiCard
          title="Projects"
          value={staged.active.length}
          delta={staged.active.length > 0 ? `${containers.filter((c) => c.execution_mode === "automated").length} automated` : undefined}
          active={selectedStage === "active"}
          onClick={() => setSelectedStage("active")}
        />
        <KpiCard
          title="Findings"
          value={pendingFindings.length}
          delta={findings.length > 0 ? `${findings.length} total` : undefined}
          active={selectedStage === "findings"}
          onClick={() => setSelectedStage("findings")}
        />
        <KpiCard
          title="Deliveries"
          value={staged.delivery.length}
          active={selectedStage === "delivery"}
          onClick={() => setSelectedStage("delivery")}
        />
        <KpiCard
          title="Done"
          value={staged.completed.length}
          active={selectedStage === "completed"}
          onClick={() => setSelectedStage("completed")}
        />
      </div>

      {/* Detail panel */}
      <div>
        <h2 className="text-sm font-semibold mb-3">
          {selectedStage === "backlog" ? "Backlog" :
           selectedStage === "active" ? "Active Projects" :
           selectedStage === "findings" ? "Pending Findings" :
           selectedStage === "delivery" ? "Active Deliveries" :
           "Completed"}
          <span className="text-[var(--muted-foreground)] font-normal ml-2">
            ({selectedStage === "findings" ? pendingFindings.length : stageItems.length})
          </span>
        </h2>

        {selectedStage === "findings" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingFindings.length === 0 ? (
              <p className="text-xs text-[var(--muted-foreground)] col-span-full py-8 text-center">
                No pending findings. Run experiments to generate findings.
              </p>
            ) : (
              pendingFindings.map((f) => <FindingCard key={f.id} f={f} />)
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {stageItems.length === 0 ? (
              <p className="text-xs text-[var(--muted-foreground)] col-span-full py-8 text-center">
                {selectedStage === "backlog"
                  ? "No backlog items. Create a container with status \"backlog\" to add ideas."
                  : selectedStage === "active"
                  ? "No active projects. Promote backlog items or create a project."
                  : selectedStage === "delivery"
                  ? "No active deliveries. Spawn a delivery from a finding."
                  : "No completed items yet."}
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
