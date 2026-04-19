import { extractCracks, parseChainData } from '../compute/convergence.js';
import type { ChainRow } from '../lib/d1.js';
import { json } from '../lib/response.js';

interface MarkerSource {
  label: string;
  chain: string;
  type: 'crack' | 'solid';
  seedDeps: number[];
  strength: number;
}

interface MarkerActivation {
  source: string;
  strength: number;
}

interface Collision {
  dependencyId: number;
  dependencyLabel: string;
  collidingSteps: Array<{ chain: string; stepIndex: number; markerStrength: number }>;
  collisionStrength: number;
  crossLevel: boolean;
  type: 'crack-connection' | 'opening';
}

export async function handleMarkerPassing(db: D1Database, url: URL): Promise<Response> {
  const decay = Number(url.searchParams.get('decay') ?? 0.8);
  const maxHops = Number(url.searchParams.get('max_hops') ?? 5);
  const activationThreshold = Number(url.searchParams.get('activation_threshold') ?? 0.01);
  const collisionThreshold = Number(url.searchParams.get('collision_threshold') ?? 0.01);
  const mode = (url.searchParams.get('mode') ?? 'both') as 'cracks' | 'openings' | 'both';
  const includePaths = url.searchParams.get('include_paths') === 'true';

  const { results } = await db.prepare('SELECT * FROM chains').all<ChainRow>();

  // Extract sources from chain steps
  const crackSources: MarkerSource[] = [];
  const solidSources: MarkerSource[] = [];

  for (const row of results) {
    const chain = parseChainData(row);
    for (const step of chain.steps) {
      if (step.depends.length === 0) continue;
      if (step.convergence === 'divergent' || step.convergence === 'tension') {
        crackSources.push({
          label: `${chain.entity}:${step.level}`,
          chain: chain.entity,
          type: 'crack',
          seedDeps: step.depends,
          strength: 1.0,
        });
      } else if (step.convergence === 'converged') {
        solidSources.push({
          label: `${chain.entity}:${step.level}`,
          chain: chain.entity,
          type: 'solid',
          seedDeps: step.depends,
          strength: 1.0,
        });
      }
    }
  }

  // BFS marker propagation
  const depGraph = buildDepGraph(results);
  const activations = new Map<number, MarkerActivation[]>();

  const sources = mode === 'cracks' ? crackSources
    : mode === 'openings' ? solidSources
    : [...crackSources, ...solidSources];

  for (const src of sources) {
    const visited = new Set<number>();
    const queue: Array<{ dep: number; strength: number; hop: number }> = [];
    for (const d of src.seedDeps) {
      queue.push({ dep: d, strength: src.strength, hop: 0 });
    }

    while (queue.length > 0) {
      const { dep, strength, hop } = queue.shift()!;
      if (visited.has(dep) || hop > maxHops || strength < activationThreshold) continue;
      visited.add(dep);

      let acts = activations.get(dep);
      if (!acts) { acts = []; activations.set(dep, acts); }
      acts.push({ source: src.label, strength });

      // Propagate to neighbors
      const neighbors = depGraph.get(dep) ?? [];
      for (const n of neighbors) {
        if (!visited.has(n)) {
          queue.push({ dep: n, strength: strength * decay, hop: hop + 1 });
        }
      }
    }
  }

  // Find collisions
  const crackConnections: Collision[] = [];
  const openings: Collision[] = [];

  // Load dependency labels
  const deps = await db.prepare('SELECT id, labels FROM dependencies').all<{ id: number; labels: string }>();
  const depLabels = new Map<number, string>();
  for (const d of deps.results) {
    const labels = JSON.parse(d.labels) as string[];
    depLabels.set(d.id, labels[0] ?? `dep#${d.id}`);
  }

  for (const [depId, acts] of activations) {
    if (acts.length < 2) continue;

    // Check if sources are from different chains
    const chains = new Set(acts.map((a) => a.source.split(':')[0]));
    if (chains.size < 2) continue;

    const strength = acts.reduce((p, a) => p * a.strength, 1);
    if (strength < collisionThreshold) continue;

    // Determine collision type
    const hasCrack = acts.some((a) => crackSources.some((s) => s.label === a.source));
    const hasSolid = acts.some((a) => solidSources.some((s) => s.label === a.source));

    const collision: Collision = {
      dependencyId: depId,
      dependencyLabel: depLabels.get(depId) ?? `dep#${depId}`,
      collidingSteps: acts.map((a) => ({
        chain: a.source.split(':')[0],
        stepIndex: 0,
        markerStrength: a.strength,
      })),
      collisionStrength: Math.round(strength * 1000) / 1000,
      crossLevel: false,
      type: hasCrack && !hasSolid ? 'crack-connection' : 'opening',
    };

    if (collision.type === 'crack-connection' && mode !== 'openings') {
      crackConnections.push(collision);
    }
    if (collision.type === 'opening' && mode !== 'cracks') {
      openings.push(collision);
    }
  }

  crackConnections.sort((a, b) => b.collisionStrength - a.collisionStrength);
  openings.sort((a, b) => b.collisionStrength - a.collisionStrength);

  return json({
    config: { decay, max_hops: maxHops, activation_threshold: activationThreshold, collision_threshold: collisionThreshold, mode },
    crack_connections: crackConnections,
    openings,
    stats: {
      total_sources: sources.length,
      total_collisions: crackConnections.length + openings.length,
    },
  });
}

function buildDepGraph(rows: ChainRow[]): Map<number, number[]> {
  // Build adjacency list from chain dependencies
  const allDeps = new Set<number>();
  const coOccurrence = new Map<number, Set<number>>();

  for (const row of rows) {
    const chain = parseChainData(row);
    for (const step of chain.steps) {
      for (const d of step.depends) {
        allDeps.add(d);
        let neighbors = coOccurrence.get(d);
        if (!neighbors) { neighbors = new Set(); coOccurrence.set(d, neighbors); }
        // Connect to other deps in same step
        for (const d2 of step.depends) {
          if (d2 !== d) neighbors.add(d2);
        }
      }
    }
  }
  const graph = new Map<number, number[]>();
  for (const [id, neighbors] of coOccurrence) {
    graph.set(id, [...neighbors]);
  }
  return graph;
}
