import { useState } from "react";
import { KpiCard } from "../../../components/ui/kpi-card";
import { cn } from "../../../lib/utils";
import {
  entities,
  cracks,
  echoChambers,
  speciations,
  instruments,
  getExistenceStats,
} from "./existence-data";

/* ── Constants ──────────────────────────────────────────────────────── */

type ViewMode = "entities" | "cracks" | "echoes" | "speciation" | "instruments";

const LEVEL_COLORS: Record<number, string> = {
  3: "text-emerald-400",
  4: "text-blue-400",
  5: "text-amber-400",
};

const CONVERGENCE_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  high: { bg: "bg-green-500/10", text: "text-green-400", label: "converged" },
  tension: { bg: "bg-amber-500/10", text: "text-amber-400", label: "tension" },
  divergent: { bg: "bg-red-500/10", text: "text-red-400", label: "divergent" },
  single: { bg: "bg-zinc-500/10", text: "text-zinc-400", label: "single" },
};

function getConvergenceBadge(rate: number) {
  if (rate >= 0.70) return CONVERGENCE_BADGE.high;
  if (rate >= 0.40) return CONVERGENCE_BADGE.tension;
  if (rate > 0) return CONVERGENCE_BADGE.divergent;
  return CONVERGENCE_BADGE.single;
}

/* ── Coefficient bar ────────────────────────────────────────────────── */

function CoeffBar({ value, color, label }: { value: number; color?: string; label?: string }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-12 h-1.5 rounded-full bg-[var(--muted)] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color || "var(--primary)" }} />
      </div>
      <span className="text-[9px] text-[var(--muted-foreground)] tabular-nums">{label || `${pct}%`}</span>
    </div>
  );
}

/* ── View description ───────────────────────────────────────────────── */

function Desc({ text }: { text: string }) {
  return <p className="text-[11px] leading-relaxed text-[var(--muted-foreground)] px-1">{text}</p>;
}

/* ════════════════════════════════════════════════════════════════════════
   Main Existence view — convergence map for subjective-domain entities
   ════════════════════════════════════════════════════════════════════════ */

export function ExistenceView() {
  const [view, setView] = useState<ViewMode>("entities");
  const stats = getExistenceStats();

  return (
    <div className="space-y-6 max-w-6xl">
      {/* KPI header */}
      <div className="grid grid-cols-5 gap-3">
        <KpiCard
          title="Entities"
          value={stats.entities}
          delta={`${(stats.avgConvergence * 100).toFixed(0)}% avg convergence`}
          active={view === "entities"}
          onClick={() => setView("entities")}
        />
        <KpiCard
          title="Cracks"
          value={stats.totalCracks}
          delta={`${stats.divergentCracks} divergent`}
          trend={stats.divergentCracks > 0 ? "down" : undefined}
          active={view === "cracks"}
          onClick={() => setView("cracks")}
        />
        <KpiCard
          title="Echo Chambers"
          value={stats.totalEchoChambers}
          active={view === "echoes"}
          onClick={() => setView("echoes")}
        />
        <KpiCard
          title="Speciation"
          value={stats.totalSpeciations}
          delta={`${stats.confirmedSpeciations} confirmed`}
          active={view === "speciation"}
          onClick={() => setView("speciation")}
        />
        <KpiCard
          title="Instruments"
          value={stats.instruments}
          delta={`${stats.movingTruthInstruments} moving-truth`}
          active={view === "instruments"}
          onClick={() => setView("instruments")}
        />
      </div>

      {/* ── Entities ──────────────────────────────────────────────── */}
      {view === "entities" && (
        <div className="space-y-4">
          <div className="border border-[var(--border)] rounded-lg overflow-hidden">
            <div className="grid grid-cols-[1fr_6rem_6rem_4rem_4rem_5rem] items-center gap-3 px-3 py-2 bg-[var(--muted)]/50 border-b border-[var(--border)]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Entity</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Level</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Convergence</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] text-right">Cracks</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] text-right">Instr.</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Echo Risk</span>
            </div>
            {entities.map((e) => {
              const badge = getConvergenceBadge(e.convergenceRate);
              return (
                <div key={e.id} className="grid grid-cols-[1fr_6rem_6rem_4rem_4rem_5rem] items-center gap-3 px-3 py-2.5 border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/30 transition-colors">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[var(--foreground)] truncate">#{e.id} {e.label}</p>
                    <p className="text-[10px] text-[var(--muted-foreground)]">{e.propertyCount} properties</p>
                  </div>
                  <span className={cn("text-[10px]", LEVEL_COLORS[e.level])}>{e.levelLabel}</span>
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded", badge.bg, badge.text)}>
                    {badge.label} ({(e.convergenceRate * 100).toFixed(0)}%)
                  </span>
                  <span className={cn("text-[10px] tabular-nums text-right", e.crackCount > 0 ? "text-red-400" : "text-[var(--muted-foreground)]")}>
                    {e.crackCount || "—"}
                  </span>
                  <span className="text-[10px] text-[var(--muted-foreground)] tabular-nums text-right">{e.instrumentCount}</span>
                  <CoeffBar value={e.echoRisk} color={e.echoRisk > 0.6 ? "#ef4444" : e.echoRisk > 0.3 ? "#f59e0b" : "#22c55e"} />
                </div>
              );
            })}
          </div>
          <Desc text="Entities are the things being measured — psychological constructs, social phenomena, biological drives. Each has an integer ID (labels live in the registry, not the core). Complexity level determines how much the brain constructs the measured object: at L3 the brain makes categorization choices, at L4 the brain constructs the cognitive object, at L5 the brain invents both object and measurement. Convergence rate shows what fraction of properties have independent instruments agreeing. Echo risk measures shared-methodology exposure — high risk means apparent convergence may be illusory because the instruments share depends chains. The gradient is real: L3 entities converge better than L5. This is the concept-measurement gap made visible." />
        </div>
      )}

      {/* ── Cracks ────────────────────────────────────────────────── */}
      {view === "cracks" && (
        <div className="space-y-4">
          <div className="space-y-2">
            {cracks.map((crack) => {
              const entity = entities.find((e) => e.id === crack.entityId);
              return (
                <div key={crack.id} className="px-3 py-3 rounded-lg border border-[var(--border)] bg-[var(--card)]">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded",
                      crack.convergence === "divergent" ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400",
                    )}>
                      {crack.sigmaTension.toFixed(1)}sigma {crack.convergence}
                    </span>
                    <span className="text-xs font-medium text-[var(--foreground)]">#{crack.entityId} {entity?.label}</span>
                    <span className="text-[10px] text-[var(--muted-foreground)]">.{crack.property}</span>
                  </div>
                  <p className="text-xs text-[var(--foreground)] mb-2 italic">&ldquo;{crack.claim}&rdquo;</p>
                  <div className="grid grid-cols-2 gap-3 mb-2 text-[10px]">
                    <div className="px-2 py-1.5 rounded bg-[var(--muted)]/50">
                      <p className="text-[var(--muted-foreground)] mb-0.5">{crack.instrumentA}</p>
                      <p className="text-[var(--foreground)]">{crack.valueA}</p>
                    </div>
                    <div className="px-2 py-1.5 rounded bg-[var(--muted)]/50">
                      <p className="text-[var(--muted-foreground)] mb-0.5">{crack.instrumentB}</p>
                      <p className="text-[var(--foreground)]">{crack.valueB}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-1.5 text-[10px]">
                    <span className="text-[var(--muted-foreground)]">depends overlap:</span>
                    <CoeffBar value={crack.dependsOverlap} color="#6366f1" label={`${(crack.dependsOverlap * 100).toFixed(0)}%`} />
                    <span className="text-[var(--muted-foreground)] ml-1">{crack.dependsOverlap < 0.2 ? "(genuinely independent)" : crack.dependsOverlap < 0.5 ? "(partially shared)" : "(high overlap — weak disagreement)"}</span>
                  </div>
                  <p className="text-[10px] text-[var(--muted-foreground)] leading-relaxed">{crack.consequence}</p>
                </div>
              );
            })}
          </div>
          <Desc text="Cracks are where independent instruments disagree about the same property on the same entity — the subjective-domain equivalent of the Hubble tension or the proton radius puzzle. At Level 4-5, cracks are more common because the measurement operations themselves diverge more: a survey and a behavioral observation are measuring the same target through fundamentally different apparatuses. Low depends-overlap means the disagreement is genuine (the instruments share almost no methodology); high overlap means the apparent disagreement may be an artifact of different implementations of the same approach. Each crack names its consequence: what does the disagreement tell us about the property, the instruments, or the concept itself?" />
        </div>
      )}

      {/* ── Echo chambers ─────────────────────────────────────────── */}
      {view === "echoes" && (
        <div className="space-y-4">
          <div className="space-y-2">
            {echoChambers.map((echo) => {
              const entity = entities.find((e) => e.id === echo.entityId);
              return (
                <div key={echo.id} className="px-3 py-3 rounded-lg border border-[var(--border)] bg-[var(--card)]">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-medium text-[var(--foreground)]">#{echo.entityId} {entity?.label}</span>
                    <span className="text-[10px] text-[var(--muted-foreground)]">.{echo.property}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {echo.instruments.map((inst, i) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">{inst}</span>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-2 text-[10px]">
                    <div>
                      <span className="text-[var(--muted-foreground)]">Apparent convergence: </span>
                      <span className="text-green-400 font-mono">{(echo.apparentConvergence * 100).toFixed(0)}%</span>
                    </div>
                    <div>
                      <span className="text-[var(--muted-foreground)]">Estimated true: </span>
                      <span className="text-red-400 font-mono">{(echo.estimatedTrueConvergence * 100).toFixed(0)}%</span>
                    </div>
                    <div>
                      <span className="text-[var(--muted-foreground)]">Depends overlap: </span>
                      <span className="text-amber-400 font-mono">{(echo.dependsOverlap * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-[var(--muted-foreground)] mb-1.5"><strong>Shared dependency:</strong> {echo.sharedDependency}</p>
                  <p className="text-[10px] text-[var(--muted-foreground)] leading-relaxed">{echo.risk}</p>
                </div>
              );
            })}
          </div>
          <Desc text="Echo chambers are where multiple instruments appear to agree, but share methodology so heavily that their agreement is not independent evidence. The DCOI (Depends-Chain Orthogonality Index) quantifies how much real independence the convergence represents. Four well-being surveys agreeing looks like strong evidence — until you notice they all use self-report Likert scales on similar populations. Apparent convergence of 91% collapses to estimated true convergence of 34% when depends-overlap is accounted for. This is the same phenomenon as the 754 AlphaFold-ESMFold echo chambers found in the protein domain: instruments trained on the same data agree with each other but not with reality." />
        </div>
      )}

      {/* ── Speciation ────────────────────────────────────────────── */}
      {view === "speciation" && (
        <div className="space-y-4">
          <div className="space-y-2">
            {speciations.map((spec) => {
              const entity = entities.find((e) => e.id === spec.entityId);
              const statusBadge = spec.status === "split"
                ? { bg: "bg-green-500/10", text: "text-green-400" }
                : spec.status === "confirmed"
                ? { bg: "bg-blue-500/10", text: "text-blue-400" }
                : { bg: "bg-amber-500/10", text: "text-amber-400" };
              return (
                <div key={spec.id} className="px-3 py-3 rounded-lg border border-[var(--border)] bg-[var(--card)]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded", statusBadge.bg, statusBadge.text)}>{spec.status}</span>
                    <span className="text-xs font-medium text-[var(--foreground)]">#{entity?.id} {spec.originalConcept}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2 text-xs">
                    <span className="px-2 py-1 rounded bg-[var(--muted)] text-[var(--foreground)]">{spec.childA}</span>
                    <span className="text-[var(--muted-foreground)]">+</span>
                    <span className="px-2 py-1 rounded bg-[var(--muted)] text-[var(--foreground)]">{spec.childB}</span>
                  </div>
                  <div className="flex gap-4 mb-2 text-[10px]">
                    <div>
                      <span className="text-[var(--muted-foreground)]">DBIC: </span>
                      <span className="font-mono text-[var(--foreground)]">{spec.deltaBIC.toFixed(1)}</span>
                      <span className="text-[var(--muted-foreground)]"> (threshold: 10)</span>
                    </div>
                    <div>
                      <span className="text-[var(--muted-foreground)]">Sigma reduction: </span>
                      <span className="font-mono text-green-400">{(spec.sigmaReduction * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-[var(--muted-foreground)] leading-relaxed">{spec.evidence}</p>
                </div>
              );
            })}
          </div>
          <Desc text="Speciation is when the GMM+BIC machinery detects that a single concept is better explained as two or more distinct sub-concepts. The original sigma (measurement disagreement) drops after the split because what looked like noise was actually two different things being measured under one label. DBIC >= 10 is the threshold; the sigma reduction shows how much of the original disagreement was terminological confusion versus genuine measurement difficulty. The 'democracy importance' split is the flagship paper's own example: 46% of disagreement vanished when aspiration was separated from experience. At Level 5, this is the primary mechanism for making progress — not better instruments, but cleaner concepts." />
        </div>
      )}

      {/* ── Instruments ───────────────────────────────────────────── */}
      {view === "instruments" && (
        <div className="space-y-4">
          <div className="border border-[var(--border)] rounded-lg overflow-hidden">
            <div className="grid grid-cols-[1fr_5rem_4rem_4rem_5rem_5rem] items-center gap-3 px-3 py-2 bg-[var(--muted)]/50 border-b border-[var(--border)]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Instrument</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Type</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] text-right">Ent.</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] text-right">Coupl.</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Trust</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Moving</span>
            </div>
            {instruments.map((inst) => (
              <div key={inst.id} className="grid grid-cols-[1fr_5rem_4rem_4rem_5rem_5rem] items-center gap-3 px-3 py-2.5 border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/30 transition-colors">
                <div className="min-w-0">
                  <p className="text-xs text-[var(--foreground)] truncate">{inst.name}</p>
                  <p className="text-[10px] text-[var(--muted-foreground)] truncate">{inst.depends}</p>
                </div>
                <span className="text-[10px] text-[var(--muted-foreground)]">{inst.type}</span>
                <span className="text-[10px] text-[var(--muted-foreground)] tabular-nums text-right">{inst.entitiesMeasured}</span>
                <span className="text-[10px] text-[var(--muted-foreground)] tabular-nums text-right">{inst.couplingCount}</span>
                <CoeffBar value={inst.trustWeight} color="#6366f1" />
                <span className={cn("text-[10px]", inst.movingTruth ? "text-amber-400" : "text-green-400")}>
                  {inst.movingTruth ? "yes" : "no"}
                </span>
              </div>
            ))}
          </div>
          <Desc text="Instruments are the measurement methods registered for the subjective domain. Each has a depends chain — the operational requirements and assumptions it embodies. Trust weight reflects calibration accuracy against known benchmarks. The 'moving truth' flag marks instruments where the act of measurement changes the thing measured: a survey about trust may alter the respondent's trust. Self-report surveys have the highest coupling count but the lowest trust weight — they produce the most data but their depends chains (language comprehension, introspective access, social desirability) introduce systematic biases. Physiological sensors have higher trust but measure different properties. The RecursiveDecayStack, GWT, and IIT are model-prediction instruments — they produce predictions that compete for convergence against measurement instruments, exactly as LCDM predictions compete against CMB and Cepheid measurements in the Open universe." />
        </div>
      )}
    </div>
  );
}
