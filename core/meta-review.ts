/**
 * Meta-review aggregator — after each round, produces a structured summary
 * that gets appended to the next round's agent prompts.
 *
 * This is the Co-Scientist textual-gradient move, applied to a reference state
 * rather than to judge preferences. It requires no fine-tuning and compounds
 * across rounds.
 */

import type { Task, RoundResult } from './types.js';

export interface MetaReviewInput {
  round: number;
  tasks: Task[];
  previous_meta_review?: string;
}

/**
 * Aggregate a round's tasks into a structured meta-review string.
 * Not free-form advice — a list of what worked, what failed, what moved.
 */
export function generateMetaReview(input: MetaReviewInput): string {
  const { round, tasks, previous_meta_review } = input;

  const completed = tasks.filter((t) => t.status === 'completed');
  const failed = tasks.filter((t) => t.status === 'failed');

  // Group completed tasks by type
  const byType: Record<string, Task[]> = {};
  for (const t of completed) {
    (byType[t.type] ??= []).push(t);
  }

  const lines: string[] = [`## Round ${round} meta-review`];

  // Proposal outcomes
  const proposals = byType['propose'] ?? [];
  if (proposals.length > 0) {
    const hypotheses = proposals.flatMap((t) =>
      (t.output?.hypotheses as Array<{ id: string; proposed_mechanism: string }>) ?? []
    );
    lines.push(`\n### Proposals: ${hypotheses.length} hypotheses generated`);
    for (const h of hypotheses) {
      lines.push(`- ${h.id}: ${h.proposed_mechanism?.slice(0, 120)}...`);
    }
  }

  // Dispute resolution outcomes (§9.4: structural query + critic ensemble)
  const disputes = byType['judge'] ?? [];  // task type still 'judge' in queue for backward compat
  if (disputes.length > 0) {
    const resolved: string[] = [];
    const gaps: string[] = [];
    const ambiguities: string[] = [];

    for (const t of disputes) {
      if (t.output?.resolved === true) {
        resolved.push(`${t.output?.winner_position} (via structural query)`);
      } else if (t.output?.ambiguity_marker) {
        ambiguities.push(t.output.ambiguity_marker as string);
      } else if (t.output?.research_gap) {
        gaps.push((t.output.research_gap as { question?: string })?.question ?? 'unknown gap');
      }
    }

    lines.push(`\n### Dispute resolution: ${disputes.length} disagreements processed`);
    if (resolved.length > 0) {
      lines.push(`- ${resolved.length} resolved by coupling-map data:`);
      for (const r of resolved) lines.push(`  - ${r}`);
    }
    if (gaps.length > 0) {
      lines.push(`- ${gaps.length} research gaps logged (data insufficient):`);
      for (const g of gaps) lines.push(`  - ${g.slice(0, 120)}`);
    }
    if (ambiguities.length > 0) {
      lines.push(`- ${ambiguities.length} ambiguity markers preserved (critic ensemble disagreed):`);
      for (const a of ambiguities) lines.push(`  - ${a.slice(0, 120)}`);
    }
  }

  // Experiment planning outcomes
  const experiments = byType['plan'] ?? [];
  if (experiments.length > 0) {
    lines.push(`\n### Experiments: ${experiments.length} planned`);
  }

  // Execution outcomes
  const executions = byType['execute'] ?? [];
  if (executions.length > 0) {
    const succeeded = executions.filter((t) => t.output?.status === 'completed');
    const wetLabPending = executions.filter((t) => t.output?.status === 'wet-lab-pending');
    lines.push(`\n### Execution: ${executions.length} experiments run`);
    if (succeeded.length > 0) lines.push(`- ${succeeded.length} completed computationally`);
    if (wetLabPending.length > 0) lines.push(`- ${wetLabPending.length} awaiting wet-lab results (attention items created)`);
    for (const t of executions) {
      if (t.output?.finding_summary) {
        lines.push(`- Result: ${(t.output.finding_summary as string).slice(0, 120)}`);
      }
    }
  }

  // Critique outcomes
  const critiques = byType['critique'] ?? [];
  if (critiques.length > 0) {
    const passed = critiques.filter((t) => t.output?.passes === true);
    const blocked = critiques.filter((t) => t.output?.passes === false);
    lines.push(`\n### Critique: ${critiques.length} structural checks`);
    if (passed.length > 0) lines.push(`- ${passed.length} passed`);
    if (blocked.length > 0) {
      lines.push(`- ${blocked.length} BLOCKED (issues found):`);
      for (const t of blocked) {
        const issues = (t.output?.issues as Array<{ description: string }>) ?? [];
        for (const issue of issues.slice(0, 3)) {
          lines.push(`  - ${issue.description?.slice(0, 100)}`);
        }
      }
    }
  }

  // Delta outcomes
  const deltas = byType['delta'] ?? [];
  if (deltas.length > 0) {
    lines.push(`\n### Deltas: ${deltas.length} convergence deltas computed`);
    for (const t of deltas) {
      const shift = t.output?.convergence_shift as { before?: number; after?: number } | undefined;
      if (shift) {
        lines.push(`- Crack convergence: ${shift.before?.toFixed(3)} → ${shift.after?.toFixed(3)}`);
      }
    }
  }

  // Archive outcomes
  const archives = byType['archive'] ?? [];
  if (archives.length > 0) {
    const totalCouplings = archives.reduce((sum, t) => sum + ((t.output?.couplings_written as number) ?? 0), 0);
    lines.push(`\n### Archive: ${totalCouplings} couplings written to coupling map`);
  }

  // Failures
  if (failed.length > 0) {
    lines.push(`\n### Failures: ${failed.length} tasks failed`);
    for (const t of failed) {
      lines.push(`- ${t.type} (${t.id}): ${t.error?.slice(0, 100)}`);
    }
  }

  // Cost
  const totalCost = tasks.reduce((sum, t) => sum + (t.cost_actual_usd ?? 0), 0);
  lines.push(`\n### Cost: $${totalCost.toFixed(4)} this round`);

  // Carry forward relevant parts of previous meta-review
  if (previous_meta_review) {
    lines.push(`\n### Cumulative context (from prior rounds)\n${previous_meta_review}`);
  }

  return lines.join('\n');
}

/**
 * Extract round result stats from completed tasks.
 */
export function summarizeRound(round: number, tasks: Task[], metaReview: string): RoundResult {
  const completed = tasks.filter((t) => t.status === 'completed');
  const failed = tasks.filter((t) => t.status === 'failed');

  return {
    round,
    tasks_completed: completed.length,
    tasks_failed: failed.length,
    cost_usd: tasks.reduce((sum, t) => sum + (t.cost_actual_usd ?? 0), 0),
    hypotheses_proposed: tasks.filter((t) => t.type === 'propose' && t.status === 'completed').length,
    disagreements_resolved: tasks.filter((t) => t.type === 'judge' && t.status === 'completed' && t.output?.resolved === true).length,
    research_gaps_logged: tasks.filter((t) => t.type === 'judge' && t.status === 'completed' && t.output?.research_gap).length,
    ambiguity_markers_created: tasks.filter((t) => t.type === 'judge' && t.status === 'completed' && t.output?.ambiguity_marker).length,
    experiments_planned: tasks.filter((t) => t.type === 'plan' && t.status === 'completed').length,
    experiments_executed: tasks.filter((t) => t.type === 'execute' && t.status === 'completed').length,
    critiques_run: tasks.filter((t) => t.type === 'critique' && t.status === 'completed').length,
    deltas_computed: tasks.filter((t) => t.type === 'delta' && t.status === 'completed').length,
    couplings_archived: tasks
      .filter((t) => t.type === 'archive' && t.status === 'completed')
      .reduce((sum, t) => sum + ((t.output?.couplings_written as number) ?? 0), 0),
    meta_review: metaReview,
  };
}
