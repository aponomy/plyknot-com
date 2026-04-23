export type DataSource = "plyknot.org" | "plyknot.com";

const isDev = import.meta.env.DEV;

const BASE_URLS: Record<DataSource, string> = {
  "plyknot.org": "https://hub.plyknot.org/v1",
  "plyknot.com": isDev ? "http://localhost:8791/v1" : "https://hub.plyknot.com/v1",
};

export function hubUrl(source: DataSource, path: string): string {
  return `${BASE_URLS[source]}${path}`;
}

export interface HubStats {
  chainCount: number;
  couplingCount: number;
  entityCount: number;
  crackCount: number;
}

export interface HeatmapCell {
  inferenceLevel: string;
  complexityLevel: number;
  total: number;
  cracked: number;
  status: "solid" | "tension" | "divergent" | "single" | "empty";
}

export interface HeatmapResponse {
  cells: HeatmapCell[];
}

export interface ChainSummary {
  name: string;
  entity: string;
  stepCount: number;
  crackCount: number;
}

export interface ChainsResponse {
  chains: ChainSummary[];
}

export interface Crack {
  crack_id: string;
  chain: string;
  level: string;
  claim: string;
  convergence: string;
  sigmaTension: number;
}

export interface CracksResponse {
  cracks: Crack[];
}

async function fetchJson<T>(url: string, source: DataSource): Promise<T> {
  const headers: HeadersInit = {};
  if (source === "plyknot.com") {
    const token = localStorage.getItem("plyknot-hub-token");
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Hub API error: ${res.status} from ${url}`);
  return res.json() as Promise<T>;
}

export function fetchStats(source: DataSource) {
  return fetchJson<HubStats>(hubUrl(source, "/stats"), source);
}

export function fetchHeatmap(source: DataSource) {
  return fetchJson<HeatmapResponse>(hubUrl(source, "/heatmap"), source);
}

export function fetchChains(source: DataSource) {
  return fetchJson<ChainsResponse>(hubUrl(source, "/chains"), source);
}

export function fetchCracks(source: DataSource) {
  return fetchJson<CracksResponse>(hubUrl(source, "/cracks"), source);
}

export interface Coupling {
  entityA: string;
  entityB: string;
  property: string;
  value: string;
  method: string;
  sigma: number;
  source: string;
}

export interface CouplingsResponse {
  couplings: Coupling[];
  total: number;
}

export function fetchCouplings(source: DataSource) {
  return fetchJson<CouplingsResponse>(hubUrl(source, "/couplings"), source);
}

// --- Supervisor / Factory ---

export interface SupervisorTask {
  id: string;
  round: number;
  type: string;
  agent_role: string;
  status: "queued" | "running" | "completed" | "failed" | "paused";
  cost_actual_usd: number;
  created_at: string;
  completed_at?: string;
}

export interface SupervisorRound {
  round: number;
  tasks_completed: number;
  tasks_failed: number;
  cost_usd: number;
  hypotheses_proposed: number;
  matches_judged: number;
  experiments_planned: number;
  meta_review?: string;
}

export interface SupervisorRun {
  id: string;
  project_id: string;
  crack_id: string;
  status: "running" | "completed" | "paused" | "failed";
  mode: "cowork" | "cli" | "mcp";
  current_round: number;
  total_cost_usd: number;
  budget_usd: number;
  started_at: string;
  updated_at: string;
  rounds: SupervisorRound[];
  tasks: SupervisorTask[];
}

export interface SupervisorRunsResponse {
  runs: SupervisorRun[];
}

export interface QueueStats {
  active_runs: number;
  queue: Record<string, Record<string, number>>;
}

export function fetchSupervisorRuns() {
  return fetchJson<SupervisorRunsResponse>(hubUrl("plyknot.com", "/factory/supervisor/runs"), "plyknot.com");
}

export function fetchQueueStats() {
  return fetchJson<QueueStats>(hubUrl("plyknot.com", "/factory/supervisor/queue"), "plyknot.com");
}

// --- Factory data (projects, hypotheses, deltas, stats) ---

export interface FactoryStats {
  core: { chainCount: number; couplingCount: number; entityCount: number; crackCount: number };
  factory: {
    hypothesisCount: number;
    activeHypotheses: number;
    deltaCount: number;
    experimentCount: number;
    tournamentMatches: number;
    embargoedEntries: number;
    failureGraphEntries: number;
  };
}

export interface FactoryProject {
  id: string;
  name: string;
  description: string;
  kind: string;
  crack_ids: string[];
  entity_scope: string[];
  status: string;
  budget_usd: number;
  spent_usd: number;
  owner_id: string;
  members: { user_id: string; role: string }[];
  scope: Record<string, unknown> | null;
  schedule: string | null;
  hypotheses?: unknown[];
  deltas?: unknown[];
  experiments?: unknown[];
}

export function fetchFactoryStats() {
  return fetchJson<FactoryStats>(hubUrl("plyknot.com", "/factory/stats"), "plyknot.com");
}

export function fetchFactoryProjects() {
  return fetchJson<{ projects: FactoryProject[] }>(hubUrl("plyknot.com", "/factory/projects"), "plyknot.com");
}

export function fetchFactoryProject(id: string) {
  return fetchJson<FactoryProject>(hubUrl("plyknot.com", `/factory/projects/${id}`), "plyknot.com");
}

export function fetchFactoryHypotheses(crackId?: string) {
  const params = crackId ? `?crack_id=${encodeURIComponent(crackId)}` : "";
  return fetchJson<{ hypotheses: unknown[] }>(hubUrl("plyknot.com", `/factory/hypotheses${params}`), "plyknot.com");
}

export function fetchFactoryDeltas(crackId?: string) {
  const params = crackId ? `?crack_id=${encodeURIComponent(crackId)}` : "";
  return fetchJson<{ deltas: unknown[] }>(hubUrl("plyknot.com", `/factory/deltas${params}`), "plyknot.com");
}

// --- Attention items ---

export type AttentionType = "wet-lab-request" | "human-input" | "review" | "budget-exceeded" | "judge-divergence" | "approval" | "expert-consultation";
export type AttentionPriority = "critical" | "high" | "medium" | "low";
export type AttentionStatus = "pending" | "acknowledged" | "in-progress" | "resolved" | "expired";

export interface AttentionItem {
  id: string;
  type: AttentionType;
  priority: AttentionPriority;
  status: AttentionStatus;
  project_id?: string;
  run_id?: string;
  blocking_task_id?: string;
  hypothesis_id?: string;
  crack_id?: string;
  title: string;
  description: string;
  requested_action: string;
  assay_spec?: {
    assay_type: string;
    targets: string[];
    partner_ids: string[];
    estimated_cost_usd: number;
    estimated_turnaround_days: number;
  };
  resolved_by?: string;
  resolved_at?: string;
  response?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  expires_at?: string;
}

export interface AttentionStats {
  pending: number;
  in_progress: number;
  resolved_today: number;
}

export function fetchAttentionItems(params?: { status?: string; project_id?: string; type?: string }) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.project_id) qs.set("project_id", params.project_id);
  if (params?.type) qs.set("type", params.type);
  const query = qs.toString() ? `?${qs}` : "";
  return fetchJson<{ items: AttentionItem[] }>(hubUrl("plyknot.com", `/factory/attention${query}`), "plyknot.com");
}

export function fetchAttentionStats() {
  return fetchJson<AttentionStats>(hubUrl("plyknot.com", "/factory/attention/stats"), "plyknot.com");
}

export async function resolveAttentionItem(id: string, response: Record<string, unknown>): Promise<void> {
  const token = localStorage.getItem("plyknot-hub-token");
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  await fetch(hubUrl("plyknot.com", `/factory/attention/${id}/resolve`), {
    method: "POST",
    headers,
    body: JSON.stringify({ response }),
  });
}

export async function acknowledgeAttentionItem(id: string): Promise<void> {
  const token = localStorage.getItem("plyknot-hub-token");
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  await fetch(hubUrl("plyknot.com", `/factory/attention/${id}`), {
    method: "PATCH",
    headers,
    body: JSON.stringify({ status: "acknowledged" }),
  });
}

// --- Findings ---

export type FindingType = "crack-resolution" | "opening-discovery" | "echo-chamber-break" | "measurement-artifact" | "methodology-improvement";
export type FindingStatus = "draft" | "expert-reviewed" | "independently-confirmed" | "confirmed" | "retracted";

export interface ExpertReview {
  expert_id: string;
  opinion: string;
  confidence: number;
  rationale?: string;
}

export interface Finding {
  id: string;
  title: string;
  summary: string;
  finding_type: FindingType;
  status: FindingStatus;
  project_id?: string;
  crack_id?: string;
  delta_ids?: string[];
  hypothesis_ids?: string[];
  sigma_resolved?: number;
  sigma_after?: number;
  independent_clusters?: number;
  domains?: string[];
  entities?: number[];
  expert_reviews?: ExpertReview[];
  publications?: PublicationSummary[];
  created_at: string;
  updated_at: string;
}

export function fetchFindings(params?: { status?: string; type?: string; project_id?: string }) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.type) qs.set("type", params.type);
  if (params?.project_id) qs.set("project_id", params.project_id);
  const query = qs.toString() ? `?${qs}` : "";
  return fetchJson<{ findings: Finding[] }>(hubUrl("plyknot.com", `/factory/findings${query}`), "plyknot.com");
}

export function fetchFinding(id: string) {
  return fetchJson<Finding>(hubUrl("plyknot.com", `/factory/findings/${id}`), "plyknot.com");
}

// --- Publications ---

export type PublicationTrack = "paper" | "patent" | "customer-report";

export interface PaperData {
  target_venue?: string;
  word_count?: number;
  validator_issues?: number;
  draft_id?: string;
  submitted_at?: string;
  doi?: string;
  arxiv_id?: string;
}

export interface PatentData {
  counsel_id?: string;
  filing_jurisdiction?: string;
  provisional_filing_date?: string;
  patent_number?: string;
  embargo_until?: string;
  claims?: string[];
}

export interface ReportData {
  customer_id?: string;
  scope?: string;
  delivered_at?: string;
}

export interface PublicationSummary {
  id: string;
  track: PublicationTrack;
  title: string;
  status: string;
}

export interface Publication {
  id: string;
  track: PublicationTrack;
  title: string;
  status: string;
  finding_ids: string[];
  project_ids?: string[];
  paper_data?: PaperData;
  patent_data?: PatentData;
  report_data?: ReportData;
  created_at: string;
  updated_at: string;
}

export function fetchPublications(params?: { track?: string; status?: string; finding_id?: string }) {
  const qs = new URLSearchParams();
  if (params?.track) qs.set("track", params.track);
  if (params?.status) qs.set("status", params.status);
  if (params?.finding_id) qs.set("finding_id", params.finding_id);
  const query = qs.toString() ? `?${qs}` : "";
  return fetchJson<{ publications: Publication[] }>(hubUrl("plyknot.com", `/factory/publications${query}`), "plyknot.com");
}

// --- Expert rewards ---

export type RewardType = "consultation-fee" | "discovery-kickback" | "patent-kickback" | "bonus" | "retainer";

export interface ExpertReward {
  id: string;
  expert_id: string;
  type: RewardType;
  status: "pending" | "paid";
  amount_usd: number;
  project_id?: string;
  description: string;
  consultation_id?: string;
  paid_at?: string;
  created_at: string;
}

export function fetchExpertRewards(expertId?: string) {
  const qs = expertId ? `?expert_id=${encodeURIComponent(expertId)}` : "";
  return fetchJson<{ rewards: ExpertReward[]; total_pending_usd: number; total_paid_usd: number }>(
    hubUrl("plyknot.com", `/factory/experts/rewards${qs}`), "plyknot.com",
  );
}

// --- Tracker ---

export interface TrackerCategory {
  slug: string;
  label: string;
  sort_order: number;
  theme_count: number;
  done_count: number;
  issue_count: number;
}

export interface TrackerTheme {
  id: string;
  category_slug: string;
  category_label: string;
  title: string;
  sort_order: number;
  done_count: number;
  issue_count: number;
}

export interface TrackerIssue {
  id: string;
  theme_id: string;
  theme_title?: string;
  title: string;
  description: string | null;
  section: string | null;
  priority: "P0" | "P1" | "P2" | "-";
  status: "todo" | "doing" | "done";
  target_date: string | null;
  project_id: string | null;
  sort_order: number;
  created_by: string | null;
  updated_by: string | null;
  comment_count?: number;
  created_at: string;
  updated_at: string;
}

export interface TrackerStats {
  total: number;
  done: number;
  doing: number;
  todo: number;
  theme_count: number;
  by_priority: Array<{ priority: string; count: number }>;
  by_category: Array<{ slug: string; label: string; total: number; done: number }>;
}

export function fetchTrackerCategories() {
  return fetchJson<{ categories: TrackerCategory[] }>(
    hubUrl("plyknot.com", "/factory/tracker/categories"), "plyknot.com",
  );
}

export function fetchTrackerThemes(category?: string) {
  const qs = category ? `?category=${encodeURIComponent(category)}` : "";
  return fetchJson<{ themes: TrackerTheme[] }>(
    hubUrl("plyknot.com", `/factory/tracker/themes${qs}`), "plyknot.com",
  );
}

export function fetchTrackerTheme(id: string) {
  return fetchJson<TrackerTheme & { issues: TrackerIssue[] }>(
    hubUrl("plyknot.com", `/factory/tracker/themes/${encodeURIComponent(id)}`), "plyknot.com",
  );
}

export function fetchTrackerIssues(params?: { theme_id?: string; status?: string; priority?: string; q?: string }) {
  const qs = new URLSearchParams();
  if (params?.theme_id) qs.set("theme_id", params.theme_id);
  if (params?.status) qs.set("status", params.status);
  if (params?.priority) qs.set("priority", params.priority);
  if (params?.q) qs.set("q", params.q);
  const query = qs.toString() ? `?${qs}` : "";
  return fetchJson<{ issues: TrackerIssue[]; total: number }>(
    hubUrl("plyknot.com", `/factory/tracker/issues${query}`), "plyknot.com",
  );
}

export function fetchTrackerStats() {
  return fetchJson<TrackerStats>(
    hubUrl("plyknot.com", "/factory/tracker/stats"), "plyknot.com",
  );
}

async function mutateJson<T>(url: string, method: string, body?: unknown): Promise<T> {
  const token = localStorage.getItem("plyknot-hub-token");
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error(`Hub API error: ${res.status}`);
  return res.json() as Promise<T>;
}

export function createTrackerIssue(data: { theme_id: string; title: string; priority?: string; status?: string; target_date?: string }) {
  return mutateJson<{ id: string }>(hubUrl("plyknot.com", "/factory/tracker/issues"), "POST", data);
}

export function updateTrackerIssue(id: string, data: Partial<Pick<TrackerIssue, "title" | "description" | "section" | "priority" | "status" | "target_date" | "sort_order" | "theme_id">>) {
  return mutateJson<{ id: string; updated: boolean }>(hubUrl("plyknot.com", `/factory/tracker/issues/${encodeURIComponent(id)}`), "PATCH", data);
}

export function deleteTrackerIssue(id: string) {
  return mutateJson<{ id: string; deleted: boolean }>(hubUrl("plyknot.com", `/factory/tracker/issues/${encodeURIComponent(id)}`), "DELETE");
}

export function markTrackerIssueDone(id: string) {
  return mutateJson<{ id: string; status: string }>(hubUrl("plyknot.com", `/factory/tracker/issues/${encodeURIComponent(id)}/done`), "POST");
}

// --- Tracker comments ---

export interface TrackerComment {
  id: string;
  issue_id: string;
  body: string;
  author: string | null;
  created_at: string;
}

export function fetchTrackerComments(issueId: string) {
  return fetchJson<{ comments: TrackerComment[] }>(
    hubUrl("plyknot.com", `/factory/tracker/issues/${encodeURIComponent(issueId)}/comments`), "plyknot.com",
  );
}

export function createTrackerComment(issueId: string, body: string, author?: string) {
  const data: Record<string, string> = { body };
  if (author) data.author = author;
  return mutateJson<TrackerComment>(
    hubUrl("plyknot.com", `/factory/tracker/issues/${encodeURIComponent(issueId)}/comments`), "POST", data,
  );
}
