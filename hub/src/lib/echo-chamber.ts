/**
 * Echo-chamber, measurement-prediction ratio, and speciation computation.
 * Pure functions operating on CouplingRow[].
 */

import type { CouplingRow } from './d1.js';

// ── Thresholds (same as Python analysis.py) ─────────────────────────────

const CONVERGED_REL = 0.01;
const TENSION_REL = 0.05;

function relStatus(spread: number, mean: number): string {
  const rel = mean !== 0 ? spread / Math.abs(mean) : 0;
  return rel < CONVERGED_REL ? 'converged' : rel < TENSION_REL ? 'tension' : 'divergent';
}

// ── Echo-chamber detection ──────────────────────────────────────────────

export interface EchoChamberEntry {
  entityB: number;
  entityName: string;
  property: string;
  predictionConsensus: { mean: number; spread: number; status: string };
  measurementProfile: { count: number; mean: number; spread: number; status: string } | null;
  predictors: string[];
  measurers: string[];
  divergenceSigma: number | null;
  pattern: 'no_measurement_support' | 'measurement_contradicts_consensus';
}

export function computeEchoChambers(
  rows: CouplingRow[],
  entities: Map<number, string>,
  opts: { minPredictions?: number; strict?: boolean } = {},
): EchoChamberEntry[] {
  const minPred = opts.minPredictions ?? 2;
  const strict = opts.strict ?? false;

  // Group by (entity_b, property)
  const groups = new Map<string, CouplingRow[]>();
  for (const r of rows) {
    const key = `${r.entity_b}::${r.property}`;
    let g = groups.get(key);
    if (!g) { g = []; groups.set(key, g); }
    g.push(r);
  }

  const results: EchoChamberEntry[] = [];

  for (const [, entries] of groups) {
    const predictions = entries.filter((e) => e.source === 'prediction');
    const measurements = entries.filter((e) => e.source === 'measurement');

    if (predictions.length < minPred) continue;

    // Prediction consensus
    const pVals = predictions.map((p) => p.value);
    const pMean = pVals.reduce((a, b) => a + b, 0) / pVals.length;
    const pSpread = Math.max(...pVals) - Math.min(...pVals);
    const pStatus = relStatus(pSpread, pMean);

    if (pStatus !== 'converged') continue; // only consensus predictions

    // Measurement profile
    let mProfile: EchoChamberEntry['measurementProfile'] = null;
    let pattern: EchoChamberEntry['pattern'] = 'no_measurement_support';
    let divSigma: number | null = null;

    if (measurements.length > 0) {
      const mVals = measurements.map((m) => m.value);
      const mMean = mVals.reduce((a, b) => a + b, 0) / mVals.length;
      const mSpread = Math.max(...mVals) - Math.min(...mVals);
      const mStatus = relStatus(mSpread, mMean);
      mProfile = { count: measurements.length, mean: mMean, spread: mSpread, status: mStatus };

      // Check if measurements contradict prediction consensus
      const dist = Math.abs(pMean - mMean);
      const relDist = mMean !== 0 ? dist / Math.abs(mMean) : dist;
      const confirmed = relDist < 0.05 || dist < 0.02;

      if (confirmed) continue; // measurements confirm prediction — not an echo chamber

      pattern = 'measurement_contradicts_consensus';

      // Approximate sigma
      const combinedStd = Math.max(pSpread, mSpread, 0.001);
      divSigma = Math.round((dist / combinedStd) * 10) / 10;
    }

    const first = entries[0];
    results.push({
      entityB: first.entity_b,
      entityName: entities.get(first.entity_b) ?? `Entity ${first.entity_b}`,
      property: first.property,
      predictionConsensus: { mean: pMean, spread: pSpread, status: pStatus },
      measurementProfile: mProfile,
      predictors: [...new Set(predictions.map((p) => entities.get(p.entity_a) ?? `Entity ${p.entity_a}`))],
      measurers: [...new Set(measurements.map((m) => entities.get(m.entity_a) ?? `Entity ${m.entity_a}`))],
      divergenceSigma: divSigma,
      pattern,
    });
  }

  // Sort by divergence sigma desc (nulls last)
  results.sort((a, b) => (b.divergenceSigma ?? -1) - (a.divergenceSigma ?? -1));
  return results;
}

// ── Measurement/prediction ratio ────────────────────────────────────────

export interface RatioGroup {
  entityB: number;
  entityName: string;
  property: string;
  measurementCount: number;
  predictionCount: number;
  classification: 'measurement_only' | 'prediction_only' | 'both';
}

export interface RatioSummary {
  totalGroups: number;
  measurementOnly: number;
  predictionOnly: number;
  both: number;
  measurementPredictionRatio: number;
}

export function computeMeasurementPredictionRatio(
  rows: CouplingRow[],
  entities: Map<number, string>,
): { summary: RatioSummary; groups: RatioGroup[]; gaps: RatioGroup[] } {
  const groupMap = new Map<string, { entityB: number; property: string; mCount: number; pCount: number }>();

  for (const r of rows) {
    const key = `${r.entity_b}::${r.property}`;
    let g = groupMap.get(key);
    if (!g) { g = { entityB: r.entity_b, property: r.property, mCount: 0, pCount: 0 }; groupMap.set(key, g); }
    if (r.source === 'prediction') g.pCount++;
    else g.mCount++;
  }

  const groups: RatioGroup[] = [];
  let mOnly = 0, pOnly = 0, both = 0;

  for (const g of groupMap.values()) {
    const classification = g.mCount > 0 && g.pCount > 0 ? 'both'
      : g.mCount > 0 ? 'measurement_only'
      : 'prediction_only';
    if (classification === 'measurement_only') mOnly++;
    else if (classification === 'prediction_only') pOnly++;
    else both++;
    groups.push({
      entityB: g.entityB,
      entityName: entities.get(g.entityB) ?? `Entity ${g.entityB}`,
      property: g.property,
      measurementCount: g.mCount,
      predictionCount: g.pCount,
      classification,
    });
  }

  const totalM = mOnly + both;
  const totalP = pOnly + both;
  const summary: RatioSummary = {
    totalGroups: groups.length,
    measurementOnly: mOnly,
    predictionOnly: pOnly,
    both,
    measurementPredictionRatio: totalP > 0 ? Math.round((totalM / totalP) * 100) / 100 : Infinity,
  };

  const gaps = groups.filter((g) => g.classification === 'prediction_only');

  return { summary, groups, gaps };
}
