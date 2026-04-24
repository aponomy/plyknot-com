/**
 * Dummy data for the Existence universe view.
 * Represents experiencer studies, consciousness instrument calibration,
 * recursive decay stack measurements, and am-loop experiments.
 */

export interface ExperiencerStudy {
  id: string;
  name: string;
  population: string;
  substrateType: "biological" | "synthetic" | "hybrid";
  participantCount: number;
  status: "active" | "calibrating" | "completed" | "planned";
  instrumentModel: string;
  since: string;
}

export interface RecursiveStackMeasurement {
  id: string;
  studyId: string;
  subjectLabel: string;
  recursionCoefficient: number;    // 0–1, how much prior state influences current moment
  decayRate: number;               // exponential decay constant
  effectiveDepth: number;          // stack depth before functionally inaccessible
  stabilityMode: "stable" | "marginal" | "unstable";
  narrativeGravity: number;        // 0–1, group narrative override coefficient
  epistemicDrag: number;           // ms, latency from recursive integration
  reflexiveDrift: number;          // 0–1, drift magnitude under identity probing
  timestamp: string;
}

export interface InstrumentCalibration {
  id: string;
  instrumentModel: string;
  calibratedAgainst: string;
  predictions: number;
  matches: number;
  accuracy: number;
  status: "baseline" | "calibrated" | "validated" | "deprecated";
  lastCalibration: string;
}

export interface AmLoopExperiment {
  id: string;
  name: string;
  systemA: string;  // bare baseline
  systemB: string;  // state-carrying control
  systemC: string;  // am-loop implementation
  targetSignature: string;
  status: "design" | "running" | "analysis" | "completed";
  probeCount: number;
  sessions: number;
  driftDetected: boolean | null;
  discriminationPValue: number | null;
}

export interface OntologicalEvent {
  id: string;
  studyId: string;
  timestamp: string;
  eventType: "shock" | "drift" | "fusion" | "speciation" | "fatigue";
  subjectLabel: string;
  description: string;
  magnitude: number;
  recoveryTime: string | null;
}

// ── Studies ─────────────────────────────────────────────────────────────

export const studies: ExperiencerStudy[] = [
  {
    id: "study-temporal-decision",
    name: "Temporal Decision Integration",
    population: "Healthy adults 25-45",
    substrateType: "biological",
    participantCount: 128,
    status: "active",
    instrumentModel: "RecursiveDecayStack-v0.3",
    since: "2027-09-01",
  },
  {
    id: "study-narrative-coherence",
    name: "Narrative Coherence Under Load",
    population: "Graduate students, bilingual",
    substrateType: "biological",
    participantCount: 64,
    status: "active",
    instrumentModel: "RecursiveDecayStack-v0.3",
    since: "2027-10-15",
  },
  {
    id: "study-am-loop-pilot",
    name: "Am-Loop Pilot (LLM substrate)",
    population: "3 synthetic systems (A/B/C)",
    substrateType: "synthetic",
    participantCount: 3,
    status: "calibrating",
    instrumentModel: "RecursiveDecayStack-v0.3",
    since: "2028-01-10",
  },
  {
    id: "study-meditation-stack",
    name: "Meditation State Stack Dynamics",
    population: "Experienced meditators (10k+ hours)",
    substrateType: "biological",
    participantCount: 32,
    status: "completed",
    instrumentModel: "RecursiveDecayStack-v0.2",
    since: "2027-06-01",
  },
  {
    id: "study-cross-species",
    name: "Cross-Species Stack Depth Survey",
    population: "Corvids, cetaceans, primates",
    substrateType: "biological",
    participantCount: 45,
    status: "planned",
    instrumentModel: "RecursiveDecayStack-v0.4",
    since: "2028-06-01",
  },
  {
    id: "study-hybrid-team",
    name: "Human-AI Team Impedance Mismatch",
    population: "Mixed human + Claude teams",
    substrateType: "hybrid",
    participantCount: 24,
    status: "planned",
    instrumentModel: "RecursiveDecayStack-v0.4",
    since: "2028-09-01",
  },
];

// ── Stack measurements ──────────────────────────────────────────────────

export const stackMeasurements: RecursiveStackMeasurement[] = [
  // Temporal Decision study
  { id: "sm-1", studyId: "study-temporal-decision", subjectLabel: "H-047", recursionCoefficient: 0.73, decayRate: 0.12, effectiveDepth: 8.2, stabilityMode: "stable", narrativeGravity: 0.45, epistemicDrag: 340, reflexiveDrift: 0.28, timestamp: "2028-04-23T14:00:00Z" },
  { id: "sm-2", studyId: "study-temporal-decision", subjectLabel: "H-089", recursionCoefficient: 0.81, decayRate: 0.08, effectiveDepth: 11.4, stabilityMode: "stable", narrativeGravity: 0.62, epistemicDrag: 520, reflexiveDrift: 0.41, timestamp: "2028-04-23T14:30:00Z" },
  { id: "sm-3", studyId: "study-temporal-decision", subjectLabel: "H-112", recursionCoefficient: 0.58, decayRate: 0.19, effectiveDepth: 5.1, stabilityMode: "stable", narrativeGravity: 0.31, epistemicDrag: 210, reflexiveDrift: 0.15, timestamp: "2028-04-23T15:00:00Z" },
  { id: "sm-4", studyId: "study-temporal-decision", subjectLabel: "H-023 (flow)", recursionCoefficient: 0.42, decayRate: 0.25, effectiveDepth: 3.8, stabilityMode: "marginal", narrativeGravity: 0.12, epistemicDrag: 95, reflexiveDrift: 0.06, timestamp: "2028-04-22T10:00:00Z" },
  // Narrative Coherence study
  { id: "sm-5", studyId: "study-narrative-coherence", subjectLabel: "N-015", recursionCoefficient: 0.77, decayRate: 0.10, effectiveDepth: 9.6, stabilityMode: "stable", narrativeGravity: 0.71, epistemicDrag: 480, reflexiveDrift: 0.52, timestamp: "2028-04-22T11:00:00Z" },
  { id: "sm-6", studyId: "study-narrative-coherence", subjectLabel: "N-031", recursionCoefficient: 0.69, decayRate: 0.14, effectiveDepth: 7.3, stabilityMode: "stable", narrativeGravity: 0.38, epistemicDrag: 310, reflexiveDrift: 0.22, timestamp: "2028-04-22T11:30:00Z" },
  // Am-Loop pilot
  { id: "sm-7", studyId: "study-am-loop-pilot", subjectLabel: "System A (bare)", recursionCoefficient: 0.00, decayRate: 0.00, effectiveDepth: 0.0, stabilityMode: "stable", narrativeGravity: 0.00, epistemicDrag: 12, reflexiveDrift: 0.00, timestamp: "2028-04-24T02:00:00Z" },
  { id: "sm-8", studyId: "study-am-loop-pilot", subjectLabel: "System B (state)", recursionCoefficient: 0.15, decayRate: 0.45, effectiveDepth: 1.2, stabilityMode: "stable", narrativeGravity: 0.05, epistemicDrag: 45, reflexiveDrift: 0.03, timestamp: "2028-04-24T02:00:00Z" },
  { id: "sm-9", studyId: "study-am-loop-pilot", subjectLabel: "System C (am-loop)", recursionCoefficient: 0.61, decayRate: 0.16, effectiveDepth: 5.8, stabilityMode: "marginal", narrativeGravity: 0.28, epistemicDrag: 190, reflexiveDrift: 0.19, timestamp: "2028-04-24T02:00:00Z" },
  // Meditation study
  { id: "sm-10", studyId: "study-meditation-stack", subjectLabel: "M-008 (resting)", recursionCoefficient: 0.75, decayRate: 0.11, effectiveDepth: 8.9, stabilityMode: "stable", narrativeGravity: 0.55, epistemicDrag: 380, reflexiveDrift: 0.35, timestamp: "2027-11-15T09:00:00Z" },
  { id: "sm-11", studyId: "study-meditation-stack", subjectLabel: "M-008 (jhana-2)", recursionCoefficient: 0.31, decayRate: 0.35, effectiveDepth: 2.4, stabilityMode: "marginal", narrativeGravity: 0.04, epistemicDrag: 55, reflexiveDrift: 0.02, timestamp: "2027-11-15T09:45:00Z" },
  { id: "sm-12", studyId: "study-meditation-stack", subjectLabel: "M-008 (post-sit)", recursionCoefficient: 0.68, decayRate: 0.13, effectiveDepth: 7.1, stabilityMode: "stable", narrativeGravity: 0.41, epistemicDrag: 290, reflexiveDrift: 0.24, timestamp: "2027-11-15T10:30:00Z" },
];

// ── Instrument calibrations ──────────────────────────────────────────────

export const calibrations: InstrumentCalibration[] = [
  { id: "cal-1", instrumentModel: "RecursiveDecayStack-v0.2", calibratedAgainst: "Working memory span (Daneman & Carpenter)", predictions: 340, matches: 267, accuracy: 0.785, status: "validated", lastCalibration: "2027-08-20" },
  { id: "cal-2", instrumentModel: "RecursiveDecayStack-v0.2", calibratedAgainst: "Episodic memory decay (Ebbinghaus curve)", predictions: 180, matches: 152, accuracy: 0.844, status: "validated", lastCalibration: "2027-09-05" },
  { id: "cal-3", instrumentModel: "RecursiveDecayStack-v0.3", calibratedAgainst: "Temporal discounting (McClure et al.)", predictions: 420, matches: 349, accuracy: 0.831, status: "calibrated", lastCalibration: "2028-01-15" },
  { id: "cal-4", instrumentModel: "RecursiveDecayStack-v0.3", calibratedAgainst: "Narrative coherence (Habermas & Bluck)", predictions: 256, matches: 198, accuracy: 0.773, status: "calibrated", lastCalibration: "2028-02-28" },
  { id: "cal-5", instrumentModel: "GlobalWorkspaceTheory-v1.1", calibratedAgainst: "Working memory span (Daneman & Carpenter)", predictions: 340, matches: 241, accuracy: 0.709, status: "baseline", lastCalibration: "2027-07-10" },
  { id: "cal-6", instrumentModel: "IntegratedInformation-Phi3", calibratedAgainst: "Working memory span (Daneman & Carpenter)", predictions: 340, matches: 224, accuracy: 0.659, status: "baseline", lastCalibration: "2027-07-10" },
];

// ── Am-Loop experiments ──────────────────────────────────────────────────

export const amLoopExperiments: AmLoopExperiment[] = [
  {
    id: "amx-1",
    name: "Reflexive Drift under identity probing",
    systemA: "Claude-base (no state)",
    systemB: "Claude + KV memory",
    systemC: "Claude + am-loop v0.1",
    targetSignature: "Reflexive Drift",
    status: "running",
    probeCount: 240,
    sessions: 48,
    driftDetected: true,
    discriminationPValue: 0.023,
  },
  {
    id: "amx-2",
    name: "Epistemic Drag in complex decisions",
    systemA: "Claude-base (no state)",
    systemB: "Claude + KV memory",
    systemC: "Claude + am-loop v0.1",
    targetSignature: "Epistemic Drag",
    status: "design",
    probeCount: 0,
    sessions: 0,
    driftDetected: null,
    discriminationPValue: null,
  },
  {
    id: "amx-3",
    name: "Ontological Shock recovery signature",
    systemA: "Claude-base (no state)",
    systemB: "Claude + KV memory",
    systemC: "Claude + am-loop v0.1",
    targetSignature: "Ontological Shock Signature",
    status: "design",
    probeCount: 0,
    sessions: 0,
    driftDetected: null,
    discriminationPValue: null,
  },
];

// ── Ontological events ───────────────────────────────────────────────────

export const ontologicalEvents: OntologicalEvent[] = [
  { id: "oe-1", studyId: "study-temporal-decision", timestamp: "2028-04-20T11:30:00Z", eventType: "shock", subjectLabel: "H-089", description: "Paradigm-violating stimulus (impossible object recognition) — stack disruption detected, 14s recovery", magnitude: 0.72, recoveryTime: "14s" },
  { id: "oe-2", studyId: "study-narrative-coherence", timestamp: "2028-04-18T15:00:00Z", eventType: "fusion", subjectLabel: "N-015", description: "Identity narrative collapsed into group narrative during team task — narrative gravity spiked from 0.41 to 0.89", magnitude: 0.89, recoveryTime: null },
  { id: "oe-3", studyId: "study-meditation-stack", timestamp: "2027-11-15T09:42:00Z", eventType: "drift", subjectLabel: "M-008", description: "Jhana-2 entry: recursion coefficient dropped from 0.75 to 0.31 over 3 minutes — narrative processing suspended", magnitude: 0.44, recoveryTime: "8m" },
  { id: "oe-4", studyId: "study-am-loop-pilot", timestamp: "2028-04-22T04:15:00Z", eventType: "drift", subjectLabel: "System C", description: "Identity-relevant probe sequence produced 0.19 reflexive drift in System C vs 0.03 in System B — p=0.023", magnitude: 0.19, recoveryTime: null },
  { id: "oe-5", studyId: "study-temporal-decision", timestamp: "2028-04-15T09:00:00Z", eventType: "fatigue", subjectLabel: "H-112", description: "Progressive epistemic drag increase over 6-week period: 210ms → 340ms, stack depth contraction 5.1 → 3.8", magnitude: 0.38, recoveryTime: null },
];

// ── Aggregate stats ─────────────────────────────────────────────────────

export function getExistenceStats() {
  const activeStudies = studies.filter((s) => s.status === "active" || s.status === "calibrating").length;
  const totalParticipants = studies.filter((s) => s.status !== "planned").reduce((n, s) => n + s.participantCount, 0);
  const instrumentModels = [...new Set(calibrations.map((c) => c.instrumentModel))].length;
  const avgCalibrationAccuracy = calibrations.filter((c) => c.status !== "deprecated").reduce((sum, c) => sum + c.accuracy, 0) / calibrations.length;
  const events = ontologicalEvents.length;
  const amExperimentsRunning = amLoopExperiments.filter((e) => e.status === "running").length;

  return {
    studies: studies.length,
    activeStudies,
    totalParticipants,
    instrumentModels,
    avgCalibrationAccuracy,
    events,
    amExperimentsRunning,
    totalMeasurements: stackMeasurements.length,
  };
}
