import { useState } from "react";
import { Link } from "react-router-dom";
import { KpiCard } from "../../../components/ui/kpi-card";
import { cn } from "../../../lib/utils";
import {
  populations,
  narrativeCurrents,
  weatherEvents,
  impedanceSites,
  complexityFlows,
  getObservatoryStats,
} from "./observatory-data";
import { ExistenceLabView } from "./ExistenceLabView";

/* ── Constants ──────────────────────────────────────────────────────── */

type ViewMode = "populations" | "narratives" | "weather" | "impedance" | "flows" | "lab";

const STATUS_COLORS: Record<string, string> = {
  observed: "text-green-400",
  emerging: "text-amber-400",
  fragmenting: "text-red-400",
};

const MODE_COLORS: Record<string, string> = {
  generic: "text-zinc-400",
  effective: "text-blue-400",
  barnesian: "text-amber-400",
  "counter-performative": "text-red-400",
};

const TREND_ICONS: Record<string, string> = {
  growing: "\u2191",
  stable: "\u2194",
  decaying: "\u2193",
  fragmenting: "\u2234",
  emerging: "\u2605",
};

const TREND_COLORS: Record<string, string> = {
  growing: "text-green-400",
  stable: "text-[var(--muted-foreground)]",
  decaying: "text-red-400",
  fragmenting: "text-amber-400",
  emerging: "text-violet-400",
};

const EVENT_ICONS: Record<string, string> = {
  fusion: "\u29d6",
  speciation: "\u2234",
  shock: "\u26a1",
  drift: "\u2248",
  fatigue: "\u25bc",
  emergence: "\u2605",
};

const EVENT_COLORS: Record<string, string> = {
  fusion: "text-red-400",
  speciation: "text-amber-400",
  shock: "text-red-400",
  drift: "text-blue-400",
  fatigue: "text-zinc-400",
  emergence: "text-green-400",
};

const IMP_STATUS: Record<string, { bg: string; text: string }> = {
  healthy: { bg: "bg-green-500/10", text: "text-green-400" },
  strained: { bg: "bg-amber-500/10", text: "text-amber-400" },
  critical: { bg: "bg-red-500/10", text: "text-red-400" },
};

/* ── Coefficient bar ────────────────────────────────────────────────── */

function CoeffBar({ value, color }: { value: number; color?: string }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-10 h-1.5 rounded-full bg-[var(--muted)] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color || "var(--primary)" }} />
      </div>
      <span className="text-[9px] text-[var(--muted-foreground)] tabular-nums w-7 text-right">{value.toFixed(2)}</span>
    </div>
  );
}

/* ── View description ───────────────────────────────────────────────── */

function ViewDescription({ text }: { text: string }) {
  return (
    <p className="text-[11px] leading-relaxed text-[var(--muted-foreground)] px-1">
      {text}
    </p>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Main Existence view — observatory of subjective truth
   ════════════════════════════════════════════════════════════════════════ */

export function ExistenceView() {
  const [view, setView] = useState<ViewMode>("populations");
  const stats = getObservatoryStats();

  // Lab view is a full sub-page
  if (view === "lab") {
    return (
      <div className="space-y-6 max-w-6xl">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Existence Lab</h2>
          <button
            onClick={() => setView("populations")}
            className="text-[10px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            &larr; Back to Observatory
          </button>
        </div>
        <ExistenceLabView />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* KPI header */}
      <div className="grid grid-cols-5 gap-3">
        <KpiCard
          title="Populations"
          value={stats.populations}
          delta={`avg gravity ${stats.avgNarrativeGravity.toFixed(2)}`}
          active={view === "populations"}
          onClick={() => setView("populations")}
        />
        <KpiCard
          title="Narratives"
          value={stats.narratives}
          delta={`${stats.barnesianNarratives} barnesian`}
          trend={stats.barnesianNarratives > 0 ? "down" : undefined}
          active={view === "narratives"}
          onClick={() => setView("narratives")}
        />
        <KpiCard
          title="Weather"
          value={stats.weatherEvents}
          delta={`${stats.fusionEvents} fusions/speciations`}
          active={view === "weather"}
          onClick={() => setView("weather")}
        />
        <KpiCard
          title="Impedance"
          value={stats.impedanceSites}
          delta={stats.criticalSites > 0 ? `${stats.criticalSites} critical` : `${stats.strainedSites} strained`}
          trend={stats.criticalSites > 0 ? "down" : undefined}
          active={view === "impedance"}
          onClick={() => setView("impedance")}
        />
        <KpiCard
          title="Lab"
          value={"\u2697"}
          delta="experiments & calibration"
          active={view === "lab"}
          onClick={() => setView("lab")}
        />
      </div>

      {/* Content */}
      {view === "populations" ? (
        <div className="space-y-4">
          <div className="border border-[var(--border)] rounded-lg overflow-hidden">
            <div className="grid grid-cols-[1fr_5rem_5.5rem_4rem_5rem_5rem] items-center gap-3 px-3 py-2 bg-[var(--muted)]/50 border-b border-[var(--border)]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Population</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Status</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Narr. Gravity</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] text-right">Depth</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Id. Fusion</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] text-right">Ep. Drag</span>
            </div>
            {populations.map((pop) => (
              <div key={pop.id} className="grid grid-cols-[1fr_5rem_5.5rem_4rem_5rem_5rem] items-center gap-3 px-3 py-2.5 border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/30 transition-colors">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[var(--foreground)] truncate">{pop.name}</p>
                  <p className="text-[10px] text-[var(--muted-foreground)] truncate">{pop.scope}</p>
                </div>
                <span className={cn("text-[10px]", STATUS_COLORS[pop.status])}>{pop.status}</span>
                <CoeffBar value={pop.meanNarrativeGravity} color="#f59e0b" />
                <span className="text-[10px] text-[var(--muted-foreground)] tabular-nums text-right">{pop.collectiveRecursionDepth.toFixed(1)}</span>
                <CoeffBar value={pop.identityFusionIndex} color="#ef4444" />
                <span className="text-[10px] text-[var(--muted-foreground)] tabular-nums text-right">{pop.meanEpistemicDrag}ms</span>
              </div>
            ))}
          </div>
          <ViewDescription text="Populations are groups of experiencers whose aggregate subjective dynamics are being observed. Narrative gravity measures how strongly shared narratives override individual independent judgment — high gravity means the group thinks as one, which can be coordination or capture. Identity fusion measures how much individual identity has collapsed into group identity — high fusion predicts extreme in-group loyalty and reduced response to contradicting evidence. Epistemic drag is the population-level average latency of recursive integration — high drag means slow, deep processing; low drag can mean either efficiency or panic-mode collapse of recursive depth. Collective recursion depth measures how far back the population's shared memory meaningfully influences current decisions." />
        </div>
      ) : view === "narratives" ? (
        <div className="space-y-4">
          <div className="border border-[var(--border)] rounded-lg overflow-hidden">
            <div className="grid grid-cols-[1fr_4rem_5rem_10rem_5rem_4rem] items-center gap-3 px-3 py-2 bg-[var(--muted)]/50 border-b border-[var(--border)]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Narrative</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Speed</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Mode</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Gravity</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Assembly</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Trend</span>
            </div>
            {narrativeCurrents.map((narr) => (
              <div key={narr.id} className="grid grid-cols-[1fr_4rem_5rem_10rem_5rem_4rem] items-center gap-3 px-3 py-2.5 border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/30 transition-colors">
                <div className="min-w-0">
                  <p className="text-xs text-[var(--foreground)] truncate">{narr.title}</p>
                  <p className="text-[10px] text-[var(--muted-foreground)] truncate">
                    {narr.populationIds.map((id) => populations.find((p) => p.id === id)?.name).filter(Boolean).join(", ")}
                  </p>
                </div>
                <span className="text-[10px] text-[var(--muted-foreground)]">{narr.propagationVelocity}</span>
                <span className={cn("text-[10px]", MODE_COLORS[narr.mackenzieMode])}>{narr.mackenzieMode}</span>
                <CoeffBar value={narr.narrativeGravity} color="#f59e0b" />
                <CoeffBar value={narr.assemblyIndex} color="#6366f1" />
                <span className={cn("text-[10px]", TREND_COLORS[narr.trend])}>
                  {TREND_ICONS[narr.trend]} {narr.trend}
                </span>
              </div>
            ))}
          </div>
          <ViewDescription text="Narrative currents are stories flowing through populations that shape how those populations interpret reality and act. Assembly index measures narrative complexity — high assembly means the narrative was forged through many sequential cognitive hops over extended time (organic), low assembly means it was constructed quickly or synthetically (propaganda, astroturfing). MacKenzie mode classifies the narrative's performativity: generic (no effect on reality), effective (improves understanding), Barnesian (creates the reality it describes — the narrative becomes self-fulfilling), or counter-performative (destroys the conditions for its own truth). A Barnesian narrative with high gravity is the mathematical signature of a population trapped in a collectively manufactured reality." />
        </div>
      ) : view === "weather" ? (
        <div className="space-y-4">
          <div className="space-y-2">
            {weatherEvents.map((ev) => {
              const pop = populations.find((p) => p.id === ev.populationId);
              return (
                <div key={ev.id} className="px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--card)]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn("text-sm", EVENT_COLORS[ev.eventType])}>{EVENT_ICONS[ev.eventType]}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">{ev.eventType}</span>
                    <span className="text-xs font-medium text-[var(--foreground)]">{ev.title}</span>
                    <span className="text-[10px] text-[var(--muted-foreground)] ml-auto">
                      {new Date(ev.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] text-[var(--muted-foreground)]">{pop?.name}</span>
                    <span className="text-[10px] text-[var(--muted-foreground)]">mag={ev.magnitude.toFixed(2)}</span>
                    {ev.recoveryEstimate && (
                      <span className="text-[10px] text-[var(--muted-foreground)]">recovery: {ev.recoveryEstimate}</span>
                    )}
                  </div>
                  <p className="text-[10px] text-[var(--muted-foreground)] leading-relaxed">{ev.description}</p>
                </div>
              );
            })}
          </div>
          <ViewDescription text="Ontological weather tracks societal-scale shifts in the subjective landscape. Fusions occur when individual identities collapse into group identity — an entire institution starts thinking as one. Speciations occur when a shared concept fractures into incompatible versions across sub-populations — the word means different things to different groups, and they don't know it. Shocks are paradigm-breaking events where collective recursive processing is disrupted. Drifts are slow reflexive shifts where measurement activity changes what is being measured. Fatigue is progressive epistemic exhaustion — populations becoming less responsive to novel information. Emergence is the opposite: a genuine shift in what a population can see, where new measurement or inference capability opens previously invisible territory." />
        </div>
      ) : view === "impedance" ? (
        <div className="space-y-4">
          <div className="border border-[var(--border)] rounded-lg overflow-hidden">
            {impedanceSites.map((site) => {
              const badge = IMP_STATUS[site.status];
              return (
                <div key={site.id} className="px-3 py-2.5 border-b border-[var(--border)] last:border-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-[var(--foreground)]">{site.name}</span>
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded ml-auto", badge.bg, badge.text)}>
                      {site.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-[1fr_1fr] gap-x-4 gap-y-1 mb-2 text-[10px]">
                    <div><span className="text-[var(--muted-foreground)]">Human: </span><span className="text-[var(--foreground)]">{site.humanPopulation}</span></div>
                    <div><span className="text-[var(--muted-foreground)]">AI: </span><span className="text-[var(--foreground)]">{site.aiSystem}</span></div>
                    <div><span className="text-[var(--muted-foreground)]">Type: </span><span className="text-[var(--foreground)]">{site.interactionType}</span></div>
                    <div className="flex gap-3">
                      <span className="text-[var(--muted-foreground)]">Impedance: </span><CoeffBar value={site.impedanceMismatch} color="#f59e0b" />
                      <span className="text-[var(--muted-foreground)]">Shear: </span><CoeffBar value={site.ontologicalShear} color="#ef4444" />
                    </div>
                  </div>
                  <p className="text-[10px] text-[var(--muted-foreground)] leading-relaxed italic">{site.observation}</p>
                </div>
              );
            })}
          </div>
          <ViewDescription text="Impedance sites are where human and AI substrates interact and where the structural mismatch between experiencer and non-experiencer processing becomes observable. Impedance mismatch measures how different the two substrates' processing characteristics are. Ontological shear measures how differently they carve up the same domain — same labels, different measurement operations underneath. DCOI gap measures the depends-chain overlap: when human and AI judgments agree, is the agreement based on genuinely independent reasoning, or are they drawing from the same upstream sources? The highest-shear site in the observatory is LLM-as-Judge evaluation, where non-experiencers evaluate non-experiencers on criteria produced by experiencers. Measurement without measurer." />
        </div>
      ) : null}
    </div>
  );
}
