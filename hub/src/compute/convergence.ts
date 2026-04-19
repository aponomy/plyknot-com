/**
 * Convergence computation at query time.
 *
 * Load-bearing principle: D1 stores FACTS (chains with step convergence).
 * This module computes DERIVED views (heatmap, cracks, per-entity convergence)
 * from those facts. Never stale — always computed from current data.
 */

import type { ChainRow } from '../lib/d1.js';

interface ChainStep {
  claim: string;
  level: string;
  complexityLevel: number;
  convergence: string;
  sigmaTension?: number;
  measurements: unknown[];
  depends: number[];
  challengeCost: string;
}

interface ChainData {
  entity: string;
  steps: ChainStep[];
}

export interface HeatmapCell {
  inferenceLevel: string;
  complexityLevel: number;
  total: number;
  cracked: number;
  status: 'empty' | 'solid' | 'tension' | 'divergent' | 'single';
}

export interface CrackEntry {
  chain: string;
  level: string;
  claim: string;
  convergence: string;
  sigmaTension?: number;
}

const LEVEL_ORDER: Record<string, number> = {
  signal: 1, measurement: 2, pattern: 3, model: 4, hypothesis: 5,
};

export function parseChainData(row: ChainRow): ChainData {
  return JSON.parse(row.data);
}

export function computeHeatmap(rows: ChainRow[]): HeatmapCell[] {
  const cells = new Map<string, HeatmapCell>();

  for (const row of rows) {
    const chain = parseChainData(row);
    for (const step of chain.steps) {
      const cl = step.complexityLevel ?? 0;
      const key = `${step.level}::${cl}`;
      let cell = cells.get(key);
      if (!cell) {
        cell = { inferenceLevel: step.level, complexityLevel: cl, total: 0, cracked: 0, status: 'empty' };
        cells.set(key, cell);
      }
      cell.total++;
      if (step.convergence === 'divergent' || step.convergence === 'tension') {
        cell.cracked++;
      }
    }
  }

  for (const cell of cells.values()) {
    cell.status =
      cell.total === 0 ? 'empty'
      : cell.total === 1 ? 'single'
      : cell.cracked === 0 ? 'solid'
      : cell.cracked * 2 > cell.total ? 'divergent'
      : 'tension';
  }

  return [...cells.values()].sort(
    (a, b) => (LEVEL_ORDER[a.inferenceLevel] ?? 99) - (LEVEL_ORDER[b.inferenceLevel] ?? 99) || a.complexityLevel - b.complexityLevel,
  );
}

export function extractCracks(rows: ChainRow[]): CrackEntry[] {
  const cracks: CrackEntry[] = [];
  for (const row of rows) {
    const chain = parseChainData(row);
    for (const step of chain.steps) {
      if (step.convergence === 'divergent' || step.convergence === 'tension') {
        cracks.push({
          chain: chain.entity,
          level: step.level,
          claim: step.claim,
          convergence: step.convergence,
          sigmaTension: step.sigmaTension,
        });
      }
    }
  }
  return cracks.sort((a, b) => (b.sigmaTension ?? 0) - (a.sigmaTension ?? 0));
}

export function computeEntityConvergence(rows: ChainRow[], entityName: string) {
  const matching = rows.filter((r) => {
    const chain = parseChainData(r);
    return chain.entity.toLowerCase() === entityName.toLowerCase();
  });

  if (matching.length === 0) return null;

  const chain = parseChainData(matching[0]);
  const steps = chain.steps.map((s) => ({
    level: s.level,
    claim: s.claim,
    convergence: s.convergence,
    sigmaTension: s.sigmaTension,
    measurementCount: s.measurements.length,
  }));

  const crackCount = steps.filter((s) => s.convergence === 'divergent' || s.convergence === 'tension').length;
  const weakest = steps.find((s) => s.convergence === 'divergent') ?? steps.find((s) => s.convergence === 'tension') ?? steps[steps.length - 1];

  return {
    entity: chain.entity,
    chainName: matching[0].name,
    steps,
    crackCount,
    weakestLevel: weakest?.level,
    weakestConvergence: weakest?.convergence,
  };
}
