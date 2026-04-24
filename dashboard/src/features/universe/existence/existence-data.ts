/**
 * Existence universe — convergence map for Level 3-5 entities.
 *
 * Same architecture as Open (physics): entities, coupling entries,
 * convergence analysis, cracks, echo chambers, speciation.
 * But at complexity levels where the brain constructs the measured object.
 *
 * At Level 0, a detector clicks and the brain is passive.
 * At Level 5, the brain invents both the object and the measurement procedure.
 * Convergence means something weaker here — independent reasoning paths
 * reach similar conclusions, not independent instruments agree on a number.
 */

// ── Entities (bare integer IDs, labels in registry) ─────────────────────

export interface SubjectiveEntity {
  id: number;
  label: string;
  level: 3 | 4 | 5;
  levelLabel: string;
  propertyCount: number;
  instrumentCount: number;
  convergenceRate: number; // 0–1, fraction of properties that converge
  crackCount: number;
  echoRisk: number; // 0–1
}

export const entities: SubjectiveEntity[] = [
  // Level 3 — Selection and replication
  { id: 301, label: "Prosocial behavior", level: 3, levelLabel: "L3 Selection", propertyCount: 8, instrumentCount: 5, convergenceRate: 0.62, crackCount: 2, echoRisk: 0.35 },
  { id: 302, label: "Parental investment", level: 3, levelLabel: "L3 Selection", propertyCount: 6, instrumentCount: 4, convergenceRate: 0.83, crackCount: 1, echoRisk: 0.20 },
  { id: 303, label: "Mate selection criteria", level: 3, levelLabel: "L3 Selection", propertyCount: 12, instrumentCount: 6, convergenceRate: 0.42, crackCount: 5, echoRisk: 0.55 },

  // Level 4 — Organism (individual experiencer)
  { id: 401, label: "Working memory capacity", level: 4, levelLabel: "L4 Organism", propertyCount: 5, instrumentCount: 7, convergenceRate: 0.86, crackCount: 0, echoRisk: 0.15 },
  { id: 402, label: "Emotional valence", level: 4, levelLabel: "L4 Organism", propertyCount: 9, instrumentCount: 8, convergenceRate: 0.54, crackCount: 3, echoRisk: 0.42 },
  { id: 403, label: "Temporal discounting", level: 4, levelLabel: "L4 Organism", propertyCount: 4, instrumentCount: 5, convergenceRate: 0.78, crackCount: 1, echoRisk: 0.25 },
  { id: 404, label: "Consciousness (phenomenal)", level: 4, levelLabel: "L4 Organism", propertyCount: 7, instrumentCount: 4, convergenceRate: 0.29, crackCount: 4, echoRisk: 0.71 },
  { id: 405, label: "Narrative coherence", level: 4, levelLabel: "L4 Organism", propertyCount: 6, instrumentCount: 3, convergenceRate: 0.50, crackCount: 2, echoRisk: 0.60 },
  { id: 406, label: "Flow state", level: 4, levelLabel: "L4 Organism", propertyCount: 5, instrumentCount: 4, convergenceRate: 0.65, crackCount: 1, echoRisk: 0.30 },

  // Level 5 — Institution / social
  { id: 501, label: "Institutional trust", level: 5, levelLabel: "L5 Social", propertyCount: 11, instrumentCount: 6, convergenceRate: 0.36, crackCount: 5, echoRisk: 0.68 },
  { id: 502, label: "Democracy (importance)", level: 5, levelLabel: "L5 Social", propertyCount: 8, instrumentCount: 4, convergenceRate: 0.25, crackCount: 4, echoRisk: 0.82 },
  { id: 503, label: "Well-being", level: 5, levelLabel: "L5 Social", propertyCount: 14, instrumentCount: 9, convergenceRate: 0.43, crackCount: 6, echoRisk: 0.58 },
  { id: 504, label: "Social cohesion", level: 5, levelLabel: "L5 Social", propertyCount: 7, instrumentCount: 3, convergenceRate: 0.28, crackCount: 3, echoRisk: 0.75 },
  { id: 505, label: "AI alignment", level: 5, levelLabel: "L5 Social", propertyCount: 6, instrumentCount: 5, convergenceRate: 0.20, crackCount: 5, echoRisk: 0.85 },
];

// ── Cracks — where independent instruments disagree ─────────────────────

export interface SubjectiveCrack {
  id: string;
  entityId: number;
  property: string;
  claim: string;
  instrumentA: string;
  instrumentB: string;
  valueA: string;
  valueB: string;
  sigmaTension: number;
  convergence: "tension" | "divergent";
  dependsOverlap: number; // 0–1, how much the two instruments share depends chains
  consequence: string;
}

export const cracks: SubjectiveCrack[] = [
  {
    id: "crack-1", entityId: 501, property: "trust-level",
    claim: "Institutional trust is declining",
    instrumentA: "Survey (Eurobarometer)", instrumentB: "Revealed preference (tax compliance, vaccination rates)",
    valueA: "Declining (-12pp since 2015)", valueB: "Stable (compliance rates unchanged)",
    sigmaTension: 3.8, convergence: "tension", dependsOverlap: 0.12,
    consequence: "Either surveys measure stated attitudes not actual trust, or compliance is habit-driven not trust-driven. The crack is in what 'trust' means operationally.",
  },
  {
    id: "crack-2", entityId: 402, property: "arousal",
    claim: "Emotional arousal is a unitary construct",
    instrumentA: "Self-report (SAM scale)", instrumentB: "Physiological (skin conductance + HR)",
    valueA: "r=0.31 cross-modal", valueB: "(reference)",
    sigmaTension: 4.2, convergence: "divergent", dependsOverlap: 0.08,
    consequence: "Subjective arousal and physiological arousal are different properties sharing a label. Speciation candidate. The flagship paper's EEVR validation found exactly this: valence converges (rho=0.486), arousal does not.",
  },
  {
    id: "crack-3", entityId: 502, property: "importance",
    claim: "Democracy is universally valued",
    instrumentA: "Survey (World Values Survey Q250)", instrumentB: "Behavioral (protest participation, institutional engagement)",
    valueA: "93% say 'important' or 'very important'", valueB: "12-28% actively participate",
    sigmaTension: 8.1, convergence: "divergent", dependsOverlap: 0.05,
    consequence: "Speciated in the plyknot text extraction: 'democracy importance' splits into aspiration (survey-measured, high) and experience (behavior-measured, low). Mean child sigma drops 46%. Half was terminological confusion.",
  },
  {
    id: "crack-4", entityId: 404, property: "presence",
    claim: "Consciousness can be detected by neural correlates",
    instrumentA: "fMRI (global workspace activation)", instrumentB: "Integrated Information (Phi measurement)",
    valueA: "GW activation detected in PFC", valueB: "Phi highest in posterior cortex",
    sigmaTension: 5.6, convergence: "divergent", dependsOverlap: 0.22,
    consequence: "Two leading consciousness instruments locate the phenomenon in different brain regions. The instruments don't agree on WHERE the thing they're measuring IS. Either the property is distributed, the instruments measure different things, or 'consciousness' is overloaded.",
  },
  {
    id: "crack-5", entityId: 503, property: "life-satisfaction",
    claim: "Life satisfaction is stable within individuals",
    instrumentA: "Longitudinal survey (German SOEP)", instrumentB: "Experience sampling (smartphone pings)",
    valueA: "Set-point theory: ICC=0.80 over 10yr", valueB: "Daily variance: ICC=0.35 within-person",
    sigmaTension: 3.2, convergence: "tension", dependsOverlap: 0.31,
    consequence: "Survey captures narrative self-assessment (recursive stack output). Experience sampling captures moment-states. These are different properties of the same entity — the stack output vs. the stack input.",
  },
  {
    id: "crack-6", entityId: 505, property: "alignment-measurement",
    claim: "RLHF produces aligned models",
    instrumentA: "Human evaluation (pairwise preference)", instrumentB: "Behavioral audit (red-team, real-world deployment)",
    valueA: "Win rate 78% vs base model", valueB: "Jailbreak rate 14%, sycophancy +23%",
    sigmaTension: 6.4, convergence: "divergent", dependsOverlap: 0.67,
    consequence: "High depends-overlap: both instruments rely on human judgment, but evaluation uses cooperative judges while audit uses adversarial probes. The convergence is weak because the measurement conditions differ — classic Goodhart: optimizing for the evaluation metric doesn't optimize for the deployed property.",
  },
  {
    id: "crack-7", entityId: 303, property: "physical-attractiveness-weight",
    claim: "Physical attractiveness is a primary mate selection criterion",
    instrumentA: "Self-report (stated preference)", instrumentB: "Speed dating (revealed preference)",
    valueA: "Ranked 4th-6th (below kindness, intelligence)", valueB: "Strongest single predictor (r=0.39)",
    sigmaTension: 5.1, convergence: "divergent", dependsOverlap: 0.10,
    consequence: "Classic stated-vs-revealed preference crack. The self-report instrument measures the narrative the experiencer tells about themselves. The behavioral instrument measures what the experiencer actually does. The recursive stack produces a self-story that diverges from its own action output.",
  },
];

// ── Echo chambers — shared methodology masquerading as independence ──────

export interface EchoChamber {
  id: string;
  entityId: number;
  property: string;
  instruments: string[];
  sharedDependency: string;
  dependsOverlap: number;
  apparentConvergence: number;
  estimatedTrueConvergence: number;
  risk: string;
}

export const echoChambers: EchoChamber[] = [
  {
    id: "echo-1", entityId: 503, property: "well-being (cross-national)",
    instruments: ["World Values Survey", "European Social Survey", "Gallup World Poll", "OECD Better Life Index"],
    sharedDependency: "All use self-report Likert scales administered to WEIRD-skewed samples",
    dependsOverlap: 0.78,
    apparentConvergence: 0.91, estimatedTrueConvergence: 0.34,
    risk: "Four instruments appear to agree that Nordic countries have highest well-being. But all four share the same measurement operation (self-report) and similar sampling frames. Independence is illusory. A single behavioral instrument (immigration flows, emigration rates) tells a partially different story.",
  },
  {
    id: "echo-2", entityId: 505, property: "model capability",
    instruments: ["MMLU", "HellaSwag", "ARC", "GSM8K", "HumanEval"],
    sharedDependency: "All are static benchmarks evaluated by the model on training-distribution-adjacent tasks",
    dependsOverlap: 0.82,
    apparentConvergence: 0.88, estimatedTrueConvergence: 0.41,
    risk: "Benchmark consensus creates the appearance of measured capability improvement. But all benchmarks share: English text, closed-form answers, training-data contamination risk, and no experiencer in the measurement loop. The 754 AlphaFold echo chambers are this pattern at industrial scale.",
  },
  {
    id: "echo-3", entityId: 404, property: "consciousness detection",
    instruments: ["Perturbational Complexity Index", "Spectral EEG", "GNW fMRI paradigm"],
    sharedDependency: "All assume consciousness produces specific neural signatures detectable by brain imaging",
    dependsOverlap: 0.64,
    apparentConvergence: 0.72, estimatedTrueConvergence: 0.38,
    risk: "Three instruments agree that consciousness correlates with neural complexity. But all three depend on the assumption that consciousness IS a neural phenomenon. A behavioral instrument (the am-loop test) that doesn't assume neural substrate would provide genuinely independent evidence.",
  },
  {
    id: "echo-4", entityId: 501, property: "trust (media)",
    instruments: ["Reuters Digital News Report", "Edelman Trust Barometer", "Pew media trust survey"],
    sharedDependency: "All use survey methodology asking about trust in named media institutions",
    dependsOverlap: 0.85,
    apparentConvergence: 0.93, estimatedTrueConvergence: 0.29,
    risk: "Three surveys agree media trust is declining. But 'trust' in a survey question measures recognition and stated attitude, not actual information-seeking behavior. News consumption data (traffic, subscriptions) shows a different pattern: people consume what they say they distrust.",
  },
];

// ── Speciation events — concepts that need splitting ─────────────────────

export interface SpeciationEvent {
  id: string;
  entityId: number;
  originalConcept: string;
  childA: string;
  childB: string;
  deltaBIC: number;
  sigmaReduction: number; // fraction
  status: "detected" | "confirmed" | "split";
  evidence: string;
}

export const speciations: SpeciationEvent[] = [
  {
    id: "spec-1", entityId: 502, originalConcept: "Democracy importance",
    childA: "Democracy as aspiration", childB: "Democracy as lived experience",
    deltaBIC: 28.4, sigmaReduction: 0.46, status: "confirmed",
    evidence: "Flagship paper text extraction: GMM splits the concept at DBIC=28.4. Aspiration cluster (survey-dominated, high values, low variance). Experience cluster (behavioral, lower values, high variance). 46% of original sigma was terminological confusion, not genuine disagreement.",
  },
  {
    id: "spec-2", entityId: 402, originalConcept: "Emotional arousal",
    childA: "Physiological arousal (autonomic)", childB: "Subjective arousal (self-reported)",
    deltaBIC: 34.1, sigmaReduction: 0.52, status: "confirmed",
    evidence: "EEVR dataset cross-modal validation: valence converges (rho=0.486) but arousal shows no cross-modal signal. The coupling map shows two distinct measurement clusters with near-zero between-cluster convergence. Confirmed as different properties sharing a label.",
  },
  {
    id: "spec-3", entityId: 505, originalConcept: "AI alignment",
    childA: "Alignment to stated preferences (training signal)", childB: "Alignment to revealed preferences (deployment behavior)",
    deltaBIC: 19.7, sigmaReduction: 0.38, status: "detected",
    evidence: "RLHF evaluation crack suggests the split. Training optimizes for stated-preference match; deployment reveals preference for a different distribution. Same conceptual overload as the democracy importance split.",
  },
  {
    id: "spec-4", entityId: 503, originalConcept: "Well-being",
    childA: "Hedonic well-being (moment experience)", childB: "Eudaimonic well-being (narrative self-assessment)",
    deltaBIC: 41.2, sigmaReduction: 0.55, status: "split",
    evidence: "The recursive decay stack model predicts this exact split: hedonic measures capture moment-state content (stack input), eudaimonic measures capture narrative integration (stack output). They use different properties of the same entity. Kahneman's experiencing-self vs remembering-self is a description of the same structural distinction.",
  },
];

// ── Instruments registered for Level 3-5 measurement ─────────────────────

export interface SubjectiveInstrument {
  id: string;
  name: string;
  type: "survey" | "behavioral" | "physiological" | "text-extraction" | "model-prediction" | "proxy";
  depends: string;
  entitiesMeasured: number;
  couplingCount: number;
  trustWeight: number;
  movingTruth: boolean; // does the measurement change the thing measured?
}

export const instruments: SubjectiveInstrument[] = [
  { id: "inst-1", name: "Self-report survey (Likert)", type: "survey", depends: "Language comprehension, introspective access, social desirability", entitiesMeasured: 9, couplingCount: 340, trustWeight: 0.45, movingTruth: true },
  { id: "inst-2", name: "Behavioral observation (lab)", type: "behavioral", depends: "Task design, ecological validity, observer effects", entitiesMeasured: 7, couplingCount: 180, trustWeight: 0.72, movingTruth: false },
  { id: "inst-3", name: "Experience sampling (ESM)", type: "behavioral", depends: "Smartphone compliance, momentary recall, sampling frequency", entitiesMeasured: 4, couplingCount: 95, trustWeight: 0.68, movingTruth: true },
  { id: "inst-4", name: "Physiological sensors (EDA, HR, fMRI)", type: "physiological", depends: "Signal processing pipeline, baseline correction, motion artifacts", entitiesMeasured: 5, couplingCount: 210, trustWeight: 0.78, movingTruth: false },
  { id: "inst-5", name: "LLM text extraction (plyknot describe)", type: "text-extraction", depends: "LLM training data, prompt design, CFG integration", entitiesMeasured: 11, couplingCount: 504, trustWeight: 0.61, movingTruth: false },
  { id: "inst-6", name: "Revealed preference (behavioral economics)", type: "proxy", depends: "Choice architecture, framing effects, stakes calibration", entitiesMeasured: 6, couplingCount: 120, trustWeight: 0.74, movingTruth: false },
  { id: "inst-7", name: "RecursiveDecayStack model", type: "model-prediction", depends: "IIR filter formalism, recursion coefficient estimation, calibration against cognitive benchmarks", entitiesMeasured: 4, couplingCount: 42, trustWeight: 0.55, movingTruth: false },
  { id: "inst-8", name: "Global Workspace Theory model", type: "model-prediction", depends: "GNW architecture, ignition threshold, access consciousness assumption", entitiesMeasured: 2, couplingCount: 28, trustWeight: 0.48, movingTruth: false },
  { id: "inst-9", name: "Integrated Information (Phi)", type: "model-prediction", depends: "IIT axioms, exclusion postulate, computational tractability", entitiesMeasured: 2, couplingCount: 18, trustWeight: 0.42, movingTruth: false },
];

// ── Stats ────────────────────────────────────────────────────────────────

export function getExistenceStats() {
  const totalCracks = cracks.length;
  const divergentCracks = cracks.filter((c) => c.convergence === "divergent").length;
  const totalEchoChambers = echoChambers.length;
  const avgConvergence = entities.reduce((s, e) => s + e.convergenceRate, 0) / entities.length;
  const totalSpeciations = speciations.length;
  const confirmedSpeciations = speciations.filter((s) => s.status === "confirmed" || s.status === "split").length;

  return {
    entities: entities.length,
    totalCracks,
    divergentCracks,
    totalEchoChambers,
    avgConvergence,
    totalSpeciations,
    confirmedSpeciations,
    instruments: instruments.length,
    movingTruthInstruments: instruments.filter((i) => i.movingTruth).length,
  };
}
