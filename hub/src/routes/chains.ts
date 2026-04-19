import * as d1 from '../lib/d1.js';
import { parseChainData } from '../compute/convergence.js';
import { json, notFound } from '../lib/response.js';

export async function handleListChains(db: D1Database): Promise<Response> {
  const rows = await d1.listChains(db);
  return json({
    chains: rows.map((r) => ({
      name: r.name,
      entity: r.entity,
      stepCount: r.step_count,
      crackCount: r.crack_count,
    })),
  });
}

export async function handleGetChain(db: D1Database, name: string): Promise<Response> {
  const row = await d1.getChain(db, name);
  if (!row) return notFound(`chain "${name}" not found`);
  const data = parseChainData(row);
  return json({
    name: row.name,
    entity: data.entity,
    steps: data.steps,
    health: {
      weakestLevel: findWeakest(data.steps),
      crackCount: row.crack_count,
    },
  });
}

function findWeakest(steps: Array<{ convergence: string; level: string }>) {
  const crack = steps.find((s) => s.convergence === 'divergent') ?? steps.find((s) => s.convergence === 'tension');
  return crack?.level ?? steps[steps.length - 1]?.level ?? 'signal';
}
