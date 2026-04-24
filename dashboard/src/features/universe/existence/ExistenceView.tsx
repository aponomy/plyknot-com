import { useState, useMemo } from "react";
import { KpiCard } from "../../../components/ui/kpi-card";
import { cn } from "../../../lib/utils";
import {
  studies,
  stackMeasurements,
  calibrations,
  amLoopExperiments,
  ontologicalEvents,
  getExistenceStats,
  type ExperiencerStudy,
} from "./dummy-data";

/* ── Constants ──────────────────────────────────────────────────────── */

type ViewMode = "studies" | "measurements" | "calibration" | "am-loop";

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  active: { bg: "bg-green-500/10", text: "text-green-400" },
  calibrating: { bg: "bg-amber-500/10", text: "text-amber-400" },
  completed: { bg: "bg-blue-500/10", text: "text-blue-400" },
  planned: { bg: "bg-zinc-500/10", text: "text-zinc-400" },
  running: { bg: "bg-green-500/10", text: "text-green-400" },
  design: { bg: "bg-zinc-500/10", text: "text-zinc-400" },
  analysis: { bg: "bg-amber-500/10", text: "text-amber-400" },
};

const SUBSTRATE_COLORS: Record<string, string> = {
  biological: "text-emerald-400",
  synthetic: "text-violet-400",
  hybrid: "text-cyan-400",
};

const STABILITY_COLORS: Record<string, string> = {
  stable: "text-green-400",
  marginal: "text-amber-400",
  unstable: "text-red-400",
};

const EVENT_ICONS: Record<string, string> = {
  shock: "\u26a1",
  drift: "\u2248",
  fusion: "\u29d6",
  speciation: "\u2234",
  fatigue: "\u25bc",
};

/* ── Coefficient bar ────────────────────────────────────────────────── */

function CoeffBar({ value, color }: { value: number; color?: string }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-10 h-1.5 rounded-full bg-[var(--muted)] overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: color || "var(--primary)" }}
        />
      </div>
      <span className="text-[9px] text-[var(--muted-foreground)] tabular-nums w-7 text-right">{value.toFixed(2)}</span>
    </div>
  );
}

/* ── Study row with expandable detail ───────────────────────────────── */

function StudyRow({ study, expanded, onToggle }: { study: ExperiencerStudy; expanded: boolean; onToggle: () => void }) {
  const measurements = stackMeasurements.filter((m) => m.studyId === study.id);
  const events = ontologicalEvents.filter((e) => e.studyId === study.id);
  const badge = STATUS_BADGE[study.status] || STATUS_BADGE.planned;

  const COLS = "grid-cols-[1fr_6rem_5rem_5rem_5rem_10rem]";

  return (
    <div className="border-b border-[var(--border)] last:border-0">
      <button
        onClick={onToggle}
        className={cn("grid items-center gap-3 px-3 py-2.5 w-full text-left hover:bg-[var(--muted)]/30 transition-colors", COLS)}
      >
        <div className="min-w-0">
          <p className="text-xs font-medium text-[var(--foreground)] truncate">{study.name}</p>
          <p className="text-[10px] text-[var(--muted-foreground)]">{study.population}</p>
        </div>
        <span className={cn("text-[10px]", SUBSTRATE_COLORS[study.substrateType])}>
          {study.substrateType}
        </span>
        <span className={cn("text-[10px] px-1.5 py-0.5 rounded", badge.bg, badge.text)}>
          {study.status}
        </span>
        <span className="text-[10px] text-[var(--muted-foreground)] tabular-nums">
          n={study.participantCount}
        </span>
        <span className="text-[10px] text-[var(--muted-foreground)] tabular-nums">
          {measurements.length} meas.
        </span>
        <span className="text-[10px] text-[var(--muted-foreground)]">
          {study.instrumentModel}
        </span>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 bg-[var(--muted)]/20">
          {/* Stack measurements */}
          {measurements.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5 pt-2">
                Stack Measurements ({measurements.length})
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="text-[var(--muted-foreground)] border-b border-[var(--border)]">
                      <th className="text-left py-1 pr-3 font-semibold">Subject</th>
                      <th className="text-left py-1 pr-3 font-semibold">Recursion</th>
                      <th className="text-left py-1 pr-3 font-semibold">Decay</th>
                      <th className="text-right py-1 pr-3 font-semibold">Depth</th>
                      <th className="text-left py-1 pr-3 font-semibold">Stability</th>
                      <th className="text-left py-1 pr-3 font-semibold">Narr. Gravity</th>
                      <th className="text-right py-1 pr-3 font-semibold">Ep. Drag</th>
                      <th className="text-left py-1 font-semibold">Ref. Drift</th>
                    </tr>
                  </thead>
                  <tbody>
                    {measurements.map((m) => (
                      <tr key={m.id} className="border-b border-[var(--border)] last:border-0">
                        <td className="py-1.5 pr-3 text-[var(--foreground)]">{m.subjectLabel}</td>
                        <td className="py-1.5 pr-3"><CoeffBar value={m.recursionCoefficient} color="#6366f1" /></td>
                        <td className="py-1.5 pr-3 text-[var(--muted-foreground)] tabular-nums">{m.decayRate.toFixed(2)}</td>
                        <td className="py-1.5 pr-3 text-right text-[var(--muted-foreground)] tabular-nums">{m.effectiveDepth.toFixed(1)}</td>
                        <td className={cn("py-1.5 pr-3", STABILITY_COLORS[m.stabilityMode])}>{m.stabilityMode}</td>
                        <td className="py-1.5 pr-3"><CoeffBar value={m.narrativeGravity} color="#f59e0b" /></td>
                        <td className="py-1.5 pr-3 text-right text-[var(--muted-foreground)] tabular-nums">{m.epistemicDrag}ms</td>
                        <td className="py-1.5"><CoeffBar value={m.reflexiveDrift} color="#8b5cf6" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Events */}
          {events.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5">
                Ontological Events ({events.length})
              </p>
              <div className="space-y-1">
                {events.map((ev) => (
                  <div key={ev.id} className="px-2 py-1.5 rounded border border-[var(--border)] bg-[var(--card)] text-xs">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span>{EVENT_ICONS[ev.eventType] || "?"}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">
                        {ev.eventType}
                      </span>
                      <span className="text-[10px] text-[var(--foreground)]">{ev.subjectLabel}</span>
                      <span className="text-[10px] text-[var(--muted-foreground)] ml-auto">
                        mag={ev.magnitude.toFixed(2)}
                        {ev.recoveryTime && ` \u2022 recovery=${ev.recoveryTime}`}
                      </span>
                    </div>
                    <p className="text-[10px] text-[var(--muted-foreground)]">{ev.description}</p>
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

/* ── Calibration table ──────────────────────────────────────────────── */

function CalibrationView() {
  const sorted = useMemo(
    () => [...calibrations].sort((a, b) => b.accuracy - a.accuracy),
    [],
  );

  const COLS = "grid-cols-[10rem_1fr_4rem_4rem_5rem_5rem]";
  const CAL_BADGE: Record<string, { bg: string; text: string }> = {
    baseline: { bg: "bg-zinc-500/10", text: "text-zinc-400" },
    calibrated: { bg: "bg-amber-500/10", text: "text-amber-400" },
    validated: { bg: "bg-green-500/10", text: "text-green-400" },
    deprecated: { bg: "bg-red-500/10", text: "text-red-400" },
  };

  return (
    <div className="border border-[var(--border)] rounded-lg overflow-hidden">
      <div className={cn("grid items-center gap-3 px-3 py-2 bg-[var(--muted)]/50 border-b border-[var(--border)]", COLS)}>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Instrument</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Calibrated Against</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] text-right">Pred.</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] text-right">Match</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] text-right">Accuracy</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Status</span>
      </div>
      {sorted.map((cal) => {
        const badge = CAL_BADGE[cal.status] || CAL_BADGE.baseline;
        return (
          <div key={cal.id} className={cn("grid items-center gap-3 px-3 py-2 border-b border-[var(--border)] last:border-0", COLS)}>
            <span className="text-xs text-[var(--foreground)] truncate">{cal.instrumentModel}</span>
            <span className="text-xs text-[var(--muted-foreground)] truncate">{cal.calibratedAgainst}</span>
            <span className="text-[10px] text-[var(--muted-foreground)] tabular-nums text-right">{cal.predictions}</span>
            <span className="text-[10px] text-[var(--muted-foreground)] tabular-nums text-right">{cal.matches}</span>
            <span className={cn(
              "text-[10px] font-mono tabular-nums text-right",
              cal.accuracy >= 0.8 ? "text-green-400" :
              cal.accuracy >= 0.7 ? "text-amber-400" :
              "text-red-400",
            )}>
              {(cal.accuracy * 100).toFixed(1)}%
            </span>
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded", badge.bg, badge.text)}>
              {cal.status}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Am-Loop experiments view ───────────────────────────────────────── */

function AmLoopView() {
  const COLS = "grid-cols-[1fr_8rem_5rem_4rem_4rem_6rem]";

  return (
    <div className="space-y-4">
      <div className="border border-[var(--border)] rounded-lg overflow-hidden">
        <div className={cn("grid items-center gap-3 px-3 py-2 bg-[var(--muted)]/50 border-b border-[var(--border)]", COLS)}>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Experiment</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Target Signature</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Status</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] text-right">Probes</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] text-right">Sessions</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] text-right">p-value</span>
        </div>
        {amLoopExperiments.map((exp) => {
          const badge = STATUS_BADGE[exp.status] || STATUS_BADGE.design;
          return (
            <div key={exp.id} className={cn("grid items-center gap-3 px-3 py-2 border-b border-[var(--border)] last:border-0", COLS)}>
              <div className="min-w-0">
                <p className="text-xs text-[var(--foreground)] truncate">{exp.name}</p>
                <p className="text-[10px] text-[var(--muted-foreground)]">A: {exp.systemA} / B: {exp.systemB} / C: {exp.systemC}</p>
              </div>
              <span className="text-[10px] text-[var(--muted-foreground)]">{exp.targetSignature}</span>
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded", badge.bg, badge.text)}>
                {exp.status}
              </span>
              <span className="text-[10px] text-[var(--muted-foreground)] tabular-nums text-right">{exp.probeCount || "—"}</span>
              <span className="text-[10px] text-[var(--muted-foreground)] tabular-nums text-right">{exp.sessions || "—"}</span>
              <span className={cn(
                "text-[10px] font-mono tabular-nums text-right",
                exp.discriminationPValue !== null && exp.discriminationPValue < 0.05 ? "text-green-400" :
                exp.discriminationPValue !== null ? "text-amber-400" :
                "text-[var(--muted-foreground)]",
              )}>
                {exp.discriminationPValue !== null ? `p=${exp.discriminationPValue.toFixed(3)}` : "—"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Three-system comparison key */}
      <div className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[10px] text-[var(--muted-foreground)]">
        <p className="font-semibold mb-1">Three-system comparison design</p>
        <p><strong>A</strong> = bare LLM baseline (no state) &bull; <strong>B</strong> = state-carrying control (engineering effects) &bull; <strong>C</strong> = am-loop (hypothesis-specific structure)</p>
        <p className="mt-0.5">Discrimination: C must produce signatures that B cannot replicate through tuning.</p>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Main Existence view
   ════════════════════════════════════════════════════════════════════════ */

export function ExistenceView() {
  const [view, setView] = useState<ViewMode>("studies");
  const [expandedStudy, setExpandedStudy] = useState<string | null>(null);
  const stats = getExistenceStats();

  const STUDY_COLS = "grid-cols-[1fr_6rem_5rem_5rem_5rem_10rem]";

  return (
    <div className="space-y-6 max-w-6xl">
      {/* KPI header */}
      <div className="grid grid-cols-4 gap-3">
        <KpiCard
          title="Studies"
          value={stats.studies}
          delta={`${stats.activeStudies} active, ${stats.totalParticipants} participants`}
          active={view === "studies"}
          onClick={() => setView("studies")}
        />
        <KpiCard
          title="Measurements"
          value={stats.totalMeasurements}
          delta={`${stats.events} ontological events`}
          active={view === "measurements"}
          onClick={() => setView("measurements")}
        />
        <KpiCard
          title="Calibration"
          value={`${(stats.avgCalibrationAccuracy * 100).toFixed(0)}%`}
          delta={`${stats.instrumentModels} instrument models`}
          active={view === "calibration"}
          onClick={() => setView("calibration")}
        />
        <KpiCard
          title="Am-Loop"
          value={stats.amExperimentsRunning}
          delta={`${amLoopExperiments.length} experiments total`}
          active={view === "am-loop"}
          onClick={() => setView("am-loop")}
        />
      </div>

      {/* Content */}
      {view === "studies" ? (
        <div>
          <div className="border border-[var(--border)] rounded-lg overflow-hidden">
            <div className={cn("grid items-center gap-3 px-3 py-2 bg-[var(--muted)]/50 border-b border-[var(--border)]", STUDY_COLS)}>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Study</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Substrate</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Status</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Size</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Meas.</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Instrument</span>
            </div>
            {studies.map((study) => (
              <StudyRow
                key={study.id}
                study={study}
                expanded={expandedStudy === study.id}
                onToggle={() => setExpandedStudy(expandedStudy === study.id ? null : study.id)}
              />
            ))}
          </div>
        </div>
      ) : view === "measurements" ? (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold">
            All Stack Measurements <span className="text-[var(--muted-foreground)] font-normal">({stackMeasurements.length})</span>
          </h2>
          <div className="overflow-x-auto border border-[var(--border)] rounded-lg">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="text-[var(--muted-foreground)] border-b border-[var(--border)] bg-[var(--muted)]/50">
                  <th className="text-left py-2 px-3 font-semibold uppercase tracking-wider">Subject</th>
                  <th className="text-left py-2 px-3 font-semibold uppercase tracking-wider">Study</th>
                  <th className="text-left py-2 px-3 font-semibold uppercase tracking-wider">Recursion</th>
                  <th className="text-right py-2 px-3 font-semibold uppercase tracking-wider">Depth</th>
                  <th className="text-left py-2 px-3 font-semibold uppercase tracking-wider">Stability</th>
                  <th className="text-left py-2 px-3 font-semibold uppercase tracking-wider">Narr. Gravity</th>
                  <th className="text-right py-2 px-3 font-semibold uppercase tracking-wider">Ep. Drag</th>
                  <th className="text-left py-2 px-3 font-semibold uppercase tracking-wider">Ref. Drift</th>
                </tr>
              </thead>
              <tbody>
                {stackMeasurements.map((m) => {
                  const study = studies.find((s) => s.id === m.studyId);
                  return (
                    <tr key={m.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/30">
                      <td className="py-1.5 px-3 text-[var(--foreground)]">{m.subjectLabel}</td>
                      <td className="py-1.5 px-3 text-[var(--muted-foreground)] truncate max-w-[10rem]">{study?.name}</td>
                      <td className="py-1.5 px-3"><CoeffBar value={m.recursionCoefficient} color="#6366f1" /></td>
                      <td className="py-1.5 px-3 text-right text-[var(--muted-foreground)] tabular-nums">{m.effectiveDepth.toFixed(1)}</td>
                      <td className={cn("py-1.5 px-3", STABILITY_COLORS[m.stabilityMode])}>{m.stabilityMode}</td>
                      <td className="py-1.5 px-3"><CoeffBar value={m.narrativeGravity} color="#f59e0b" /></td>
                      <td className="py-1.5 px-3 text-right text-[var(--muted-foreground)] tabular-nums">{m.epistemicDrag}ms</td>
                      <td className="py-1.5 px-3"><CoeffBar value={m.reflexiveDrift} color="#8b5cf6" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Ontological events */}
          <h2 className="text-sm font-semibold">
            Ontological Events <span className="text-[var(--muted-foreground)] font-normal">({ontologicalEvents.length})</span>
          </h2>
          <div className="space-y-1">
            {ontologicalEvents.map((ev) => {
              const study = studies.find((s) => s.id === ev.studyId);
              return (
                <div key={ev.id} className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-xs">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span>{EVENT_ICONS[ev.eventType]}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">{ev.eventType}</span>
                    <span className="text-[var(--foreground)]">{ev.subjectLabel}</span>
                    <span className="text-[10px] text-[var(--muted-foreground)]">{study?.name}</span>
                    <span className="text-[10px] text-[var(--muted-foreground)] ml-auto">
                      {new Date(ev.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--muted-foreground)]">{ev.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      ) : view === "calibration" ? (
        <div>
          <h2 className="text-sm font-semibold mb-3">
            Instrument Calibration <span className="text-[var(--muted-foreground)] font-normal">({calibrations.length} calibrations across {getExistenceStats().instrumentModels} models)</span>
          </h2>
          <CalibrationView />
        </div>
      ) : view === "am-loop" ? (
        <div>
          <h2 className="text-sm font-semibold mb-3">
            Am-Loop Experiments <span className="text-[var(--muted-foreground)] font-normal">(three-system comparison)</span>
          </h2>
          <AmLoopView />
        </div>
      ) : null}
    </div>
  );
}
