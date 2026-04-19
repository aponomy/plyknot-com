import * as d1 from '../lib/d1.js';
import { json } from '../lib/response.js';

interface Component {
  mean: number;
  std: number;
  weight: number;
  entryCount: number;
}

interface SpeciationResult {
  entity: string;
  property: string;
  verdict: 'speciated' | 'unified' | 'insufficient_data';
  nComponents: number;
  components: Component[];
  bicScores: Record<string, number>;
  guards: {
    deltaBicPassed: boolean;
    minComponentSizePassed: boolean;
    minSeparationPassed: boolean;
  };
  suggestedAction: 'split_identifier' | 'no_action';
}

export async function handleSpeciation(db: D1Database, url: URL): Promise<Response> {
  const entityParam = url.searchParams.get('entity');
  const property = url.searchParams.get('property');

  if (!entityParam || !property) {
    return json({ error: 'entity and property query parameters are required' }, 400);
  }

  const maxComponents = Number(url.searchParams.get('max_components') ?? 5);
  const minComponentSize = Number(url.searchParams.get('min_component_size') ?? 5);
  const minDeltaBic = Number(url.searchParams.get('min_delta_bic') ?? 10);
  const minSeparation = Number(url.searchParams.get('min_separation') ?? 2.0);

  // Look up entity
  const entityRows = await d1.listEntities(db);
  let entityId: number | undefined;
  const entityNum = Number(entityParam);
  if (!isNaN(entityNum)) {
    entityId = entityNum;
  } else {
    const match = entityRows.find((e) => e.name.toLowerCase() === entityParam.toLowerCase());
    entityId = match?.id;
  }

  if (entityId === undefined) {
    return json({ error: `Entity "${entityParam}" not found` }, 404);
  }

  const entityName = entityRows.find((e) => e.id === entityId)?.name ?? entityParam;

  // Get couplings for this (entity, property)
  const rows = await d1.listCouplings(db, { entity: entityId });
  const values = rows
    .filter((r) => r.property === property && r.entity_b === entityId)
    .map((r) => r.value);

  if (values.length < minComponentSize * 2) {
    return json({
      entity: entityName,
      property,
      verdict: 'insufficient_data',
      nComponents: 0,
      components: [],
      bicScores: {},
      guards: { deltaBicPassed: false, minComponentSizePassed: false, minSeparationPassed: false },
      suggestedAction: 'no_action',
    } satisfies SpeciationResult);
  }

  // Simple GMM via k-means approximation (matches Python's approach)
  const bicScores: Record<string, number> = {};
  let bestK = 1;
  let bestBic = Infinity;
  let bestComponents: Component[] = [];

  for (let k = 1; k <= Math.min(maxComponents, Math.floor(values.length / minComponentSize)); k++) {
    const result = fitGMM(values, k);
    const bic = computeBIC(values, result, k);
    bicScores[String(k)] = Math.round(bic * 10) / 10;
    if (bic < bestBic) {
      bestBic = bic;
      bestK = k;
      bestComponents = result;
    }
  }

  // Guards
  const bic1 = bicScores['1'] ?? 0;
  const deltaBic = bic1 - bestBic;
  const deltaBicPassed = deltaBic >= minDeltaBic;
  const minSizePassed = bestComponents.every((c) => c.entryCount >= minComponentSize);

  // Separation guard
  let separationPassed = true;
  if (bestComponents.length >= 2) {
    const sorted = [...bestComponents].sort((a, b) => a.mean - b.mean);
    for (let i = 1; i < sorted.length; i++) {
      const gap = Math.abs(sorted[i].mean - sorted[i - 1].mean);
      const avgStd = (sorted[i].std + sorted[i - 1].std) / 2;
      if (avgStd > 0 && gap / avgStd < minSeparation) {
        separationPassed = false;
        break;
      }
    }
  }

  const isSpeciated = bestK > 1 && deltaBicPassed && minSizePassed && separationPassed;

  return json({
    entity: entityName,
    property,
    verdict: isSpeciated ? 'speciated' : 'unified',
    nComponents: bestK,
    components: bestComponents,
    bicScores,
    guards: {
      deltaBicPassed,
      minComponentSizePassed: minSizePassed,
      minSeparationPassed: separationPassed,
    },
    suggestedAction: isSpeciated ? 'split_identifier' : 'no_action',
  } satisfies SpeciationResult);
}

// ── Simple GMM (k-means + variance estimation) ─────────────────────────

function fitGMM(values: number[], k: number): Component[] {
  if (k === 1) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
    return [{
      mean: Math.round(mean * 1e6) / 1e6,
      std: Math.round(Math.sqrt(variance) * 1e6) / 1e6,
      weight: 1.0,
      entryCount: values.length,
    }];
  }

  // k-means++ initialization
  const sorted = [...values].sort((a, b) => a - b);
  const centroids: number[] = [];
  for (let i = 0; i < k; i++) {
    centroids.push(sorted[Math.floor((i + 0.5) * sorted.length / k)]);
  }

  // Iterate k-means
  let assignments = new Array(values.length).fill(0);
  for (let iter = 0; iter < 50; iter++) {
    // Assign
    const newAssign = values.map((v) => {
      let best = 0;
      let bestDist = Infinity;
      for (let c = 0; c < k; c++) {
        const d = Math.abs(v - centroids[c]);
        if (d < bestDist) { bestDist = d; best = c; }
      }
      return best;
    });

    // Check convergence
    if (newAssign.every((a, i) => a === assignments[i])) break;
    assignments = newAssign;

    // Update centroids
    for (let c = 0; c < k; c++) {
      const members = values.filter((_, i) => assignments[i] === c);
      if (members.length > 0) {
        centroids[c] = members.reduce((a, b) => a + b, 0) / members.length;
      }
    }
  }

  // Build components
  const components: Component[] = [];
  for (let c = 0; c < k; c++) {
    const members = values.filter((_, i) => assignments[i] === c);
    if (members.length === 0) continue;
    const mean = members.reduce((a, b) => a + b, 0) / members.length;
    const variance = members.reduce((s, v) => s + (v - mean) ** 2, 0) / members.length;
    components.push({
      mean: Math.round(mean * 1e6) / 1e6,
      std: Math.round(Math.sqrt(variance) * 1e6) / 1e6,
      weight: Math.round((members.length / values.length) * 1000) / 1000,
      entryCount: members.length,
    });
  }

  return components.sort((a, b) => a.mean - b.mean);
}

function computeBIC(values: number[], components: Component[], k: number): number {
  const n = values.length;
  const params = k * 3 - 1; // k means + k variances + (k-1) weights

  // Log-likelihood (Gaussian mixture)
  let ll = 0;
  for (const v of values) {
    let p = 0;
    for (const c of components) {
      const std = Math.max(c.std, 1e-10);
      const g = (1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * ((v - c.mean) / std) ** 2);
      p += c.weight * g;
    }
    ll += Math.log(Math.max(p, 1e-300));
  }

  return params * Math.log(n) - 2 * ll;
}
