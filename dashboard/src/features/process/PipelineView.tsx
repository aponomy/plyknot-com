import { useState, useCallback } from "react";
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
  Pin,
  X,
  Workflow,
} from "lucide-react";
import {
  fetchProcessStreams,
  fetchWorkContainer,
  type Stream,
  type StreamFinding,
  type StreamDelivery,
  type WorkContainer,
  type TrackerIssue,
  type Finding,
} from "../../lib/hub-api";
import { cn } from "../../lib/utils";

/* ── Constants ──────────────────────────────────────────────────────── */


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

/* ── Shared components ──────────────────────────────────────────────── */

function ExecIcon({ mode }: { mode: string | null }) {
  if (!mode) return null;
  const Icon = mode === "automated" ? Bot : mode === "assisted" ? Sparkles : Hand;
  return <Icon size={11} className="text-[var(--muted-foreground)]" />;
}

function ProgressBar({ done, total, wide }: { done: number; total: number; wide?: boolean }) {
  if (total === 0) return null;
  const pct = Math.round((done / total) * 100);
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn("h-1 rounded-full bg-[var(--muted)] overflow-hidden", wide ? "flex-1" : "w-12")}>
        <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[9px] text-[var(--muted-foreground)] tabular-nums">{done}/{total}</span>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Stream row (for pipeline view)
   ════════════════════════════════════════════════════════════════════════ */

function StreamRow({ stream, onOpenDrawer }: { stream: Stream; onOpenDrawer: (id: string) => void }) {
  const hasFindings = stream.findings.length > 0;
  const hasDeliveries = stream.deliveries.length > 0;
  const hasSource = !!stream.source_type || !!stream.source_ref;

  return (
    <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] items-start gap-x-3 py-4 px-4 rounded-lg bg-[var(--muted)] mb-2">
      {/* Initiation */}
      <div className="min-w-0">
        {hasSource ? (
          <div className="px-2 py-1.5 rounded border border-[var(--border)] bg-[var(--card)]">
            <div className="flex items-center gap-1.5 mb-0.5">
              <CircleDot size={11} className={STATUS_COLORS[stream.status] || "text-zinc-400"} />
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">
                {stream.source_type || "internal"}
              </span>
            </div>
            {stream.source_ref && (
              <p className="text-[10px] text-[var(--muted-foreground)] truncate">{stream.source_ref}</p>
            )}
          </div>
        ) : null}
      </div>

      {/* Arrow: initiation → project (always shown, project always exists) */}
      <ArrowRight size={14} className="text-[var(--muted-foreground)]/30 mt-2 shrink-0" />

      {/* Project */}
      <button
        onClick={() => onOpenDrawer(stream.id)}
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

      {/* Arrow: project → findings (only if findings exist) */}
      {hasFindings ? (
        <ArrowRight size={14} className="text-[var(--muted-foreground)]/30 mt-2 shrink-0" />
      ) : <span />}

      {/* Findings */}
      <div className="min-w-0 space-y-1">
        {stream.findings.map((f) => (
          <SmallFindingPill key={f.id} f={f} />
        ))}
      </div>

      {/* Arrow: findings → deliveries (only if deliveries exist) */}
      {hasDeliveries ? (
        <ArrowRight size={14} className="text-[var(--muted-foreground)]/30 mt-2 shrink-0" />
      ) : <span />}

      {/* Deliveries */}
      <div className="min-w-0 space-y-1">
        {stream.deliveries.map((d) => (
          <SmallDeliveryPill key={d.id} d={d} onOpen={() => onOpenDrawer(d.id)} />
        ))}
      </div>
    </div>
  );
}

function SmallFindingPill({ f }: { f: StreamFinding }) {
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

function SmallDeliveryPill({ d, onOpen }: { d: StreamDelivery; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
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
      </div>
      <p className="text-[10px] text-[var(--foreground)] line-clamp-2 leading-tight">{d.title}</p>
      <ProgressBar done={d.done_count} total={d.issue_count} />
    </button>
  );
}

function ColumnHeaders({ streams, orphanFindings, orphanDeliveries }: { streams: Stream[]; orphanFindings: StreamFinding[]; orphanDeliveries: StreamDelivery[] }) {
  const initiationCount = streams.filter((s) => s.source_type || s.source_ref).length;
  const projectCount = streams.length;
  const findingsCount = streams.reduce((n, s) => n + s.findings.length, 0) + orphanFindings.length;
  const deliveriesCount = streams.reduce((n, s) => n + s.deliveries.length, 0) + orphanDeliveries.length;

  return (
    <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] items-center gap-x-3 pb-2 border-b border-[var(--border)]">
      <p className="text-xs font-semibold text-[var(--foreground)]">Initiation {initiationCount > 0 && <span className="text-[var(--muted-foreground)] font-normal">({initiationCount})</span>}</p>
      <span />
      <p className="text-xs font-semibold text-[var(--foreground)]">Project {projectCount > 0 && <span className="text-[var(--muted-foreground)] font-normal">({projectCount})</span>}</p>
      <span />
      <p className="text-xs font-semibold text-[var(--foreground)]">Findings {findingsCount > 0 && <span className="text-[var(--muted-foreground)] font-normal">({findingsCount})</span>}</p>
      <span />
      <p className="text-xs font-semibold text-[var(--foreground)]">Deliveries {deliveriesCount > 0 && <span className="text-[var(--muted-foreground)] font-normal">({deliveriesCount})</span>}</p>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Drawer — slides in from right showing container detail
   ════════════════════════════════════════════════════════════════════════ */

function ContainerDrawer({ containerId, onClose }: { containerId: string; onClose: () => void }) {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["container-detail", containerId],
    queryFn: () => fetchWorkContainer(containerId),
    enabled: !!containerId,
  });

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const container = data;
  const issues = (data as any)?.issues as TrackerIssue[] | undefined;
  const findings = (data as any)?.findings as Finding[] | undefined;
  const children = (data as any)?.children as WorkContainer[] | undefined;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div className="fixed top-0 right-0 h-full w-[560px] max-w-[90vw] bg-[var(--background)] border-l border-[var(--border)] z-50 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="sticky top-0 bg-[var(--background)] border-b border-[var(--border)] px-5 py-3 flex items-center gap-3 z-10">
          <div className="flex-1 min-w-0">
            {container ? (
              <>
                <div className="flex items-center gap-2 mb-0.5">
                  {container.kind && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">
                      {container.kind === "delivery" && container.track
                        ? TRACK_LABELS[container.track] || container.track
                        : KIND_LABELS[container.kind] || container.kind}
                    </span>
                  )}
                  <span className={cn("text-[10px]", STATUS_COLORS[container.status])}>
                    {container.status}
                  </span>
                </div>
                <h2 className="text-sm font-semibold truncate">{container.title}</h2>
              </>
            ) : (
              <h2 className="text-sm font-semibold text-[var(--muted-foreground)]">Loading...</h2>
            )}
          </div>

          <button
            onClick={() => navigate(`/process/${encodeURIComponent(containerId)}`)}
            title="Pin — open as full page"
            className="p-1.5 rounded hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            <Pin size={14} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-5">
          {isLoading && (
            <p className="text-xs text-[var(--muted-foreground)]">Loading details...</p>
          )}

          {container?.description && (
            <p className="text-xs text-[var(--muted-foreground)]">{container.description}</p>
          )}

          {/* Progress */}
          {container && container.issue_count > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
                Progress
              </p>
              <ProgressBar done={container.done_count} total={container.issue_count} wide />
            </div>
          )}

          {/* Budget */}
          {container?.budget_usd != null && (
            <div className="flex gap-4 text-xs">
              <div>
                <span className="text-[var(--muted-foreground)]">Budget:</span>{" "}
                <span className="font-mono">${container.budget_usd}</span>
              </div>
              {container.spent_usd != null && (
                <div>
                  <span className="text-[var(--muted-foreground)]">Spent:</span>{" "}
                  <span className="font-mono">${container.spent_usd}</span>
                </div>
              )}
            </div>
          )}

          {/* Issues */}
          {issues && issues.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
                Issues ({issues.length})
              </p>
              <div className="space-y-1">
                {issues.map((issue) => (
                  <div
                    key={issue.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded text-xs border border-[var(--border)] bg-[var(--card)]"
                  >
                    <span className={cn(
                      "w-1.5 h-1.5 rounded-full shrink-0",
                      issue.status === "done" ? "bg-green-400" :
                      issue.status === "doing" ? "bg-indigo-400" :
                      "bg-zinc-400",
                    )} />
                    <span className="text-[10px] font-mono text-[var(--muted-foreground)] shrink-0">
                      {issue.priority}
                    </span>
                    <span className="flex-1 truncate text-[var(--foreground)]">{issue.title}</span>
                    {issue.target_date && (
                      <span className="text-[10px] text-[var(--muted-foreground)] shrink-0">
                        {issue.target_date}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Findings */}
          {findings && findings.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
                Findings ({findings.length})
              </p>
              <div className="space-y-2">
                {findings.map((f) => (
                  <div key={f.id} className="px-3 py-2 rounded border border-[var(--border)] bg-[var(--card)]">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Lightbulb size={11} className="text-amber-400" />
                      <span className="text-[10px] text-[var(--muted-foreground)]">{f.finding_type}</span>
                      <span className="text-[10px] text-[var(--muted-foreground)] ml-auto">{f.status}</span>
                    </div>
                    <p className="text-xs text-[var(--foreground)]">{f.title}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Children */}
          {children && children.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
                Sub-projects ({children.length})
              </p>
              <div className="space-y-1">
                {children.map((child) => (
                  <div key={child.id} className="px-2 py-1.5 rounded border border-[var(--border)] bg-[var(--card)] text-xs">
                    <span className="text-[var(--foreground)]">{child.title}</span>
                    <span className={cn("ml-2 text-[10px]", STATUS_COLORS[child.status])}>{child.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Main pipeline view
   ════════════════════════════════════════════════════════════════════════ */

export function PipelineView() {
  const [drawerId, setDrawerId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["process-streams"],
    queryFn: fetchProcessStreams,
  });

  const streams = data?.streams ?? [];
  const orphanFindings = data?.orphan_findings ?? [];
  const orphanDeliveries = data?.orphan_deliveries ?? [];

  const closeDrawer = useCallback(() => setDrawerId(null), []);

  return (
    <div className="space-y-6 max-w-6xl">
      <h1 className="text-lg font-semibold">Discovery Process</h1>

      {isLoading ? (
        <p className="text-xs text-[var(--muted-foreground)] py-8 text-center">Loading...</p>
      ) : (
        <div>
          <ColumnHeaders streams={streams} orphanFindings={orphanFindings} orphanDeliveries={orphanDeliveries} />
          {streams.length === 0 && orphanFindings.length === 0 && orphanDeliveries.length === 0 ? (
            <p className="text-xs text-[var(--muted-foreground)] py-8 text-center">
              No pipeline streams yet. Create a project with a kind (crack-resolution, investigation, etc.) to start a stream.
            </p>
          ) : (
            <div className="mt-3">
              {streams.map((s) => (
                <StreamRow key={s.id} stream={s} onOpenDrawer={setDrawerId} />
              ))}
              {(orphanFindings.length > 0 || orphanDeliveries.length > 0) && (
                <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] items-start gap-x-3 py-4 px-4 rounded-lg bg-[var(--muted)]">
                  <div /><span /><div /><span />
                  <div className="space-y-1">
                    {orphanFindings.map((f) => <SmallFindingPill key={f.id} f={f} />)}
                  </div>
                  {orphanDeliveries.length > 0 ? (
                    <ArrowRight size={14} className="text-[var(--muted-foreground)]/30 mt-2 shrink-0" />
                  ) : <span />}
                  <div className="space-y-1">
                    {orphanDeliveries.map((d) => (
                      <SmallDeliveryPill key={d.id} d={d} onOpen={() => setDrawerId(d.id)} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Drawer */}
      {drawerId && (
        <ContainerDrawer containerId={drawerId} onClose={closeDrawer} />
      )}
    </div>
  );
}

