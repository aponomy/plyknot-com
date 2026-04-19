export type DataSource = "plyknot.org" | "plyknot.com";

const BASE_URLS: Record<DataSource, string> = {
  "plyknot.org": "https://hub.plyknot.org/v1",
  "plyknot.com": "https://hub.plyknot.com/v1",
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

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Hub API error: ${res.status}`);
  return res.json() as Promise<T>;
}

export function fetchStats(source: DataSource) {
  return fetchJson<HubStats>(hubUrl(source, "/stats"));
}

export function fetchHeatmap(source: DataSource) {
  return fetchJson<HeatmapResponse>(hubUrl(source, "/heatmap"));
}

export function fetchChains(source: DataSource) {
  return fetchJson<ChainsResponse>(hubUrl(source, "/chains"));
}

export function fetchCracks(source: DataSource) {
  return fetchJson<CracksResponse>(hubUrl(source, "/cracks"));
}
