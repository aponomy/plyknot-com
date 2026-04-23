import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Bot,
  Hand,
  Sparkles,
  ArrowRight,
  CircleDot,
  FileText,
  Lightbulb,
  Package,
} from "lucide-react";
import {
  fetchProcessStreams,
  type Stream,
  type StreamFinding,
  type StreamDelivery,
} from "../../lib/hub-api";
import { KpiCard } from "../../components/ui/kpi-card";
import { cn } from "../../lib/utils";

/* ── Helpers ────────────────────────────────────────────────────────── */

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

const STATUS_COLORS: Record<string, string> = {
  backlog: "text-zinc-400",
  active: "text-indigo-400",
  paused: "text-amber-400",
  completed: "text-green-400",
  blocked: "text-red-400",
  archived: "text-zinc-500",
};

function ExecIcon({ mode }: { mode: string | null }) {
  if (!mode) return null;
  const Icon = mode === "automated" ? Bot : mode === "assisted" ? Sparkles : Hand;
  return <Icon size={11} className="text-[var(--muted-foreground)]" />;
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  if (total === 0) return null;
  const pct = Math.round((done / total) * 100);
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-12 h-1 rounded-full bg-[var(--muted)] overflow-hidden">
        <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[9px] text-[var(--muted-foreground)] tabular-nums">{done}/{total}</span>
    </div>
  );
}

/* ── Stream row ─────────────────────────────────────────────────────── */

function StreamRow({ stream }: { stream: Stream }) {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] items-start gap-x-3 py-3 border-b border-[var(--border)] last:border-0">
      {/* Initiation / Source */}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <CircleDot size={11} className={STATUS_COLORS[stream.status] || "text-zinc-400"} />
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">
            {stream.source_type || "internal"}
          </span>
        </div>
        <p className="text-[10px] text-[var(--muted-foreground)] truncate">
          {stream.source_ref || "—"}
        </p>
      </div>

      <ArrowRight size={14} className="text-[var(--muted-foreground)]/30 mt-1 shrink-0" />

      {/* Project */}
      <button
        onClick={() => navigate(`/process/${encodeURIComponent(stream.id)}`)}
        className="min-w-0 text-left px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] hover:border-[var(--primary)]/40 transition-colors"
      >
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">
            {KIND_LABELS[stream.kind] || stream.kind}
          </span>
          <ExecIcon mode={stream.execution_mode} />
          <span className={cn("text-[10px] ml-auto", STATUS_COLORS[stream.status])}>
            {stream.status}
          </span>
        </div>
        <p className="text-xs font-medium text-[var(--foreground)] truncate leading-tight">
          {stream.title}
        </p>
        <ProgressBar done={stream.done_count} total={stream.issue_count} />
      </button>

      <ArrowRight size={14} className="text-[var(--muted-foreground)]/30 mt-1 shrink-0" />

      {/* Findings */}
      <div className="min-w-0 space-y-1">
        {stream.findings.length === 0 ? (
          <p className="text-[10px] text-[var(--muted-foreground)] py-2">—</p>
        ) : (
          stream.findings.map((f) => (
            <FindingPill key={f.id} f={f} />
          ))
        )}
      </div>

      <ArrowRight size={14} className="text-[var(--muted-foreground)]/30 mt-1 shrink-0" />

      {/* Deliveries */}
      <div className="min-w-0 space-y-1">
        {stream.deliveries.length === 0 ? (
          <p className="text-[10px] text-[var(--muted-foreground)] py-2">—</p>
        ) : (
          stream.deliveries.map((d) => (
            <DeliveryPill key={d.id} d={d} />
          ))
        )}
      </div>
    </div>
  );
}

/* ── Finding pill ───────────────────────────────────────────────────── */

function FindingPill({ f }: { f: StreamFinding }) {
  return (
    <div className="px-2 py-1 rounded border border-[var(--border)] bg-[var(--card)]">
      <div className="flex items-center gap-1 mb-0.5">
        <Lightbulb size={10} className="text-amber-400 shrink-0" />
        <span className={cn(
          "text-[9px] px-1 rounded",
          f.status === "confirmed" ? "bg-green-500/10 text-green-400" :
          f.status === "draft" ? "bg-zinc-500/10 text-zinc-400" :
          "bg-amber-500/10 text-amber-400",
        )}>
          {f.status}
        </span>
      </div>
      <p className="text-[10px] text-[var(--foreground)] line-clamp-2 leading-tight">{f.title}</p>
    </div>
  );
}

/* ── Delivery pill ──────────────────────────────────────────────────── */

function DeliveryPill({ d }: { d: StreamDelivery }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`/process/${encodeURIComponent(d.id)}`)}
      className="w-full text-left px-2 py-1 rounded border border-[var(--border)] bg-[var(--card)] hover:border-[var(--primary)]/40 transition-colors"
    >
      <div className="flex items-center gap-1 mb-0.5">
        {d.track === "paper" ? (
          <FileText size={10} className="text-violet-400 shrink-0" />
        ) : (
          <Package size={10} className="text-violet-400 shrink-0" />
        )}
        <span className="text-[9px] px-1 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">
          {d.track ? TRACK_LABELS[d.track] || d.track : "Delivery"}
        </span>
        {d.delivery_status && (
          <span className="text-[9px] text-[var(--muted-foreground)] ml-auto">
            {d.delivery_status}
          </span>
        )}
      </div>
      <p className="text-[10px] text-[var(--foreground)] line-clamp-2 leading-tight">{d.title}</p>
      <ProgressBar done={d.done_count} total={d.issue_count} />
    </button>
  );
}

/* ── Column headers ─────────────────────────────────────────────────── */

function ColumnHeaders() {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] items-center gap-x-3 pb-2 border-b border-[var(--border)]">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Initiation</p>
      <span />
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Project</p>
      <span />
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Findings</p>
      <span />
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Deliveries</p>
    </div>
  );
}

/* ── Main pipeline view ─────────────────────────────────────────────── */

export function PipelineView() {
  const { data, isLoading } = useQuery({
    queryKey: ["process-streams"],
    queryFn: fetchProcessStreams,
  });

  const streams = data?.streams ?? [];
  const orphanFindings = data?.orphan_findings ?? [];
  const orphanDeliveries = data?.orphan_deliveries ?? [];

  const backlogCount = streams.filter((s) => s.status === "backlog").length;
  const activeCount = streams.filter((s) => s.status === "active" && s.kind !== "delivery").length;
  const findingsCount = streams.reduce((n, s) => n + s.findings.length, 0) + orphanFindings.length;
  const deliveryCount = streams.reduce((n, s) => n + s.deliveries.length, 0) + orphanDeliveries.length;
  const doneCount = streams.filter((s) => s.status === "completed").length;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* KPI header */}
      <div className="grid grid-cols-5 gap-4">
        <KpiCard title="Backlog" value={backlogCount} />
        <KpiCard title="Projects" value={activeCount} />
        <KpiCard title="Findings" value={findingsCount} />
        <KpiCard title="Deliveries" value={deliveryCount} />
        <KpiCard title="Done" value={doneCount} />
      </div>

      {/* Stream table */}
      <div>
        <ColumnHeaders />

        {isLoading ? (
          <p className="text-xs text-[var(--muted-foreground)] py-8 text-center">Loading...</p>
        ) : streams.length === 0 && orphanFindings.length === 0 && orphanDeliveries.length === 0 ? (
          <p className="text-xs text-[var(--muted-foreground)] py-8 text-center">
            No pipeline streams yet. Create a project with a kind (crack-resolution, investigation, etc.) to start a stream.
          </p>
        ) : (
          <div>
            {streams.map((s) => (
              <StreamRow key={s.id} stream={s} />
            ))}

            {/* Orphan findings / deliveries at the bottom */}
            {(orphanFindings.length > 0 || orphanDeliveries.length > 0) && (
              <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] items-start gap-x-3 py-3 border-t border-dashed border-[var(--border)]">
                <div />
                <span />
                <div />
                <span />
                <div className="space-y-1">
                  {orphanFindings.map((f) => (
                    <FindingPill key={f.id} f={f} />
                  ))}
                </div>
                <ArrowRight size={14} className="text-[var(--muted-foreground)]/30 mt-1 shrink-0" />
                <div className="space-y-1">
                  {orphanDeliveries.map((d) => (
                    <DeliveryPill key={d.id} d={d} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
