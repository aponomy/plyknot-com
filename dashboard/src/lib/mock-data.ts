// --- Registry (phone book) ---

export interface RegistryEntry {
  id: number;
  labels: string[];
  description: string;
  complexity_levels: number[];
  tags?: string[];
  measurement_count?: number;
  instrument_count?: number;
  convergence?: "converged" | "tension" | "divergent" | "single" | "unmeasured";
  depth?: "deep" | "moderate" | "thin" | "absent";
}

export const registry: RegistryEntry[] = [
  { id: 1, labels: ["Lorentz force law"], description: "Force on charged particle in EM field: F = q(E + v×B)", complexity_levels: [0], tags: ["fundamental", "electromagnetism"], measurement_count: 47, instrument_count: 8, convergence: "converged", depth: "deep" },
  { id: 3, labels: ["e/m", "charge-to-mass ratio"], description: "Electron charge-to-mass ratio as universal pattern", complexity_levels: [0], tags: ["fundamental", "pattern"], measurement_count: 126, instrument_count: 12, convergence: "converged", depth: "deep" },
  { id: 4, labels: ["charge", "electric charge"], description: "Electric charge as measured property", complexity_levels: [0], tags: ["fundamental", "property"], measurement_count: 500, instrument_count: 15, convergence: "converged", depth: "deep" },
  { id: 11, labels: ["Electron pattern"], description: "Universal clustering of e/m + charge + spin-½", complexity_levels: [0], tags: ["fundamental", "pattern"], measurement_count: 200, instrument_count: 6, convergence: "converged", depth: "deep" },
  { id: 18, labels: ["Doppler effect"], description: "Observed frequency shift from relative motion", complexity_levels: [0], tags: ["fundamental", "observable"], measurement_count: 34, instrument_count: 5, convergence: "converged", depth: "moderate" },
  { id: 27, labels: ["GR", "general relativity"], description: "Einstein general relativity", complexity_levels: [0], tags: ["fundamental", "theory"], measurement_count: 89, instrument_count: 7, convergence: "tension", depth: "deep" },
  { id: 44, labels: ["lock-and-key binding model", "Fischer binding"], description: "Substrate fits active site like key in lock (Fischer 1894)", complexity_levels: [2], tags: ["biochemistry", "model"], measurement_count: 12, instrument_count: 3, convergence: "tension", depth: "moderate" },
  { id: 45, labels: ["thermodynamic equilibrium"], description: "System at Boltzmann distribution; no net flow of energy", complexity_levels: [0, 2, 3], tags: ["fundamental", "cross-domain"], measurement_count: 67, instrument_count: 9, convergence: "converged", depth: "deep" },
  { id: 412, labels: ["MCL-1"], description: "Myeloid cell leukemia 1, anti-apoptotic BCL-2 family protein", complexity_levels: [1, 2], tags: ["protein", "anti-apoptotic", "drug-target"], measurement_count: 28, instrument_count: 6, convergence: "divergent", depth: "moderate" },
  { id: 413, labels: ["MCL-1:WT"], description: "MCL-1 wild-type protein", complexity_levels: [2], tags: ["protein", "variant"], measurement_count: 15, instrument_count: 4, convergence: "tension", depth: "thin" },
  { id: 414, labels: ["MCL-1:A-1210477 complex"], description: "MCL-1 in complex with A-1210477 inhibitor", complexity_levels: [2], tags: ["protein-ligand", "complex"], measurement_count: 8, instrument_count: 3, convergence: "tension", depth: "thin" },
  { id: 450, labels: ["BCL-2"], description: "B-cell lymphoma 2, anti-apoptotic protein", complexity_levels: [1, 2], tags: ["protein", "anti-apoptotic"], measurement_count: 42, instrument_count: 8, convergence: "converged", depth: "moderate" },
  { id: 501, labels: ["A-1210477"], description: "Selective MCL-1 inhibitor (indole-2-carboxylic acid derivative)", complexity_levels: [1], tags: ["small-molecule", "MCL-1 inhibitor"], measurement_count: 18, instrument_count: 5, convergence: "divergent", depth: "moderate" },
  { id: 502, labels: ["A-1331852"], description: "Selective MCL-1 inhibitor, second generation", complexity_levels: [1], tags: ["small-molecule", "MCL-1 inhibitor"], measurement_count: 9, instrument_count: 3, convergence: "tension", depth: "thin" },
  { id: 503, labels: ["S63845"], description: "Potent and selective MCL-1 inhibitor", complexity_levels: [1], tags: ["small-molecule", "MCL-1 inhibitor"], measurement_count: 22, instrument_count: 6, convergence: "converged", depth: "moderate" },
  { id: 504, labels: ["venetoclax"], description: "Selective BCL-2 inhibitor (ABT-199), FDA-approved", complexity_levels: [1], tags: ["small-molecule", "BCL-2 inhibitor", "approved"], measurement_count: 156, instrument_count: 14, convergence: "converged", depth: "deep" },
  { id: 603, labels: ["hepatic clearance"], description: "Rate of drug elimination by the liver", complexity_levels: [2], tags: ["ADME", "pharmacokinetics"], measurement_count: 5, instrument_count: 2, convergence: "tension", depth: "thin" },
  { id: 604, labels: ["microsomal stability"], description: "Drug stability in liver microsome preparations", complexity_levels: [2], tags: ["ADME", "in-vitro"], measurement_count: 3, instrument_count: 1, convergence: "single", depth: "thin" },
  { id: 700, labels: ["melting temperature", "Tm"], description: "Temperature at which 50% of protein is unfolded", complexity_levels: [2], tags: ["biophysical", "thermal"], measurement_count: 7, instrument_count: 2, convergence: "converged", depth: "thin" },
  { id: 1001, labels: ["H₀", "Hubble constant"], description: "Rate of expansion of the universe at present epoch", complexity_levels: [0], tags: ["cosmology", "fundamental"], measurement_count: 340, instrument_count: 12, convergence: "divergent", depth: "deep" },
  { id: 1002, labels: ["AlphaFold"], description: "DeepMind protein structure prediction system", complexity_levels: [2], tags: ["computational", "protein-structure", "AI"], measurement_count: 1807, instrument_count: 1, convergence: "tension", depth: "deep" },
  { id: 1003, labels: ["TMPRSS2"], description: "Transmembrane serine protease 2", complexity_levels: [2], tags: ["protein", "protease", "SARS-CoV-2"], measurement_count: 18, instrument_count: 4, convergence: "tension", depth: "moderate" },
];

const registryIndex = new Map<number, RegistryEntry>();
for (const entry of registry) registryIndex.set(entry.id, entry);

export function getRegistryEntry(id: number): RegistryEntry | undefined {
  return registryIndex.get(id);
}

export function searchRegistry(query: string): RegistryEntry[] {
  const q = query.toLowerCase();
  return registry.filter((e) =>
    e.labels.some((l) => l.toLowerCase().includes(q)) ||
    e.description.toLowerCase().includes(q) ||
    (e.tags ?? []).some((t) => t.toLowerCase().includes(q))
  );
}

// --- Project types ---

export type ProjectKind = "crack-resolution" | "extraction-batch" | "surveillance" | "opening-extension" | "investigation";

export interface Project {
  id: string;
  name: string;
  kind: ProjectKind;
  status: "active" | "paused" | "completed" | "blocked" | "awaiting-wet-lab" | "awaiting-input" | "budget-exceeded";
  archived?: boolean;
  description: string;
  phase?: string;
  budget_usd: number;
  spent_usd: number;
  created_at: string;
  last_activity: string;
  // Grid position(s) this project operates on
  gridPositions?: { inference: string; complexity: number }[];
  // crack-resolution / opening-extension
  crack_ids?: string[];
  hypotheses?: number;
  hypotheses_in_tree?: number;
  elo_range?: string;
  // extraction-batch
  target_count?: number;
  ingested_count?: number;
  couplings_emitted?: number;
  avg_per_paper?: number;
  scout_rate?: number;
  extractor_success?: number;
  keywords?: string[];
  venues?: string[];
  date_range?: { start: string; end: string };
  conflicts?: number;
  // surveillance
  schedule?: string;
  signals_new?: number;
  watchlist?: string[];
}

export const projects: Project[] = [
  {
    id: "alphafold-binding-site-v1",
    name: "alphafold-binding-site-v1",
    kind: "crack-resolution",
    status: "active",
    description: "AlphaFold binding-site prediction vs crystallographic evidence",
    budget_usd: 800,
    spent_usd: 213,
    created_at: "2026-04-18",
    last_activity: "17m ago",
    phase: "Tournament",
    gridPositions: [{ inference: "model", complexity: 2 }, { inference: "pattern", complexity: 2 }],
    crack_ids: ["alphafold-binding-site"],
    hypotheses: 12,
    hypotheses_in_tree: 3,
    elo_range: "1102–1412",
  },
  {
    id: "h0-tension",
    name: "h0-tension",
    kind: "crack-resolution",
    status: "active",
    description: "Hubble tension — local vs CMB measurements",
    budget_usd: 500,
    spent_usd: 94,
    created_at: "2026-04-10",
    last_activity: "2h ago",
    gridPositions: [{ inference: "measurement", complexity: 0 }, { inference: "pattern", complexity: 0 }],
    crack_ids: ["h0-tension"],
    hypotheses: 4,
    hypotheses_in_tree: 1,
    elo_range: "1180–1312",
  },
  {
    id: "cxr-radiologist-echo",
    name: "cxr-radiologist-echo",
    kind: "crack-resolution",
    status: "paused",
    description: "CXR radiologist echo-chamber investigation",
    budget_usd: 200,
    spent_usd: 0,
    created_at: "2026-04-05",
    last_activity: "3d ago",
    gridPositions: [{ inference: "pattern", complexity: 2 }, { inference: "measurement", complexity: 2 }],
    crack_ids: ["cxr-radiologist-echo"],
    hypotheses: 2,
    hypotheses_in_tree: 0,
  },
  {
    id: "mcl1-literature-2024-2026",
    name: "mcl1-literature-2024-2026",
    kind: "extraction-batch",
    status: "active",
    description: "MCL-1 binding-affinity literature, 2024–2026",
    budget_usd: 200,
    spent_usd: 47,
    created_at: "2026-04-18",
    last_activity: "3h ago",
    target_count: 500,
    ingested_count: 127,
    couplings_emitted: 583,
    avg_per_paper: 4.6,
    scout_rate: 14,
    extractor_success: 94.3,
    gridPositions: [{ inference: "measurement", complexity: 1 }, { inference: "signal", complexity: 1 }],
    keywords: ["MCL-1", "BH3 mimetic", "anti-apoptotic"],
    venues: ["bioRxiv", "Nature", "J. Med. Chem.", "Cell", "Sci. Adv."],
    date_range: { start: "2024-01-01", end: "2026-04-19" },
    conflicts: 1,
  },
  {
    id: "tmprss2-recent-2025-2026",
    name: "tmprss2-recent-2025-2026",
    kind: "extraction-batch",
    status: "active",
    description: "TMPRSS2 recent literature, 2025–2026",
    budget_usd: 200,
    spent_usd: 82,
    created_at: "2026-04-12",
    last_activity: "4h ago",
    target_count: 200,
    ingested_count: 89,
    couplings_emitted: 412,
    avg_per_paper: 4.6,
    scout_rate: 11,
    extractor_success: 96.1,
    gridPositions: [{ inference: "measurement", complexity: 2 }, { inference: "signal", complexity: 2 }],
    keywords: ["TMPRSS2", "serine protease"],
    venues: ["bioRxiv", "PNAS"],
    date_range: { start: "2025-01-01", end: "2026-04-19" },
    conflicts: 0,
  },
  {
    id: "echo-surveillance-cxr",
    name: "echo-surveillance-cxr",
    kind: "surveillance",
    status: "active",
    description: "Scheduled echo-chamber scan for CXR domain",
    budget_usd: 0,
    spent_usd: 0,
    created_at: "2026-04-01",
    last_activity: "11h ago",
    gridPositions: [{ inference: "pattern", complexity: 2 }],
    schedule: "daily",
    signals_new: 3,
    watchlist: ["echo-chamber:cxr-spr", "echo-chamber:cxr-pathology"],
  },
  {
    id: "proton-charge-radius",
    name: "proton-charge-radius",
    kind: "investigation",
    status: "completed",
    archived: true,
    description: "Proton charge radius puzzle — muonic vs electronic measurements",
    budget_usd: 300,
    spent_usd: 280,
    created_at: "2026-03-01",
    last_activity: "12d ago",
    phase: "Wrap-up",
    gridPositions: [{ inference: "measurement", complexity: 0 }],
    hypotheses: 6,
    hypotheses_in_tree: 2,
    elo_range: "1050–1290",
  },
];

export function getProject(id: string): Project | undefined {
  return projects.find((p) => p.id === id);
}

// --- Factory mock data ---

export type TaskType = "judge" | "execute" | "propose" | "extract" | "plan" | "render";

export interface QueueItem {
  type: TaskType;
  count: number;
}

export const queueDepth: QueueItem[] = [
  { type: "judge", count: 10 },
  { type: "execute", count: 5 },
  { type: "propose", count: 3 },
  { type: "extract", count: 3 },
  { type: "plan", count: 2 },
  { type: "render", count: 1 },
];

export type JudgeAgreement = "3-agree" | "2-1" | "1-1-1";

export interface JudgeMatch {
  id: number;
  project: string;
  hypothesis: string;
  agreement: JudgeAgreement;
  models: string[];
  result?: string;
}

export const recentMatches: JudgeMatch[] = [
  { id: 1, project: "alphafold-binding-site-v1", hypothesis: "H-pocket", agreement: "3-agree", models: ["Claude", "GPT", "Gemini"], result: "H-pocket" },
  { id: 2, project: "alphafold-binding-site-v1", hypothesis: "H-MSA", agreement: "3-agree", models: ["Claude", "GPT", "Gemini"], result: "H-MSA" },
  { id: 3, project: "h0-tension", hypothesis: "EDE-v2", agreement: "2-1", models: ["Claude", "GPT", "Gemini"], result: "EDE-v2 (majority)" },
  { id: 4, project: "alphafold-binding-site-v1", hypothesis: "H-MD-ensemble", agreement: "3-agree", models: ["Claude", "GPT", "Gemini"], result: "H-MD-ensemble" },
  { id: 5, project: "alphafold-binding-site-v1", hypothesis: "H-docking", agreement: "2-1", models: ["Claude", "GPT", "Gemini"], result: "H-docking (majority)" },
  { id: 6, project: "h0-tension", hypothesis: "TRGB-cal", agreement: "3-agree", models: ["Claude", "GPT", "Gemini"], result: "TRGB-cal" },
  { id: 7, project: "alphafold-binding-site-v1", hypothesis: "H-MSA vs H-pocket", agreement: "1-1-1", models: ["Claude", "GPT", "Gemini"] },
  { id: 8, project: "alphafold-binding-site-v1", hypothesis: "H-water", agreement: "3-agree", models: ["Claude", "GPT", "Gemini"], result: "H-water" },
  { id: 9, project: "h0-tension", hypothesis: "SH0ES-sys", agreement: "2-1", models: ["Claude", "GPT", "Gemini"], result: "SH0ES-sys (majority)" },
  { id: 10, project: "alphafold-binding-site-v1", hypothesis: "H-flex-dock", agreement: "3-agree", models: ["Claude", "GPT", "Gemini"], result: "H-flex-dock" },
];

export interface CostEntry {
  day: string;
  cost: number;
}

export const costHistory: CostEntry[] = [
  { day: "Apr 13", cost: 32 },
  { day: "Apr 14", cost: 38 },
  { day: "Apr 15", cost: 45 },
  { day: "Apr 16", cost: 37 },
  { day: "Apr 17", cost: 52 },
  { day: "Apr 18", cost: 49 },
  { day: "Apr 19", cost: 41 },
];

// --- Review mock data ---

export type ReviewItemType = "judge-divergence" | "extraction-conflict" | "embargo-expiry" | "rendering-draft" | "trust-drop";

export interface ReviewItem {
  id: string;
  type: ReviewItemType;
  title: string;
  detail: string;
  project?: string;
  age: string;
  actions: string[];
}

export const reviewItems: ReviewItem[] = [
  {
    id: "r1",
    type: "judge-divergence",
    title: "Judge divergence in match 7 of alphafold-binding-site-v1",
    detail: "GPT picked H-MSA, Claude+Gemini picked H-pocket",
    project: "alphafold-binding-site-v1",
    age: "17m",
    actions: ["accept majority", "escalate to fourth"],
  },
  {
    id: "r2",
    type: "extraction-conflict",
    title: "Kₐ(MCL-1/A1210477) = 1.7 nM conflicts with consensus 0.8 nM",
    detail: "bioRxiv 2026.03.4231 — SPR cluster",
    project: "mcl1-literature-2024-2026",
    age: "2h",
    actions: ["accept new", "reject", "flag for manual review"],
  },
  {
    id: "r3",
    type: "extraction-conflict",
    title: "Ambiguous entity: 'microsomal stability idx'",
    detail: "arXiv 2026.04.9823 — could not ground to existing entity",
    project: "mcl1-literature-2024-2026",
    age: "3h",
    actions: ["create entity", "map to existing", "skip"],
  },
  {
    id: "r4",
    type: "embargo-expiry",
    title: "Embargo expires in 6 days",
    detail: "crack AB-2026-003 → public on Apr 25",
    age: "1d",
    actions: ["extend 30d", "release now", "acknowledge"],
  },
  {
    id: "r5",
    type: "rendering-draft",
    title: "Satellite draft: AlphaFold binding-site crack review",
    detail: "2,400 words · pass 2 complete · validator: 0 issues",
    project: "alphafold-binding-site-v1",
    age: "4h",
    actions: ["approve", "request revision", "reject"],
  },
  {
    id: "r6",
    type: "rendering-draft",
    title: "Satellite draft: H₀ tension measurement update",
    detail: "1,800 words · pass 1 complete · validator: 1 warning",
    project: "h0-tension",
    age: "5h",
    actions: ["approve", "request revision", "reject"],
  },
  {
    id: "r7",
    type: "trust-drop",
    title: "Trust-weight drop: GPT-4-turbo on protein entity class",
    detail: "Weight dropped from 0.82 → 0.71 over last 20 judgements",
    age: "6h",
    actions: ["investigate", "acknowledge", "reset weight"],
  },
];

// --- Disambiguation / grounding mock data ---

export type DisambiguationVerdict = "strong_match" | "weak_match" | "ambiguous" | "new_entity" | "rejected";

export interface DisambiguationCandidate {
  entityId: number;
  label: string;
  similarity: number;
  tags?: string[];
}

export interface DisambiguationEntry {
  id: string;
  project: string;
  timestamp: string;
  submittedLabel: string;
  submittedProperty: string;
  submittedMethod: string;
  submittedValue: string;
  verdict: DisambiguationVerdict;
  resolvedEntityId?: number;
  resolvedLabel?: string;
  // Three independent checks
  labelCandidates: DisambiguationCandidate[];
  relationalMatches: number[];
  propertySignatureMatches: number[];
  // Reviewer action
  reviewedBy?: string;
  reviewAction?: "accepted" | "overridden" | "pending";
  paper?: string;
}

export const disambiguationEntries: DisambiguationEntry[] = [
  {
    id: "dis-1",
    project: "mcl1-literature-2024-2026",
    timestamp: "2026-04-19T15:47Z",
    submittedLabel: "MCL-1",
    submittedProperty: "Kd",
    submittedMethod: "SPR",
    submittedValue: "0.82 nM",
    verdict: "strong_match",
    resolvedEntityId: 412,
    resolvedLabel: "MCL-1",
    labelCandidates: [
      { entityId: 412, label: "MCL-1", similarity: 0.97, tags: ["protein", "anti-apoptotic"] },
      { entityId: 413, label: "MCL-1:WT", similarity: 0.84 },
      { entityId: 414, label: "MCL-1:A-1210477 complex", similarity: 0.79 },
    ],
    relationalMatches: [412, 414],
    propertySignatureMatches: [412, 413, 414],
    reviewedBy: "extractor-v3",
    reviewAction: "accepted",
    paper: "bioRxiv 2026.04.9081",
  },
  {
    id: "dis-2",
    project: "mcl1-literature-2024-2026",
    timestamp: "2026-04-19T15:47Z",
    submittedLabel: "A-1210477",
    submittedProperty: "Kd",
    submittedMethod: "SPR",
    submittedValue: "0.82 nM",
    verdict: "strong_match",
    resolvedEntityId: 501,
    resolvedLabel: "A-1210477",
    labelCandidates: [
      { entityId: 501, label: "A-1210477", similarity: 0.99, tags: ["small-molecule", "MCL-1 inhibitor"] },
      { entityId: 502, label: "A-1331852", similarity: 0.72, tags: ["small-molecule", "MCL-1 inhibitor"] },
    ],
    relationalMatches: [501],
    propertySignatureMatches: [501, 502],
    reviewedBy: "extractor-v3",
    reviewAction: "accepted",
    paper: "bioRxiv 2026.04.9081",
  },
  {
    id: "dis-3",
    project: "mcl1-literature-2024-2026",
    timestamp: "2026-04-19T14:22Z",
    submittedLabel: "microsomal stability index",
    submittedProperty: "stability",
    submittedMethod: "HLM assay",
    submittedValue: "t½ = 42 min",
    verdict: "ambiguous",
    labelCandidates: [
      { entityId: 603, label: "hepatic clearance", similarity: 0.68, tags: ["ADME"] },
      { entityId: 604, label: "microsomal stability", similarity: 0.65, tags: ["ADME", "in-vitro"] },
    ],
    relationalMatches: [],
    propertySignatureMatches: [603, 604],
    reviewAction: "pending",
    paper: "arXiv 2026.04.9823",
  },
  {
    id: "dis-4",
    project: "mcl1-literature-2024-2026",
    timestamp: "2026-04-19T13:10Z",
    submittedLabel: "Tm shift (DSF)",
    submittedProperty: "thermal_stability",
    submittedMethod: "DSF",
    submittedValue: "+8.2°C",
    verdict: "new_entity",
    labelCandidates: [
      { entityId: 700, label: "melting temperature", similarity: 0.58, tags: ["biophysical"] },
    ],
    relationalMatches: [],
    propertySignatureMatches: [],
    reviewedBy: "klas",
    reviewAction: "accepted",
    paper: "bioRxiv 2026.04.9081",
  },
  {
    id: "dis-5",
    project: "mcl1-literature-2024-2026",
    timestamp: "2026-04-18T11:30Z",
    submittedLabel: "selectivity ratio MCL-1/BCL-2",
    submittedProperty: "selectivity",
    submittedMethod: "derived",
    submittedValue: "340×",
    verdict: "weak_match",
    resolvedEntityId: 412,
    resolvedLabel: "MCL-1",
    labelCandidates: [
      { entityId: 412, label: "MCL-1", similarity: 0.61, tags: ["protein"] },
      { entityId: 450, label: "BCL-2", similarity: 0.55, tags: ["protein", "anti-apoptotic"] },
    ],
    relationalMatches: [412],
    propertySignatureMatches: [],
    reviewedBy: "extractor-v3",
    reviewAction: "accepted",
    paper: "J.Med.Chem 2026.03.0932",
  },
];

export function getProjectDisambiguations(projectId: string): DisambiguationEntry[] {
  return disambiguationEntries.filter((d) => d.project === projectId);
}

// --- Extracted couplings mock data ---

export interface ExtractedCoupling {
  id: string;
  project: string;
  paper: string;
  entityA: string;
  entityAId: number;
  entityB: string;
  entityBId: number;
  property: string;
  value: string;
  method: string;
  sigma?: string;
  groundingConfidence: number;
  status: "merged" | "conflict" | "pending";
}

export const extractedCouplings: ExtractedCoupling[] = [
  { id: "ec-1", project: "mcl1-literature-2024-2026", paper: "bioRxiv 2026.04.9081", entityA: "MCL-1", entityAId: 412, entityB: "A-1210477", entityBId: 501, property: "Kd", value: "0.82 nM", method: "SPR", sigma: "±0.05 nM", groundingConfidence: 0.97, status: "merged" },
  { id: "ec-2", project: "mcl1-literature-2024-2026", paper: "bioRxiv 2026.04.9081", entityA: "MCL-1", entityAId: 412, entityB: "S63845", entityBId: 503, property: "Kd", value: "0.19 nM", method: "SPR", sigma: "±0.02 nM", groundingConfidence: 0.95, status: "merged" },
  { id: "ec-3", project: "mcl1-literature-2024-2026", paper: "bioRxiv 2026.04.9081", entityA: "MCL-1", entityAId: 412, entityB: "venetoclax", entityBId: 504, property: "Kd", value: "180 nM", method: "SPR", groundingConfidence: 0.93, status: "merged" },
  { id: "ec-4", project: "mcl1-literature-2024-2026", paper: "bioRxiv 2026.04.9081", entityA: "MCL-1", entityAId: 412, entityB: "A-1210477", entityBId: 501, property: "ΔH", value: "-12.3 kcal/mol", method: "ITC", groundingConfidence: 0.91, status: "merged" },
  { id: "ec-5", project: "mcl1-literature-2024-2026", paper: "bioRxiv 2026.04.9081", entityA: "MCL-1", entityAId: 412, entityB: "A-1210477", entityBId: 501, property: "Tm shift", value: "+8.2°C", method: "DSF", groundingConfidence: 0.58, status: "pending" },
  { id: "ec-6", project: "mcl1-literature-2024-2026", paper: "bioRxiv 2026.03.4231", entityA: "MCL-1", entityAId: 412, entityB: "A-1210477", entityBId: 501, property: "Kd", value: "1.7 nM", method: "SPR", sigma: "±0.3 nM", groundingConfidence: 0.94, status: "conflict" },
];

export function getProjectCouplings(projectId: string): ExtractedCoupling[] {
  return extractedCouplings.filter((c) => c.project === projectId);
}

// --- Expert panel mock data ---

export interface Expert {
  id: string;
  name: string;
  domains: string[];
  affiliation: string;
  instruments: string[];
  depends: string[];
  availability: "async" | "scheduled" | "on-call";
  response_time_days: number;
  cost_per_consultation_usd: number;
  trust_weight: number;
  cluster_id: string;
  has_dashboard: boolean;
  active_consultations: number;
}

export const experts: Expert[] = [
  {
    id: "expert-cosmology-001",
    name: "Dr. Maria Santos",
    domains: ["cosmology", "dark-energy", "CMB"],
    affiliation: "Instituto de Astrofísica de Canarias",
    instruments: ["theoretical-plausibility", "experiment-design-review", "literature-conflict-check"],
    depends: ["CMB analysis (Planck collaboration)", "w0wa-CDM model expertise"],
    availability: "async",
    response_time_days: 3,
    cost_per_consultation_usd: 0,
    trust_weight: 1.0,
    cluster_id: "european-cosmology",
    has_dashboard: true,
    active_consultations: 2,
  },
  {
    id: "expert-structbio-001",
    name: "Dr. James Chen",
    domains: ["structural-biology", "protein-folding", "alphafold", "binding-sites"],
    affiliation: "MRC Laboratory of Molecular Biology",
    instruments: ["structural-plausibility", "experiment-design-review", "measurement-artifact-check"],
    depends: ["X-ray crystallography (20 years)", "AlphaFold validation studies (3 papers)"],
    availability: "scheduled",
    response_time_days: 7,
    cost_per_consultation_usd: 500,
    trust_weight: 1.0,
    cluster_id: "uk-structural-biology",
    has_dashboard: false,
    active_consultations: 0,
  },
  {
    id: "expert-patent-001",
    name: "Patent counsel (external)",
    domains: ["patent-law", "prior-art", "claim-drafting"],
    affiliation: "External counsel",
    instruments: ["patentability-assessment", "prior-art-search", "freedom-to-operate"],
    depends: ["Swedish patent law", "EP/PCT filing experience"],
    availability: "async",
    response_time_days: 5,
    cost_per_consultation_usd: 2000,
    trust_weight: 1.0,
    cluster_id: "swedish-ip-law",
    has_dashboard: false,
    active_consultations: 1,
  },
  {
    id: "expert-pharma-001",
    name: "Dr. Priya Sharma",
    domains: ["pharmacology", "MCL-1", "BH3-mimetics", "binding-affinity"],
    affiliation: "Karolinska Institutet",
    instruments: ["theoretical-plausibility", "measurement-artifact-check", "clinical-relevance-check"],
    depends: ["MCL-1 biology (15 papers)", "SPR/ITC methodology"],
    availability: "async",
    response_time_days: 4,
    cost_per_consultation_usd: 0,
    trust_weight: 1.0,
    cluster_id: "nordic-pharmacology",
    has_dashboard: true,
    active_consultations: 0,
  },
];

// --- Wet lab mock data ---

export type WetlabStatus = "requested" | "in-progress" | "results-received" | "integrated" | "cancelled";

export interface WetlabRequest {
  id: string;
  project: string;
  partner: string;
  protocol: string;
  entity: string;
  property: string;
  method: string;
  status: WetlabStatus;
  requestedAt: string;
  estimatedCompletion?: string;
  cost?: number;
  result?: string;
}

export const wetlabRequests: WetlabRequest[] = [
  {
    id: "wl-1",
    project: "alphafold-binding-site-v1",
    partner: "Syngene",
    protocol: "SPR binding affinity",
    entity: "MCL-1",
    property: "Kd",
    method: "SPR (Biacore T200)",
    status: "in-progress",
    requestedAt: "2026-04-15",
    estimatedCompletion: "2026-05-01",
    cost: 2400,
  },
  {
    id: "wl-2",
    project: "alphafold-binding-site-v1",
    partner: "Emerald Cloud Lab",
    protocol: "MD simulation validation",
    entity: "AlphaFold predicted pocket",
    property: "RMSD",
    method: "X-ray crystallography",
    status: "requested",
    requestedAt: "2026-04-19",
    estimatedCompletion: "2026-05-15",
    cost: 8500,
  },
  {
    id: "wl-3",
    project: "h0-tension",
    partner: "NBIS/SciLifeLab",
    protocol: "TRGB distance calibration",
    entity: "H₀",
    property: "distance_modulus",
    method: "HST photometry",
    status: "results-received",
    requestedAt: "2026-03-20",
    result: "μ = 31.02 ± 0.05 mag",
    cost: 0,
  },
];

// --- Failure graph mock data ---

export interface FailureEntry {
  id: string;
  project: string;
  hypothesis: string;
  experiment: string;
  outcome: string;
  reason: string;
  timestamp: string;
  cost_usd: number;
  prevented_reruns: number;
}

export const failureGraph: FailureEntry[] = [
  { id: "fg-1", project: "alphafold-binding-site-v1", hypothesis: "H-pocket", experiment: "Rigid docking (AutoDock Vina) against AF2 predicted pocket", outcome: "failed", reason: "Correlation with experimental Kd: ρ=0.21 — no better than random. Rigid pocket misses loop flexibility at residues 142-156.", timestamp: "2026-04-17T10:00Z", cost_usd: 8.40, prevented_reruns: 2 },
  { id: "fg-2", project: "alphafold-binding-site-v1", hypothesis: "H-MSA", experiment: "Co-evolution contact prediction (MSA depth=2048) for pocket residues", outcome: "failed", reason: "MSA-derived contacts match crystal structure at 71% recall, but the 29% miss includes all flexible loop residues. The missing contacts are exactly where the crack is.", timestamp: "2026-04-17T14:30Z", cost_usd: 3.20, prevented_reruns: 1 },
  { id: "fg-3", project: "alphafold-binding-site-v1", hypothesis: "H-pocket", experiment: "Ensemble docking with NMA-generated conformers", outcome: "failed", reason: "NMA modes too coarse — largest mode captures domain motion, not loop rearrangement. ρ improved to 0.34 but still below tension threshold (0.5).", timestamp: "2026-04-18T09:15Z", cost_usd: 12.00, prevented_reruns: 0 },
  { id: "fg-4", project: "h0-tension", hypothesis: "TRGB-cal", experiment: "Reanalysis of SH0ES Cepheid photometry with updated P-L relation", outcome: "failed", reason: "Updated P-L relation shifts H₀ by only 0.3 km/s/Mpc — insufficient to resolve the 5.8σ tension. The systematic is not in the P-L calibration.", timestamp: "2026-04-16T16:00Z", cost_usd: 5.80, prevented_reruns: 3 },
  { id: "fg-5", project: "h0-tension", hypothesis: "EDE-v2", experiment: "EDE fit to Planck+BAO+SH0ES jointly", outcome: "partial", reason: "Joint fit converges at H₀=71.2 ± 1.1 — better than ΛCDM but still 1.8σ from SH0ES alone. EDE helps but doesn't fully resolve.", timestamp: "2026-04-19T11:00Z", cost_usd: 4.10, prevented_reruns: 0 },
];

export function getProjectFailures(projectId: string): FailureEntry[] {
  return failureGraph.filter((f) => f.project === projectId);
}

// --- Extraction aggregate mock data ---

export interface GroundingBreakdown {
  label: string;
  pct: number;
}

export const groundingQuality: GroundingBreakdown[] = [
  { label: "Grounded to existing", pct: 91.2 },
  { label: "New entity proposed", pct: 4.8 },
  { label: "Structural absence", pct: 1.7 },
  { label: "Ambiguous (awaiting rev.)", pct: 2.3 },
];

export interface EntityActivity {
  entity: string;
  newCouplings: number;
  conflicts: number;
}

export const topEntities: EntityActivity[] = [
  { entity: "AlphaFold", newCouplings: 47, conflicts: 0 },
  { entity: "MCL-1", newCouplings: 23, conflicts: 3 },
  { entity: "TMPRSS2", newCouplings: 18, conflicts: 0 },
  { entity: "H₀", newCouplings: 11, conflicts: 1 },
];

// --- Rendering mock data ---

export type RenderingStatus = "pass-1" | "pass-2" | "validating" | "approved" | "revision-requested" | "rejected";

export interface RenderingDraft {
  id: string;
  title: string;
  project: string;
  kind: "satellite" | "audit-report" | "alert";
  status: RenderingStatus;
  wordCount: number;
  validatorIssues: number;
  validatorWarnings: number;
  createdAt: string;
  lastUpdated: string;
}

export const renderingDrafts: RenderingDraft[] = [
  {
    id: "draft-1",
    title: "AlphaFold binding-site crack review",
    project: "alphafold-binding-site-v1",
    kind: "satellite",
    status: "approved",
    wordCount: 2400,
    validatorIssues: 0,
    validatorWarnings: 0,
    createdAt: "2026-04-17",
    lastUpdated: "2026-04-19T10:23Z",
  },
  {
    id: "draft-2",
    title: "H₀ tension measurement update",
    project: "h0-tension",
    kind: "satellite",
    status: "pass-2",
    wordCount: 1800,
    validatorIssues: 0,
    validatorWarnings: 1,
    createdAt: "2026-04-18",
    lastUpdated: "2026-04-19T14:02Z",
  },
  {
    id: "draft-3",
    title: "MCL-1 extraction batch — weekly summary",
    project: "mcl1-literature-2024-2026",
    kind: "audit-report",
    status: "validating",
    wordCount: 950,
    validatorIssues: 0,
    validatorWarnings: 0,
    createdAt: "2026-04-19",
    lastUpdated: "2026-04-19T15:11Z",
  },
  {
    id: "draft-4",
    title: "Echo-chamber alert: CXR neural vs radiologist",
    project: "echo-surveillance-cxr",
    kind: "alert",
    status: "pass-1",
    wordCount: 420,
    validatorIssues: 0,
    validatorWarnings: 0,
    createdAt: "2026-04-19",
    lastUpdated: "2026-04-19T16:30Z",
  },
  {
    id: "draft-5",
    title: "TMPRSS2 extraction progress report",
    project: "tmprss2-recent-2025-2026",
    kind: "audit-report",
    status: "revision-requested",
    wordCount: 1100,
    validatorIssues: 2,
    validatorWarnings: 1,
    createdAt: "2026-04-16",
    lastUpdated: "2026-04-18T09:45Z",
  },
];

export interface ValidatorEntry {
  draftId: string;
  level: "error" | "warning" | "info";
  rule: string;
  message: string;
  location?: string;
}

export const validatorLog: ValidatorEntry[] = [
  { draftId: "draft-2", level: "warning", rule: "no-new-claims", message: "Sentence may introduce unsupported claim: 'EDE models resolve the tension'", location: "§3 ¶2" },
  { draftId: "draft-5", level: "error", rule: "no-new-claims", message: "Claim 'TMPRSS2 inhibitors show broad-spectrum activity' not grounded in any coupling", location: "§2 ¶1" },
  { draftId: "draft-5", level: "error", rule: "citation-check", message: "Reference [14] not found in universe bibliography", location: "§4 ¶3" },
  { draftId: "draft-5", level: "warning", rule: "staleness", message: "Draft references data older than 7 days — consider refreshing", location: "§1" },
  { draftId: "draft-3", level: "info", rule: "completeness", message: "All extraction statistics verified against batch state", location: "all" },
];

// --- Audit mock data ---

export type AuditEventType = "coupling-added" | "crack-opened" | "crack-resolved" | "delta-computed" | "embargo-set" | "embargo-released" | "project-created" | "project-status-changed" | "hypothesis-proposed" | "match-judged" | "draft-approved" | "entity-created" | "meta-review" | "experiment-failed";

export interface AuditEvent {
  id: string;
  type: AuditEventType;
  timestamp: string;
  actor: string;
  actorAvatar?: string;
  project?: string;
  phase?: string;
  entity?: string;
  summary: string;
  detail?: string;
}

export const auditEvents: AuditEvent[] = [
  { id: "ev-01", type: "match-judged", timestamp: "2026-04-19T16:23Z", actor: "judge-ensemble", project: "alphafold-binding-site-v1", summary: "Match 10: H-flex-dock — 3-agree (Claude, GPT, Gemini)", detail: "Claude: \"H-flex-dock better accounts for binding-site flexibility observed in MD trajectories. The rigid docking hypothesis (H-docking) fails to explain the 2.3Å RMSD shift seen in the Chen et al. ensemble. I rate H-flex-dock as more consistent with the crystallographic evidence.\"\n\nGPT: \"Agree with H-flex-dock. The MD ensemble structures show significant loop rearrangement at the binding interface that rigid docking cannot capture. This is consistent with the Patterson et al. 2025 findings on induced-fit effects.\"\n\nGemini: \"H-flex-dock is the stronger hypothesis. The experimental SAXS data from bioRxiv 2026.02.1847 confirms the conformational ensemble predicted by MD, which rigid docking by definition cannot reproduce.\"\n\nVerdict: 3-agree → H-flex-dock accepted into active tree. Elo: 1102 → 1247." },
  { id: "ev-02", type: "coupling-added", timestamp: "2026-04-19T15:47Z", actor: "extractor-v3", project: "mcl1-literature-2024-2026", entity: "MCL-1", summary: "7 couplings from bioRxiv 2026.04.9081 (Chen et al.)", detail: "Paper: \"Structural basis of MCL-1 inhibition by BH3 mimetics: a comparative SPR and ITC study\"\n\nExtracted couplings:\n1. Kd(MCL-1/A-1210477) = 0.82 nM (SPR, 25°C) — grounded to existing entity\n2. Kd(MCL-1/S63845) = 0.19 nM (SPR, 25°C) — grounded to existing entity\n3. Kd(MCL-1/venetoclax) = 180 nM (SPR, 25°C) — grounded, confirms known weak binding\n4. ΔH(MCL-1/A-1210477) = -12.3 kcal/mol (ITC) — new property for this pair\n5. Tm shift(MCL-1 + A-1210477) = +8.2°C (DSF) — new measurement type\n6. IC50(MCL-1/A-1210477, cell viability) = 42 nM (MTS assay, H929) — grounded\n7. Selectivity ratio MCL-1/BCL-2 = 340× (A-1210477) — derived coupling\n\nGrounding: 6/7 grounded to existing entities (85.7%). 1 new property type proposed (Tm shift via DSF)." },
  { id: "ev-03", type: "draft-approved", timestamp: "2026-04-19T14:02Z", actor: "klas", project: "alphafold-binding-site-v1", summary: "Satellite draft 'AlphaFold binding-site crack review' approved", detail: "Reviewed 2,400-word satellite draft covering the AlphaFold binding-site crack. Validator passed with 0 issues. Content accurately summarises the hypothesis tree state, includes the MD convergence delta, and correctly attributes all claims to existing couplings. Approved for publication." },
  { id: "ev-04", type: "delta-computed", timestamp: "2026-04-19T13:45Z", actor: "factory", project: "alphafold-binding-site-v1", summary: "Delta: 3 MD pipelines converged; ρ=0.64", detail: "Convergence delta computed across 3 independent MD simulation pipelines:\n\n• Pipeline A (OpenMM, 500ns): binding-site RMSD = 1.8Å, contact map correlation ρ=0.71\n• Pipeline B (GROMACS, 300ns): binding-site RMSD = 2.1Å, contact map correlation ρ=0.58\n• Pipeline C (AMBER, 400ns): binding-site RMSD = 1.9Å, contact map correlation ρ=0.63\n\nCross-pipeline contact map correlation: ρ=0.64 (tension threshold: 0.5, solid threshold: 0.8)\nStatus: tension → the three pipelines agree on the general binding mode but disagree on loop L3 conformation.\n\nThis delta moves the crack from σ=4.2 to σ=4.0. The remaining tension is localised to residues 142-156 (the flexible loop)." },
  { id: "ev-05", type: "hypothesis-proposed", timestamp: "2026-04-19T12:30Z", actor: "proposer-v2", project: "alphafold-binding-site-v1", summary: "H-flex-dock proposed: flexible docking with MD ensemble structures", detail: "Proposer reasoning:\n\nThe current hypothesis tree has H-pocket (rigid predicted pocket) and H-MSA (MSA-based pocket from co-evolution). Both assume a static binding site. However, the MD convergence delta (ev-04) shows significant loop flexibility at residues 142-156.\n\nI propose H-flex-dock: use the MD ensemble structures (conformational clusters from all 3 pipelines) as receptor inputs for flexible docking. This should capture the induced-fit effect that H-pocket and H-MSA miss.\n\nPredicted outcome: if H-flex-dock is correct, re-docking known ligands against the ensemble should improve the correlation with experimental Kd values from ρ=0.41 (H-pocket) to ρ>0.7.\n\nExperiment design: run AutoDock-GPU against 10 representative cluster centroids from the MD ensemble. Compare docking scores with SPR Kd values for 8 ligands with known affinity.\n\nEstimated cost: $12 (compute) + $8 (judge evaluation) = $20." },
  { id: "ev-06", type: "crack-opened", timestamp: "2026-04-19T11:00Z", actor: "factory", entity: "H₀", summary: "New crack: SH0ES systematic uncertainty (σ=3.1)", detail: "Crack detection triggered by measurer-correlation analysis. The SH0ES team's Cepheid distance ladder measurements show systematic correlation with metallicity that other teams (TRGB, JAGB) do not exhibit.\n\nσ-tension: 3.1 between SH0ES value (H₀=73.04±1.04) and the mean of TRGB+JAGB (H₀=69.8±1.7).\n\nThis is distinct from the broader Hubble tension (σ=5.8 between local and CMB). This crack specifically asks: is the SH0ES systematic uncertainty underestimated?" },
  { id: "ev-07", type: "embargo-set", timestamp: "2026-04-19T10:15Z", actor: "klas", project: "alphafold-binding-site-v1", summary: "Embargo set: crack AB-2026-003, expires 2026-04-25" },
  { id: "ev-08", type: "project-created", timestamp: "2026-04-18T09:00Z", actor: "klas", project: "mcl1-literature-2024-2026", summary: "Extraction batch created: MCL-1 binding-affinity literature, 2024–2026", detail: "Scope: MCL-1 binding-affinity literature from 2024-01-01 to 2026-04-19.\nKeywords: MCL-1, BH3 mimetic, anti-apoptotic\nVenues: bioRxiv, Nature, J. Med. Chem., Cell, Sci. Adv.\nTarget: 500 papers, budget $200.\n\nRationale: the MCL-1 SPR artifact crack needs a comprehensive evidence base. Current universe has only 34 MCL-1 couplings from manual entry. This batch will systematically ingest the literature to build the full measurement landscape." },
  { id: "ev-09", type: "entity-created", timestamp: "2026-04-17T14:30Z", actor: "extractor-v3", entity: "A-1210477", summary: "New entity proposed via grounding: A-1210477 (MCL-1 inhibitor)", detail: "Grounding search found no exact match for 'A-1210477' in the universe vocabulary. Nearest matches:\n• A-1331852 (similarity: 0.72) — different MCL-1 inhibitor\n• AMG-176 (similarity: 0.58) — different scaffold\n\nProposal: create new entity 'A-1210477' with class 'small-molecule', domain 'pharmacology'.\nSource paper: J. Med. Chem. 2015, 58, 2180 (Leverson et al.)\nMolecular weight: 509.6, SMILES: provided." },
  { id: "ev-10", type: "project-status-changed", timestamp: "2026-04-15T16:00Z", actor: "klas", project: "cxr-radiologist-echo", summary: "Status changed: active → paused (awaiting wet-lab)", detail: "Pausing the CXR radiologist echo-chamber investigation until wet-lab partner confirms availability for the prospective reading study. Current state: 2 hypotheses proposed but 0 in active tree — need ground-truth annotations from a second radiologist panel before tournament can proceed.\n\nNext step: follow up with Syngene/Aragen on CRO availability." },
  { id: "ev-11", type: "coupling-added", timestamp: "2026-04-15T11:22Z", actor: "extractor-v3", project: "tmprss2-recent-2025-2026", entity: "TMPRSS2", summary: "12 couplings from PNAS 2026.03.7821 (Wang et al.)" },
  { id: "ev-12", type: "embargo-released", timestamp: "2026-04-13T00:00Z", actor: "system", summary: "Embargo released: crack AB-2026-001 now public in plyknot.org" },
  { id: "ev-13", type: "meta-review", timestamp: "2026-04-19T17:00Z", actor: "supervisor", project: "alphafold-binding-site-v1", summary: "Round 1 meta-review compiled", detail: "## Round 1 meta-review\n\n**Hypotheses proposed:** 1 (H-flex-dock)\n**Matches judged:** 3 (2 unanimous, 1 majority)\n**Experiments planned:** 1 (AutoDock-GPU ensemble)\n\n**Key findings:**\n- H-pocket (rigid docking) failed: ρ=0.21 with experimental Kd\n- H-MSA (co-evolution) failed: 29% contact miss on flexible loop\n- H-flex-dock proposed as synthesis: MD ensemble + flexible docking\n- Judge ensemble agreed 3-0 that H-flex-dock > H-pocket\n\n**Remaining tension:** Loop L3 (residues 142-156) conformation disagrees across 3 MD pipelines. Cross-pipeline ρ=0.64.\n\n**Next round priorities:**\n1. Execute H-flex-dock experiment (AutoDock-GPU × 10 cluster centroids)\n2. If ρ>0.7 → H-flex-dock promotes to active tree\n3. If ρ<0.5 → need enhanced sampling (metadynamics)\n\n**Budget:** $21.60 spent of $800 (2.7%). On track." },
  { id: "ev-14", type: "experiment-failed", timestamp: "2026-04-18T09:15Z", actor: "executor", project: "alphafold-binding-site-v1", summary: "Experiment failed: NMA ensemble docking for H-pocket", detail: "NMA modes too coarse — largest mode captures domain motion, not loop rearrangement. ρ improved to 0.34 but still below tension threshold (0.5). Entry added to failure graph." },
];

const actorAvatars: Record<string, string> = {
  "klas": "KE",
  "judge-ensemble": "JE",
  "factory": "FA",
  "proposer-v2": "P2",
  "extractor-v3": "E3",
  "system": "SY",
};

const phaseByEvent: Record<string, string> = {
  "ev-01": "Tournament",
  "ev-03": "Rendering",
  "ev-04": "Tournament",
  "ev-05": "Proposal",
  "ev-07": "Governance",
  "ev-08": "Setup",
  "ev-10": "Governance",
  "ev-13": "Meta-review",
  "ev-14": "Experiment",
};

export function getProjectActivity(projectId: string): AuditEvent[] {
  return auditEvents
    .filter((e) => e.project === projectId)
    .map((e) => ({
      ...e,
      actorAvatar: actorAvatars[e.actor] ?? e.actor.slice(0, 2).toUpperCase(),
      phase: e.phase ?? phaseByEvent[e.id],
    }));
}
