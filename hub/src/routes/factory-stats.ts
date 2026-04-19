/**
 * Factory stats endpoint — aggregate counts for the commercial factory state.
 */

import * as d1 from '../lib/d1.js';
import { json } from '../lib/response.js';

export async function handleFactoryStats(db: D1Database): Promise<Response> {
  const [
    coreStats,
    hypotheses,
    deltas,
    experiments,
    matches,
    embargoed,
    failures,
  ] = await Promise.all([
    d1.getStats(db),
    db.prepare('SELECT COUNT(*) as n FROM hypotheses').first<{ n: number }>(),
    db.prepare('SELECT COUNT(*) as n FROM deltas').first<{ n: number }>(),
    db.prepare('SELECT COUNT(*) as n FROM experiment_nodes').first<{ n: number }>(),
    db.prepare('SELECT COUNT(*) as n FROM tournament_matches').first<{ n: number }>(),
    db.prepare('SELECT COUNT(*) as n FROM embargoed_couplings').first<{ n: number }>(),
    db.prepare('SELECT COUNT(*) as n FROM failure_graph').first<{ n: number }>(),
  ]);

  const activeHypotheses = await db.prepare("SELECT COUNT(*) as n FROM hypotheses WHERE status IN ('proposed', 'tournament-active')").first<{ n: number }>();
  const pendingExperiments = await db.prepare("SELECT COUNT(*) as n FROM experiment_nodes WHERE status = 'pending'").first<{ n: number }>();
  const activeEmbargoes = await db.prepare("SELECT COUNT(*) as n FROM embargoed_couplings WHERE embargo_until > datetime('now')").first<{ n: number }>();

  return json({
    core: coreStats,
    factory: {
      hypothesisCount: hypotheses?.n ?? 0,
      activeHypotheses: activeHypotheses?.n ?? 0,
      deltaCount: deltas?.n ?? 0,
      experimentCount: experiments?.n ?? 0,
      pendingExperiments: pendingExperiments?.n ?? 0,
      tournamentMatches: matches?.n ?? 0,
      embargoedEntries: embargoed?.n ?? 0,
      activeEmbargoes: activeEmbargoes?.n ?? 0,
      failureGraphEntries: failures?.n ?? 0,
    },
  });
}
