/**
 * Dummy data for the Existence observatory — subjective truth as it
 * moves through society. Not experiments; observations of what is.
 */

export interface Population {
  id: string;
  name: string;
  scope: string;
  size: string;
  meanNarrativeGravity: number;
  meanEpistemicDrag: number; // ms
  collectiveRecursionDepth: number;
  identityFusionIndex: number; // 0–1, how much individual identity has collapsed into group
  status: "observed" | "emerging" | "fragmenting";
  since: string;
}

export interface NarrativeCurrent {
  id: string;
  title: string;
  populationIds: string[];
  assemblyIndex: number; // high = organic, low = synthetic
  propagationVelocity: "slow" | "moderate" | "fast" | "viral";
  mackenzieMode: "generic" | "effective" | "barnesian" | "counter-performative";
  narrativeGravity: number;
  trend: "growing" | "stable" | "decaying" | "fragmenting";
  origin: string;
  firstObserved: string;
}

export interface OntologicalWeather {
  id: string;
  timestamp: string;
  eventType: "fusion" | "speciation" | "shock" | "drift" | "fatigue" | "emergence";
  populationId: string;
  title: string;
  description: string;
  magnitude: number;
  recoveryEstimate: string | null;
}

export interface ImpedanceSite {
  id: string;
  name: string;
  humanPopulation: string;
  aiSystem: string;
  interactionType: "evaluation" | "collaboration" | "delegation" | "governance";
  impedanceMismatch: number; // 0–1
  ontologicalShear: number; // 0–1
  dcoiGap: number; // depends-chain overlap gap
  status: "healthy" | "strained" | "critical";
  observation: string;
}

export interface ComplexityFlow {
  id: string;
  source: string;
  destination: string;
  assemblyIndex: number;
  flowType: "teaching" | "publication" | "artifact" | "institution" | "code" | "culture";
  volume: string;
  generationalImpact: number; // 0–1
  direction: "producing" | "consuming" | "reciprocal";
}

// ── Populations ─────────────────────────────────────────────────────────

export const populations: Population[] = [
  {
    id: "pop-eu-policy",
    name: "EU Policy Institutions",
    scope: "European Commission, ECB, national regulators",
    size: "~12,000 officials",
    meanNarrativeGravity: 0.74,
    meanEpistemicDrag: 890,
    collectiveRecursionDepth: 14.2,
    identityFusionIndex: 0.68,
    status: "observed",
    since: "2027-03-01",
  },
  {
    id: "pop-nordic-pharma",
    name: "Nordic Pharma R&D",
    scope: "AstraZeneca, Novo Nordisk, Sobi, Orion, Ferring",
    size: "~8,500 researchers",
    meanNarrativeGravity: 0.41,
    meanEpistemicDrag: 520,
    collectiveRecursionDepth: 9.8,
    identityFusionIndex: 0.32,
    status: "observed",
    since: "2027-06-01",
  },
  {
    id: "pop-oss-ai",
    name: "Open-Source AI Community",
    scope: "Hugging Face, Meta FAIR, EleutherAI, Stability contributors",
    size: "~45,000 active contributors",
    meanNarrativeGravity: 0.56,
    meanEpistemicDrag: 340,
    collectiveRecursionDepth: 6.1,
    identityFusionIndex: 0.44,
    status: "fragmenting",
    since: "2027-01-01",
  },
  {
    id: "pop-swedish-public",
    name: "Swedish Public Discourse",
    scope: "Media consumers, social media, institutional trust surveys",
    size: "~7.2M adults",
    meanNarrativeGravity: 0.62,
    meanEpistemicDrag: 670,
    collectiveRecursionDepth: 11.5,
    identityFusionIndex: 0.51,
    status: "observed",
    since: "2027-09-01",
  },
  {
    id: "pop-quant-finance",
    name: "Quantitative Finance",
    scope: "Algo desks, systematic hedge funds, HFT firms globally",
    size: "~35,000 practitioners",
    meanNarrativeGravity: 0.38,
    meanEpistemicDrag: 180,
    collectiveRecursionDepth: 5.4,
    identityFusionIndex: 0.27,
    status: "observed",
    since: "2027-02-01",
  },
  {
    id: "pop-consciousness-research",
    name: "Consciousness Research Community",
    scope: "ASSC, neuroscience of consciousness labs, philosophy of mind",
    size: "~2,800 active researchers",
    meanNarrativeGravity: 0.81,
    meanEpistemicDrag: 1200,
    collectiveRecursionDepth: 18.3,
    identityFusionIndex: 0.72,
    status: "emerging",
    since: "2028-01-01",
  },
];

// ── Narrative currents ──────────────────────────────────────────────────

export const narrativeCurrents: NarrativeCurrent[] = [
  {
    id: "narr-ai-risk",
    title: "AI existential risk as civilizational priority",
    populationIds: ["pop-eu-policy", "pop-oss-ai"],
    assemblyIndex: 0.73,
    propagationVelocity: "fast",
    mackenzieMode: "barnesian",
    narrativeGravity: 0.78,
    trend: "growing",
    origin: "Policy think tanks + tech safety orgs (2022-2024)",
    firstObserved: "2027-03-15",
  },
  {
    id: "narr-alpha-decay",
    title: "Quant alpha signals are exhausted",
    populationIds: ["pop-quant-finance"],
    assemblyIndex: 0.82,
    propagationVelocity: "moderate",
    mackenzieMode: "counter-performative",
    narrativeGravity: 0.45,
    trend: "stable",
    origin: "McLean-Pontiff 2016 + industry experience",
    firstObserved: "2027-04-01",
  },
  {
    id: "narr-precision-med",
    title: "Precision medicine will replace population-level trials",
    populationIds: ["pop-nordic-pharma"],
    assemblyIndex: 0.67,
    propagationVelocity: "slow",
    mackenzieMode: "effective",
    narrativeGravity: 0.52,
    trend: "growing",
    origin: "NIH precision medicine initiative + biomarker advances",
    firstObserved: "2027-06-15",
  },
  {
    id: "narr-trust-collapse",
    title: "Institutional trust is irreversibly declining",
    populationIds: ["pop-swedish-public", "pop-eu-policy"],
    assemblyIndex: 0.88,
    propagationVelocity: "slow",
    mackenzieMode: "effective",
    narrativeGravity: 0.69,
    trend: "growing",
    origin: "Decades of survey data + media ecosystem fragmentation",
    firstObserved: "2027-09-15",
  },
  {
    id: "narr-oss-fork",
    title: "Open-source AI is splitting into safety-first vs. acceleration camps",
    populationIds: ["pop-oss-ai"],
    assemblyIndex: 0.54,
    propagationVelocity: "viral",
    mackenzieMode: "generic",
    narrativeGravity: 0.61,
    trend: "fragmenting",
    origin: "License disputes + compute access stratification",
    firstObserved: "2027-11-01",
  },
  {
    id: "narr-hard-problem",
    title: "The hard problem of consciousness is dissoluble, not unsolvable",
    populationIds: ["pop-consciousness-research"],
    assemblyIndex: 0.91,
    propagationVelocity: "slow",
    mackenzieMode: "generic",
    narrativeGravity: 0.34,
    trend: "emerging",
    origin: "Operationalist reframing (Plyknot Existence program)",
    firstObserved: "2028-02-01",
  },
];

// ── Ontological weather ─────────────────────────────────────────────────

export const weatherEvents: OntologicalWeather[] = [
  {
    id: "wx-1",
    timestamp: "2028-04-22T08:00:00Z",
    eventType: "fusion",
    populationId: "pop-eu-policy",
    title: "EU AI Act enforcement identity fusion",
    description: "Officials in DG CONNECT increasingly define institutional identity through AI Act enforcement role. Individual critical assessment of Act limitations declining. Narrative gravity 0.74 \u2192 0.82 over 6 weeks.",
    magnitude: 0.82,
    recoveryEstimate: null,
  },
  {
    id: "wx-2",
    timestamp: "2028-04-18T14:00:00Z",
    eventType: "speciation",
    populationId: "pop-oss-ai",
    title: "Open-source AI community semantic speciation",
    description: "The term \"open\" now means incommensurable things across safety-first and acceleration sub-populations. GMM detects k=2 with DBIC=34.7. Shared vocabulary, incompatible ontologies.",
    magnitude: 0.71,
    recoveryEstimate: null,
  },
  {
    id: "wx-3",
    timestamp: "2028-04-15T10:00:00Z",
    eventType: "shock",
    populationId: "pop-quant-finance",
    title: "Flash correlation spike across carry strategies",
    description: "Six major carry-trade strategies simultaneously unwound in 90 minutes. Epistemic drag across quant population dropped from 180ms to 45ms (panic = collapse of recursive processing into reactive mode).",
    magnitude: 0.89,
    recoveryEstimate: "3-5 days",
  },
  {
    id: "wx-4",
    timestamp: "2028-04-10T16:00:00Z",
    eventType: "emergence",
    populationId: "pop-consciousness-research",
    title: "Operationalist reframing gaining traction",
    description: "Three independent research groups now using instrument-calibration methodology for consciousness models. Narrative gravity of hard-problem-as-unsolvable declining from 0.81 to 0.72 in target population.",
    magnitude: 0.44,
    recoveryEstimate: null,
  },
  {
    id: "wx-5",
    timestamp: "2028-04-05T09:00:00Z",
    eventType: "fatigue",
    populationId: "pop-swedish-public",
    title: "Election-cycle epistemic fatigue",
    description: "Aggregate epistemic drag rising steadily: 670ms \u2192 780ms over 3 months. Population showing reduced response to novel information, increased reliance on identity-consistent narratives. Classic pre-election pattern.",
    magnitude: 0.38,
    recoveryEstimate: "Post-election + 4-6 weeks",
  },
  {
    id: "wx-6",
    timestamp: "2028-03-28T12:00:00Z",
    eventType: "drift",
    populationId: "pop-nordic-pharma",
    title: "Biomarker endpoint narrative drift",
    description: "Slow reflexive drift: as precision medicine narrative gains gravity, biomarker validation standards are subtly loosening. Measurement-prediction ratio on endpoint quality declining 0.83 \u2192 0.71 over 6 months.",
    magnitude: 0.31,
    recoveryEstimate: null,
  },
];

// ── Impedance sites ─────────────────────────────────────────────────────

export const impedanceSites: ImpedanceSite[] = [
  {
    id: "imp-1",
    name: "EU AI Act compliance assessment",
    humanPopulation: "EU Policy Institutions",
    aiSystem: "GPT-5 + Claude for risk classification",
    interactionType: "governance",
    impedanceMismatch: 0.67,
    ontologicalShear: 0.54,
    dcoiGap: 0.41,
    status: "strained",
    observation: "AI systems classify risk on technical features; human officials classify on political salience. Same labels, different measurement operations.",
  },
  {
    id: "imp-2",
    name: "Clinical trial adaptive randomization",
    humanPopulation: "Nordic Pharma R&D",
    aiSystem: "Bayesian RAR engine + biomarker AI",
    interactionType: "collaboration",
    impedanceMismatch: 0.23,
    ontologicalShear: 0.15,
    dcoiGap: 0.18,
    status: "healthy",
    observation: "Well-calibrated collaboration. AI handles posterior updates; humans handle ethical oversight. Clear substrate boundary.",
  },
  {
    id: "imp-3",
    name: "Algorithmic trading signal generation",
    humanPopulation: "Quantitative Finance",
    aiSystem: "LLM-based alpha extraction + execution algos",
    interactionType: "delegation",
    impedanceMismatch: 0.45,
    ontologicalShear: 0.72,
    dcoiGap: 0.61,
    status: "strained",
    observation: "Humans delegate signal generation to LLMs but evaluate signals through narrative frameworks the LLMs don't share. Ontological shear: the LLM's 'conviction' has no recursive stack behind it.",
  },
  {
    id: "imp-4",
    name: "Open-source model evaluation",
    humanPopulation: "Open-Source AI Community",
    aiSystem: "LLM-as-Judge benchmarks (Arena, LMSYS)",
    interactionType: "evaluation",
    impedanceMismatch: 0.78,
    ontologicalShear: 0.83,
    dcoiGap: 0.72,
    status: "critical",
    observation: "LLMs evaluate LLMs on criteria derived from human preferences, but neither evaluator nor evaluated has the recursive stack that produced those preferences. Measurement without experiencer. Highest ontological shear in the observatory.",
  },
];

// ── Complexity flows ────────────────────────────────────────────────────

export const complexityFlows: ComplexityFlow[] = [
  { id: "cf-1", source: "Nordic Pharma R&D", destination: "Clinical practice (EU)", assemblyIndex: 0.89, flowType: "publication", volume: "~4,200 papers/yr", generationalImpact: 0.72, direction: "producing" },
  { id: "cf-2", source: "Open-Source AI Community", destination: "Global developer ecosystem", assemblyIndex: 0.76, flowType: "code", volume: "~120k commits/month", generationalImpact: 0.81, direction: "producing" },
  { id: "cf-3", source: "EU Policy Institutions", destination: "Member state regulators", assemblyIndex: 0.64, flowType: "institution", volume: "~300 regulatory acts/yr", generationalImpact: 0.58, direction: "producing" },
  { id: "cf-4", source: "Swedish public education", destination: "Swedish Public Discourse", assemblyIndex: 0.91, flowType: "teaching", volume: "~1.8M students/yr", generationalImpact: 0.88, direction: "producing" },
  { id: "cf-5", source: "Consciousness Research Community", destination: "AI safety community", assemblyIndex: 0.83, flowType: "publication", volume: "~180 papers/yr", generationalImpact: 0.45, direction: "reciprocal" },
  { id: "cf-6", source: "Social media platforms", destination: "Swedish Public Discourse", assemblyIndex: 0.22, flowType: "culture", volume: "~8.2M daily interactions", generationalImpact: 0.14, direction: "consuming" },
];

// ── Aggregate stats ─────────────────────────────────────────────────────

export function getObservatoryStats() {
  const fusionEvents = weatherEvents.filter((e) => e.eventType === "fusion" || e.eventType === "speciation").length;
  const criticalSites = impedanceSites.filter((s) => s.status === "critical").length;
  const strainedSites = impedanceSites.filter((s) => s.status === "strained").length;
  const barnesianNarratives = narrativeCurrents.filter((n) => n.mackenzieMode === "barnesian").length;
  const avgNarrativeGravity = populations.reduce((s, p) => s + p.meanNarrativeGravity, 0) / populations.length;

  return {
    populations: populations.length,
    narratives: narrativeCurrents.length,
    weatherEvents: weatherEvents.length,
    impedanceSites: impedanceSites.length,
    criticalSites,
    strainedSites,
    fusionEvents,
    barnesianNarratives,
    avgNarrativeGravity,
    complexityFlows: complexityFlows.length,
  };
}
