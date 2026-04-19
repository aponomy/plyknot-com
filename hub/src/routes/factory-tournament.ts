/**
 * Factory tournament endpoint — records judge ensemble pairwise matches.
 *
 * Each judge's output is recorded as a predict() entry attributed to that judge.
 * Inter-judge convergence is computed per-match.
 */

import { json } from '../lib/response.js';
import type { AuthContext } from '../auth/middleware.js';

const K_FACTOR = 32; // Elo K-factor

function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export async function handleTournamentMatch(request: Request, db: D1Database, auth: AuthContext): Promise<Response> {
  const body = (await request.json()) as Record<string, unknown>;

  const hypothesisA = body.hypothesis_a as string;
  const hypothesisB = body.hypothesis_b as string;
  const winner = body.winner as string;
  const judgeId = body.judge_id as string;
  const confidence = body.confidence as number;

  if (!hypothesisA || !hypothesisB) return json({ error: 'hypothesis_a and hypothesis_b are required' }, 400);
  if (!winner || (winner !== hypothesisA && winner !== hypothesisB)) {
    return json({ error: 'winner must be hypothesis_a or hypothesis_b' }, 400);
  }
  if (!judgeId) return json({ error: 'judge_id is required' }, 400);
  if (typeof confidence !== 'number' || confidence < 0 || confidence > 1) {
    return json({ error: 'confidence must be a number between 0 and 1' }, 400);
  }

  // Get current Elo ratings
  const a = await db.prepare('SELECT elo_rating, tournament_matches FROM hypotheses WHERE id = ?').bind(hypothesisA).first<{ elo_rating: number; tournament_matches: number }>();
  const b = await db.prepare('SELECT elo_rating, tournament_matches FROM hypotheses WHERE id = ?').bind(hypothesisB).first<{ elo_rating: number; tournament_matches: number }>();

  if (!a) return json({ error: `hypothesis_a "${hypothesisA}" not found` }, 404);
  if (!b) return json({ error: `hypothesis_b "${hypothesisB}" not found` }, 404);

  // Compute new Elo ratings
  const eA = expectedScore(a.elo_rating, b.elo_rating);
  const eB = expectedScore(b.elo_rating, a.elo_rating);
  const sA = winner === hypothesisA ? 1 : 0;
  const sB = winner === hypothesisB ? 1 : 0;

  const newRatingA = Math.round((a.elo_rating + K_FACTOR * (sA - eA)) * 10) / 10;
  const newRatingB = Math.round((b.elo_rating + K_FACTOR * (sB - eB)) * 10) / 10;

  // Record match and update ratings
  await db.batch([
    db.prepare(
      `INSERT INTO tournament_matches (hypothesis_a, hypothesis_b, winner, judge_id, confidence, rationale, inter_judge_convergence)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(hypothesisA, hypothesisB, winner, judgeId, confidence, (body.rationale as string) ?? null, (body.inter_judge_convergence as number) ?? null),
    db.prepare('UPDATE hypotheses SET elo_rating = ?, tournament_matches = ? WHERE id = ?').bind(newRatingA, a.tournament_matches + 1, hypothesisA),
    db.prepare('UPDATE hypotheses SET elo_rating = ?, tournament_matches = ? WHERE id = ?').bind(newRatingB, b.tournament_matches + 1, hypothesisB),
  ]);

  return json({
    match: { hypothesis_a: hypothesisA, hypothesis_b: hypothesisB, winner, judge_id: judgeId, confidence },
    elo: { [hypothesisA]: newRatingA, [hypothesisB]: newRatingB },
  }, 201);
}
