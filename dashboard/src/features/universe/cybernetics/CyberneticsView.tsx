import { useState, useMemo } from "react";
import { KpiCard } from "../../../components/ui/kpi-card";
import { cn } from "../../../lib/utils";
import {
  deployments,
  feedbackLoops,
  actors,
  performativityEvents,
  getCyberneticsStats,
  type CyberneticsDeployment,
  type FeedbackLoop,
} from "./dummy-data";

/* ── Constants ──────────────────────────────────────────────────────── */

type ViewMode = "deployments" | "loops" | "alerts" | "actors";

const VERTICAL_LABELS: Record<string, string> = {
  finance: "Finance",
  pharma: "Pharma",
  regulator: "Regulator",
  "ai-safety": "AI Safety",
};

const VERTICAL_COLORS: Record<string, string> = {
  finance: "text-blue-400",
  pharma: "text-emerald-400",
  regulator: "text-amber-400",
  "ai-safety": "text-violet-400",
};

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  active: { bg: "bg-green-500/10", text: "text-green-400" },
  pilot: { bg: "bg-amber-500/10", text: "text-amber-400" },
  onboarding: { bg: "bg-zinc-500/10", text: "text-zinc-400" },
};

const MODE_COLORS: Record<string, string> = {
  generic: "text-zinc-400",
  effective: "text-blue-400",
  barnesian: "text-amber-400",
  "counter-performative": "text-red-400",
};

const GOODHART_LABELS: Record<string, string> = {
  none: "—",
  regressional: "Regressional",
  extremal: "Extremal",
  causal: "Causal",
  adversarial: "Adversarial",
};

/* ── Loop gain indicator ────────────────────────────────────────────── */

function LoopGainBadge({ gain }: { gain: number }) {
  const color = gain >= 1.0 ? "text-red-400" : gain >= 0.85 ? "text-amber-400" : "text-green-400";
  const bg = gain >= 1.0 ? "bg-red-500/10" : gain >= 0.85 ? "bg-amber-500/10" : "bg-green-500/10";
  return (
    <span className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded tabular-nums", bg, color)}>
      |G|={gain.toFixed(2)}
    </span>
  );
}

/* ── Deployment detail (expandable) ─────────────────────────────────── */

function DeploymentRow({ dep, expanded, onToggle }: { dep: CyberneticsDeployment; expanded: boolean; onToggle: () => void }) {
  const depLoops = feedbackLoops.filter((l) => l.deploymentId === dep.id);
  const depActors = actors.filter((a) => a.deploymentId === dep.id);
  const depEvents = performativityEvents.filter((e) => e.deploymentId === dep.id);
  const badge = STATUS_BADGE[dep.status];

  return (
    <div className="border-b border-[var(--border)] last:border-0">
      <button
        onClick={onToggle}
        className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] items-center gap-3 px-3 py-2.5 w-full text-left hover:bg-[var(--muted)]/30 transition-colors"
      >
        <div className="min-w-0">
          <p className="text-xs font-medium text-[var(--foreground)] truncate">{dep.name}</p>
          <p className="text-[10px] text-[var(--muted-foreground)]">{dep.customer}</p>
        </div>
        <span className={cn("text-[10px]", VERTICAL_COLORS[dep.vertical])}>
          {VERTICAL_LABELS[dep.vertical]}
        </span>
        <span className={cn("text-[10px] px-1.5 py-0.5 rounded", badge.bg, badge.text)}>
          {dep.status}
        </span>
        <span className="text-[10px] text-[var(--muted-foreground)] tabular-nums">
          {dep.activeLoops} loops
        </span>
        <span className="text-[10px] text-[var(--muted-foreground)] tabular-nums">
          {dep.actors} actors
        </span>
        {dep.loopGainMax > 0 ? (
          <LoopGainBadge gain={dep.loopGainMax} />
        ) : (
          <span className="text-[10px] text-[var(--muted-foreground)]">—</span>
        )}
        <span className={cn(
          "text-[10px] tabular-nums",
          dep.alerts > 0 ? "text-red-400" : "text-[var(--muted-foreground)]",
        )}>
          {dep.alerts > 0 ? `${dep.alerts} alert${dep.alerts > 1 ? "s" : ""}` : "—"}
        </span>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 bg-[var(--muted)]/20">
          {/* Loops */}
          {depLoops.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5 pt-2">
                Feedback Loops ({depLoops.length})
              </p>
              <div className="space-y-1">
                {depLoops.map((loop) => (
                  <div key={loop.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-3 px-2 py-1.5 rounded border border-[var(--border)] bg-[var(--card)] text-xs">
                    <span className="truncate text-[var(--foreground)]">{loop.name}</span>
                    <LoopGainBadge gain={loop.loopGain} />
                    <span className={cn("text-[10px]", MODE_COLORS[loop.mackenzieMode])}>
                      {loop.mackenzieMode}
                    </span>
                    <span className="text-[10px] text-[var(--muted-foreground)]">
                      {GOODHART_LABELS[loop.goodhartVariant]}
                    </span>
                    <span className="text-[10px] text-[var(--muted-foreground)] tabular-nums">
                      {loop.couplingCount} couplings
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actors */}
          {depActors.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5">
                Actors ({depActors.length})
              </p>
              <div className="space-y-1">
                {depActors.map((actor) => (
                  <div key={actor.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-3 px-2 py-1.5 rounded border border-[var(--border)] bg-[var(--card)] text-xs">
                    <span className="truncate text-[var(--foreground)]">{actor.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">
                      {actor.type}
                    </span>
                    <span className="text-[10px] text-[var(--muted-foreground)] tabular-nums">
                      {actor.actions}a / {actor.predictions}p / {actor.measurements}m
                    </span>
                    <span className="text-[10px] text-[var(--muted-foreground)] tabular-nums">
                      tw={actor.trustWeight.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-[var(--muted-foreground)]">
                      {new Date(actor.lastActive).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent regime transitions */}
          {depEvents.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5">
                Regime Transitions ({depEvents.length})
              </p>
              <div className="space-y-1">
                {depEvents.map((ev) => (
                  <div key={ev.id} className="px-2 py-1.5 rounded border border-[var(--border)] bg-[var(--card)] text-xs">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={cn("text-[10px]", MODE_COLORS[ev.fromMode])}>{ev.fromMode}</span>
                      <span className="text-[10px] text-[var(--muted-foreground)]">&rarr;</span>
                      <span className={cn("text-[10px]", MODE_COLORS[ev.toMode])}>{ev.toMode}</span>
                      <span className="text-[10px] text-[var(--muted-foreground)] ml-auto">
                        |G|={ev.loopGainAtTransition.toFixed(2)} at transition
                      </span>
                    </div>
                    <p className="text-[10px] text-[var(--muted-foreground)]">{ev.trigger}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Loop list view ─────────────────────────────────────────────────── */

function LoopsListView() {
  const sorted = useMemo(
    () => [...feedbackLoops].sort((a, b) => b.loopGain - a.loopGain),
    [],
  );

  return (
    <div className="border border-[var(--border)] rounded-lg overflow-hidden">
      <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] items-center gap-3 px-3 py-2 bg-[var(--muted)]/50 border-b border-[var(--border)]">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Loop</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">|G|</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Trend</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Mode</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Goodhart</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Couplings</span>
      </div>
      {sorted.map((loop) => {
        const dep = deployments.find((d) => d.id === loop.deploymentId);
        return (
          <div key={loop.id} className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] items-center gap-3 px-3 py-2 border-b border-[var(--border)] last:border-0">
            <div className="min-w-0">
              <p className="text-xs text-[var(--foreground)] truncate">{loop.name}</p>
              <p className="text-[10px] text-[var(--muted-foreground)]">{dep?.customer}</p>
            </div>
            <LoopGainBadge gain={loop.loopGain} />
            <span className={cn(
              "text-[10px]",
              loop.gainTrend === "rising" ? "text-red-400" :
              loop.gainTrend === "falling" ? "text-green-400" :
              "text-[var(--muted-foreground)]",
            )}>
              {loop.gainTrend === "rising" ? "\u2191" : loop.gainTrend === "falling" ? "\u2193" : "\u2194"}
            </span>
            <span className={cn("text-[10px]", MODE_COLORS[loop.mackenzieMode])}>
              {loop.mackenzieMode}
            </span>
            <span className="text-[10px] text-[var(--muted-foreground)]">
              {GOODHART_LABELS[loop.goodhartVariant]}
            </span>
            <span className="text-[10px] text-[var(--muted-foreground)] tabular-nums">
              {loop.couplingCount}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Alerts view ────────────────────────────────────────────────────── */

function AlertsView() {
  const alertLoops = feedbackLoops.filter((l) => l.loopGain >= 1.0 || l.goodhartVariant !== "none");
  const transitions = performativityEvents;

  return (
    <div className="space-y-4">
      {/* Amplifying loops */}
      <div>
        <h3 className="text-xs font-semibold mb-2">
          Amplifying Loops <span className="text-red-400 font-normal">(|G| &ge; 1.0)</span>
        </h3>
        {alertLoops.filter((l) => l.loopGain >= 1.0).length === 0 ? (
          <p className="text-[10px] text-[var(--muted-foreground)] py-4 text-center">No amplifying loops.</p>
        ) : (
          <div className="border border-[var(--border)] rounded-lg overflow-hidden">
            {alertLoops.filter((l) => l.loopGain >= 1.0).map((loop) => {
              const dep = deployments.find((d) => d.id === loop.deploymentId);
              return (
                <div key={loop.id} className="flex items-center gap-3 px-3 py-2 border-b border-[var(--border)] last:border-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[var(--foreground)] truncate">{loop.name}</p>
                    <p className="text-[10px] text-[var(--muted-foreground)]">{dep?.customer}</p>
                  </div>
                  <LoopGainBadge gain={loop.loopGain} />
                  <span className={cn("text-[10px]", MODE_COLORS[loop.mackenzieMode])}>
                    {loop.mackenzieMode}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent regime transitions */}
      <div>
        <h3 className="text-xs font-semibold mb-2">Recent Regime Transitions</h3>
        <div className="border border-[var(--border)] rounded-lg overflow-hidden">
          {transitions.map((ev) => {
            const dep = deployments.find((d) => d.id === ev.deploymentId);
            return (
              <div key={ev.id} className="px-3 py-2 border-b border-[var(--border)] last:border-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs text-[var(--foreground)]">{dep?.customer}</span>
                  <span className={cn("text-[10px]", MODE_COLORS[ev.fromMode])}>{ev.fromMode}</span>
                  <span className="text-[10px] text-[var(--muted-foreground)]">&rarr;</span>
                  <span className={cn("text-[10px]", MODE_COLORS[ev.toMode])}>{ev.toMode}</span>
                  <span className="text-[10px] text-[var(--muted-foreground)] ml-auto">
                    {new Date(ev.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-[10px] text-[var(--muted-foreground)]">{ev.trigger}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Actors list view ───────────────────────────────────────────────── */

function ActorsListView() {
  const sorted = useMemo(
    () => [...actors].sort((a, b) => (b.actions + b.predictions + b.measurements) - (a.actions + a.predictions + a.measurements)),
    [],
  );

  return (
    <div className="border border-[var(--border)] rounded-lg overflow-hidden">
      <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] items-center gap-3 px-3 py-2 bg-[var(--muted)]/50 border-b border-[var(--border)]">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Actor</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Type</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Actions</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Predictions</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Measurements</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Trust</span>
      </div>
      {sorted.map((actor) => {
        const dep = deployments.find((d) => d.id === actor.deploymentId);
        return (
          <div key={actor.id} className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] items-center gap-3 px-3 py-2 border-b border-[var(--border)] last:border-0">
            <div className="min-w-0">
              <p className="text-xs text-[var(--foreground)] truncate">{actor.name}</p>
              <p className="text-[10px] text-[var(--muted-foreground)]">{dep?.customer}</p>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">
              {actor.type}
            </span>
            <span className="text-[10px] text-[var(--muted-foreground)] tabular-nums">{actor.actions}</span>
            <span className="text-[10px] text-[var(--muted-foreground)] tabular-nums">{actor.predictions}</span>
            <span className="text-[10px] text-[var(--muted-foreground)] tabular-nums">{actor.measurements}</span>
            <span className="text-[10px] font-mono text-[var(--muted-foreground)] tabular-nums">{actor.trustWeight.toFixed(2)}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Main Cybernetics view
   ════════════════════════════════════════════════════════════════════════ */

export function CyberneticsView() {
  const [view, setView] = useState<ViewMode>("deployments");
  const [expandedDep, setExpandedDep] = useState<string | null>(null);
  const stats = getCyberneticsStats();

  return (
    <div className="space-y-6 max-w-6xl">
      {/* KPI header */}
      <div className="grid grid-cols-4 gap-3">
        <KpiCard
          title="Deployments"
          value={stats.deployments}
          delta={`${stats.active} active, ${stats.pilot} pilot`}
          active={view === "deployments"}
          onClick={() => setView("deployments")}
        />
        <KpiCard
          title="Feedback Loops"
          value={stats.totalLoops}
          delta={stats.amplifying > 0 ? `${stats.amplifying} amplifying` : `all damping`}
          trend={stats.amplifying > 0 ? "down" : undefined}
          active={view === "loops"}
          onClick={() => setView("loops")}
        />
        <KpiCard
          title="Alerts"
          value={stats.totalAlerts + stats.recentTransitions}
          delta={`${stats.barnesianCount} barnesian, ${stats.counterCount} counter-perf.`}
          trend={stats.totalAlerts > 0 ? "down" : undefined}
          active={view === "alerts"}
          onClick={() => setView("alerts")}
        />
        <KpiCard
          title="Actors"
          value={stats.totalActors}
          active={view === "actors"}
          onClick={() => setView("actors")}
        />
      </div>

      {/* Content */}
      {view === "deployments" ? (
        <div>
          <div className="border border-[var(--border)] rounded-lg overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] items-center gap-3 px-3 py-2 bg-[var(--muted)]/50 border-b border-[var(--border)]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Deployment</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Vertical</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Status</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Loops</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Actors</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Max |G|</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Alerts</span>
            </div>
            {/* Rows */}
            {deployments.map((dep) => (
              <DeploymentRow
                key={dep.id}
                dep={dep}
                expanded={expandedDep === dep.id}
                onToggle={() => setExpandedDep(expandedDep === dep.id ? null : dep.id)}
              />
            ))}
          </div>
        </div>
      ) : view === "loops" ? (
        <LoopsListView />
      ) : view === "alerts" ? (
        <AlertsView />
      ) : view === "actors" ? (
        <ActorsListView />
      ) : null}
    </div>
  );
}
