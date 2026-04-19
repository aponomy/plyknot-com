export type ProjectKind = "crack-resolution" | "extraction-batch" | "surveillance" | "opening-extension";

export interface Project {
  id: string;
  name: string;
  kind: ProjectKind;
  status: "active" | "paused" | "completed" | "blocked";
  description: string;
  budget_usd: number;
  spent_usd: number;
  created_at: string;
  last_activity: string;
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
    schedule: "daily",
    signals_new: 3,
    watchlist: ["echo-chamber:cxr-spr", "echo-chamber:cxr-pathology"],
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
