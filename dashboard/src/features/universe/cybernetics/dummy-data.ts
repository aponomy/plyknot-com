/**
 * Dummy data for the Cybernetics universe view.
 * Represents deployments, feedback loops, actors, and performativity regimes
 * across different customer verticals.
 */

export interface CyberneticsDeployment {
  id: string;
  name: string;
  customer: string;
  vertical: "finance" | "pharma" | "regulator" | "ai-safety";
  status: "active" | "pilot" | "onboarding";
  activeLoops: number;
  actors: number;
  couplingGroups: number;
  alerts: number;
  loopGainMax: number;
  since: string;
}

export interface FeedbackLoop {
  id: string;
  deploymentId: string;
  name: string;
  loopGain: number; // spectral radius |G|
  gainTrend: "rising" | "falling" | "stable";
  mackenzieMode: "generic" | "effective" | "barnesian" | "counter-performative";
  goodhartVariant: "none" | "regressional" | "extremal" | "causal" | "adversarial";
  couplingCount: number;
  sigmaAvg: number;
  lastUpdate: string;
}

export interface CyberneticsActor {
  id: string;
  deploymentId: string;
  name: string;
  type: "algorithm" | "human" | "institution" | "model";
  actions: number;
  predictions: number;
  measurements: number;
  trustWeight: number;
  lastActive: string;
}

export interface PerformativityEvent {
  id: string;
  deploymentId: string;
  loopId: string;
  timestamp: string;
  fromMode: string;
  toMode: string;
  trigger: string;
  loopGainAtTransition: number;
}

// ── Deployments ────────────────────────────────────────────────────────

export const deployments: CyberneticsDeployment[] = [
  {
    id: "dep-nordea-fx",
    name: "FX Carry Trade Monitor",
    customer: "Nordea Markets",
    vertical: "finance",
    status: "active",
    activeLoops: 4,
    actors: 12,
    couplingGroups: 87,
    alerts: 2,
    loopGainMax: 1.34,
    since: "2027-01-15",
  },
  {
    id: "dep-az-trial",
    name: "ARIA-7 Adaptive Trial",
    customer: "AstraZeneca",
    vertical: "pharma",
    status: "active",
    activeLoops: 2,
    actors: 6,
    couplingGroups: 34,
    alerts: 0,
    loopGainMax: 0.72,
    since: "2027-02-01",
  },
  {
    id: "dep-riksbank",
    name: "Forward Guidance Reflexivity",
    customer: "Sveriges Riksbank",
    vertical: "regulator",
    status: "pilot",
    activeLoops: 3,
    actors: 8,
    couplingGroups: 156,
    alerts: 1,
    loopGainMax: 0.97,
    since: "2027-03-10",
  },
  {
    id: "dep-anthropic-obs",
    name: "Preference Drift Detector",
    customer: "Anthropic",
    vertical: "ai-safety",
    status: "pilot",
    activeLoops: 1,
    actors: 3,
    couplingGroups: 22,
    alerts: 0,
    loopGainMax: 0.41,
    since: "2027-04-01",
  },
  {
    id: "dep-handelsbanken",
    name: "Mortgage Rate Echo Chamber",
    customer: "Handelsbanken",
    vertical: "finance",
    status: "onboarding",
    activeLoops: 0,
    actors: 0,
    couplingGroups: 0,
    alerts: 0,
    loopGainMax: 0,
    since: "2027-04-20",
  },
];

// ── Feedback loops ─────────────────────────────────────────────────────

export const feedbackLoops: FeedbackLoop[] = [
  // Nordea FX
  {
    id: "loop-nordea-1",
    deploymentId: "dep-nordea-fx",
    name: "SEK/EUR carry-signal erosion",
    loopGain: 1.34,
    gainTrend: "rising",
    mackenzieMode: "barnesian",
    goodhartVariant: "regressional",
    couplingCount: 23,
    sigmaAvg: 0.42,
    lastUpdate: "2027-04-24T09:15:00Z",
  },
  {
    id: "loop-nordea-2",
    deploymentId: "dep-nordea-fx",
    name: "USD/NOK vol-targeting feedback",
    loopGain: 0.88,
    gainTrend: "stable",
    mackenzieMode: "effective",
    goodhartVariant: "none",
    couplingCount: 18,
    sigmaAvg: 0.31,
    lastUpdate: "2027-04-24T09:12:00Z",
  },
  {
    id: "loop-nordea-3",
    deploymentId: "dep-nordea-fx",
    name: "EM basket crowding detector",
    loopGain: 1.02,
    gainTrend: "rising",
    mackenzieMode: "effective",
    goodhartVariant: "extremal",
    couplingCount: 31,
    sigmaAvg: 0.56,
    lastUpdate: "2027-04-24T08:45:00Z",
  },
  {
    id: "loop-nordea-4",
    deploymentId: "dep-nordea-fx",
    name: "JPY intervention response",
    loopGain: 0.65,
    gainTrend: "falling",
    mackenzieMode: "counter-performative",
    goodhartVariant: "causal",
    couplingCount: 15,
    sigmaAvg: 0.78,
    lastUpdate: "2027-04-24T07:30:00Z",
  },
  // AstraZeneca trial
  {
    id: "loop-az-1",
    deploymentId: "dep-az-trial",
    name: "Arm allocation → efficacy signal",
    loopGain: 0.72,
    gainTrend: "stable",
    mackenzieMode: "generic",
    goodhartVariant: "none",
    couplingCount: 14,
    sigmaAvg: 0.25,
    lastUpdate: "2027-04-23T18:00:00Z",
  },
  {
    id: "loop-az-2",
    deploymentId: "dep-az-trial",
    name: "Biomarker → dose escalation",
    loopGain: 0.58,
    gainTrend: "falling",
    mackenzieMode: "generic",
    goodhartVariant: "none",
    couplingCount: 20,
    sigmaAvg: 0.19,
    lastUpdate: "2027-04-23T18:00:00Z",
  },
  // Riksbank
  {
    id: "loop-rb-1",
    deploymentId: "dep-riksbank",
    name: "Rate path signal → market pricing",
    loopGain: 0.97,
    gainTrend: "rising",
    mackenzieMode: "barnesian",
    goodhartVariant: "regressional",
    couplingCount: 42,
    sigmaAvg: 0.38,
    lastUpdate: "2027-04-24T06:00:00Z",
  },
  {
    id: "loop-rb-2",
    deploymentId: "dep-riksbank",
    name: "Inflation expectation anchoring",
    loopGain: 0.71,
    gainTrend: "stable",
    mackenzieMode: "effective",
    goodhartVariant: "none",
    couplingCount: 56,
    sigmaAvg: 0.29,
    lastUpdate: "2027-04-24T06:00:00Z",
  },
  {
    id: "loop-rb-3",
    deploymentId: "dep-riksbank",
    name: "Housing credit channel",
    loopGain: 0.84,
    gainTrend: "rising",
    mackenzieMode: "effective",
    goodhartVariant: "causal",
    couplingCount: 58,
    sigmaAvg: 0.47,
    lastUpdate: "2027-04-24T06:00:00Z",
  },
  // Anthropic
  {
    id: "loop-anth-1",
    deploymentId: "dep-anthropic-obs",
    name: "RLHF preference loop",
    loopGain: 0.41,
    gainTrend: "stable",
    mackenzieMode: "generic",
    goodhartVariant: "none",
    couplingCount: 22,
    sigmaAvg: 0.15,
    lastUpdate: "2027-04-24T02:00:00Z",
  },
];

// ── Actors ──────────────────────────────────────────────────────────────

export const actors: CyberneticsActor[] = [
  { id: "act-n1", deploymentId: "dep-nordea-fx", name: "FX Algo Desk A", type: "algorithm", actions: 1247, predictions: 3891, measurements: 5623, trustWeight: 0.82, lastActive: "2027-04-24T09:15:00Z" },
  { id: "act-n2", deploymentId: "dep-nordea-fx", name: "FX Algo Desk B", type: "algorithm", actions: 892, predictions: 2103, measurements: 4102, trustWeight: 0.79, lastActive: "2027-04-24T09:14:00Z" },
  { id: "act-n3", deploymentId: "dep-nordea-fx", name: "Risk Committee", type: "institution", actions: 34, predictions: 67, measurements: 0, trustWeight: 0.95, lastActive: "2027-04-23T16:00:00Z" },
  { id: "act-n4", deploymentId: "dep-nordea-fx", name: "BoJ (observed)", type: "institution", actions: 3, predictions: 0, measurements: 12, trustWeight: 0.99, lastActive: "2027-04-22T06:00:00Z" },
  { id: "act-az1", deploymentId: "dep-az-trial", name: "Bayesian RAR Engine", type: "model", actions: 89, predictions: 445, measurements: 0, trustWeight: 0.91, lastActive: "2027-04-23T18:00:00Z" },
  { id: "act-az2", deploymentId: "dep-az-trial", name: "DSMB Panel", type: "human", actions: 4, predictions: 0, measurements: 0, trustWeight: 0.98, lastActive: "2027-04-15T12:00:00Z" },
  { id: "act-rb1", deploymentId: "dep-riksbank", name: "Executive Board", type: "institution", actions: 8, predictions: 24, measurements: 0, trustWeight: 0.99, lastActive: "2027-04-17T10:00:00Z" },
  { id: "act-rb2", deploymentId: "dep-riksbank", name: "RAMSES III (DSGE)", type: "model", actions: 0, predictions: 1200, measurements: 0, trustWeight: 0.73, lastActive: "2027-04-24T06:00:00Z" },
  { id: "act-rb3", deploymentId: "dep-riksbank", name: "Market Expectations Survey", type: "institution", actions: 0, predictions: 0, measurements: 340, trustWeight: 0.86, lastActive: "2027-04-20T12:00:00Z" },
  { id: "act-an1", deploymentId: "dep-anthropic-obs", name: "Claude 4.x reward model", type: "model", actions: 0, predictions: 15000, measurements: 0, trustWeight: 0.88, lastActive: "2027-04-24T02:00:00Z" },
  { id: "act-an2", deploymentId: "dep-anthropic-obs", name: "Human raters (pool)", type: "human", actions: 0, predictions: 0, measurements: 8200, trustWeight: 0.92, lastActive: "2027-04-24T01:00:00Z" },
];

// ── Performativity events (regime transitions) ──────────────────────────

export const performativityEvents: PerformativityEvent[] = [
  {
    id: "pe-1",
    deploymentId: "dep-nordea-fx",
    loopId: "loop-nordea-1",
    timestamp: "2027-04-18T14:22:00Z",
    fromMode: "effective",
    toMode: "barnesian",
    trigger: "Three desks converged on same carry signal within 48h",
    loopGainAtTransition: 1.12,
  },
  {
    id: "pe-2",
    deploymentId: "dep-nordea-fx",
    loopId: "loop-nordea-4",
    timestamp: "2027-04-10T03:45:00Z",
    fromMode: "barnesian",
    toMode: "counter-performative",
    trigger: "BoJ surprise intervention invalidated consensus position",
    loopGainAtTransition: 1.87,
  },
  {
    id: "pe-3",
    deploymentId: "dep-riksbank",
    loopId: "loop-rb-1",
    timestamp: "2027-04-17T10:30:00Z",
    fromMode: "effective",
    toMode: "barnesian",
    trigger: "April rate-path signal matched market pricing within 2bp",
    loopGainAtTransition: 0.94,
  },
];

// ── Aggregate stats ─────────────────────────────────────────────────────

export function getCyberneticsStats() {
  const active = deployments.filter((d) => d.status === "active").length;
  const pilot = deployments.filter((d) => d.status === "pilot").length;
  const totalLoops = feedbackLoops.length;
  const amplifying = feedbackLoops.filter((l) => l.loopGain >= 1.0).length;
  const totalAlerts = deployments.reduce((n, d) => n + d.alerts, 0);
  const totalActors = actors.length;
  const barnesianCount = feedbackLoops.filter((l) => l.mackenzieMode === "barnesian").length;
  const counterCount = feedbackLoops.filter((l) => l.mackenzieMode === "counter-performative").length;

  return {
    deployments: deployments.length,
    active,
    pilot,
    totalLoops,
    amplifying,
    damping: totalLoops - amplifying,
    totalAlerts,
    totalActors,
    barnesianCount,
    counterCount,
    recentTransitions: performativityEvents.length,
  };
}
