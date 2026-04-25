#!/usr/bin/env node
/**
 * Supervisor CLI — run the research factory loop.
 *
 * Usage:
 *   npx tsx plyknot-com/core/cli.ts \
 *     --crack expanding-universe:measurement \
 *     --project h0-tension \
 *     --budget 10 \
 *     --rounds 3 \
 *     --judges claude,google
 *
 * Environment variables:
 *   ANTHROPIC_API_KEY — for Claude agent calls
 *   GOOGLE_API_KEY — for Gemini judge
 *   OPENAI_API_KEY — for GPT judge (optional)
 *   PLYKNOT_COM_API_KEY — for hub.plyknot.com
 */

import type { ModelVendor, SupervisorConfig } from './types.js';
import { Supervisor } from './supervisor.js';

function parseArgs(argv: string[]): SupervisorConfig {
  let crack_id = '';
  let project_id = '';
  let budget_usd = 10;
  let max_rounds = 3;
  let critics: ModelVendor[] = ['claude', 'google']; // cognitive-variance diverse critic ensemble
  let hypotheses_per_round = 3;
  let matches_per_round = 3;
  let mode: 'cowork' | 'autonomous' = 'autonomous';

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--crack' && next) { crack_id = next; i++; }
    else if (arg === '--project' && next) { project_id = next; i++; }
    else if (arg === '--budget' && next) { budget_usd = Number(next); i++; }
    else if (arg === '--rounds' && next) { max_rounds = Number(next); i++; }
    else if (arg === '--critics' && next) { critics = next.split(',') as ModelVendor[]; i++; }
    else if (arg === '--hypotheses' && next) { hypotheses_per_round = Number(next); i++; }
    else if (arg === '--matches' && next) { matches_per_round = Number(next); i++; }
    else if (arg === '--cowork') { mode = 'cowork'; }
  }

  if (!crack_id) {
    console.error('Usage: npx tsx cli.ts --crack <crack_id> --project <project_id> [options]');
    console.error('');
    console.error('Required:');
    console.error('  --crack <id>        Crack to resolve (e.g. expanding-universe:measurement)');
    console.error('  --project <id>      Project to scope work to');
    console.error('');
    console.error('Options:');
    console.error('  --budget <usd>      Max spend (default: 10)');
    console.error('  --rounds <n>        Max rounds (default: 3)');
    console.error('  --critics <vendors>  Comma-separated: claude,google,openai (default: claude,google)');
    console.error('  --hypotheses <n>    Hypotheses per round (default: 3)');
    console.error('  --matches <n>       Tournament matches per round (default: 3)');
    console.error('  --cowork            Pause after each round for human review');
    console.error('');
    console.error('Environment:');
    console.error('  ANTHROPIC_API_KEY   Required for Claude agents');
    console.error('  GOOGLE_API_KEY      Required if --judges includes google');
    console.error('  OPENAI_API_KEY      Required if --judges includes openai');
    console.error('  PLYKNOT_COM_API_KEY Required for hub.plyknot.com');
    process.exit(1);
  }

  const comApiKey = process.env.PLYKNOT_COM_API_KEY;
  if (!comApiKey) {
    console.error('Error: PLYKNOT_COM_API_KEY not set');
    process.exit(1);
  }

  return {
    mode,
    project_id: project_id || `auto-${crack_id.replace(/[^a-z0-9]/g, '-')}`,
    crack_id,
    budget_usd,
    max_rounds,
    hypotheses_per_round,
    matches_per_round,
    judge_vendors: critics,
    org_hub_url: 'https://hub.plyknot.org',
    com_hub_url: 'https://hub.plyknot.com',
    com_api_key: comApiKey,
  };
}

async function main() {
  const config = parseArgs(process.argv);

  console.error(`[supervisor] Starting crack resolution`);
  console.error(`[supervisor] Crack: ${config.crack_id}`);
  console.error(`[supervisor] Project: ${config.project_id}`);
  console.error(`[supervisor] Budget: $${config.budget_usd}`);
  console.error(`[supervisor] Rounds: ${config.max_rounds}`);
  console.error(`[supervisor] Critics: ${config.judge_vendors.join(', ')}`);
  console.error(`[supervisor] Mode: ${config.mode}`);
  console.error('');

  const supervisor = new Supervisor(config);
  await supervisor.init();

  if (config.mode === 'autonomous') {
    const finalState = await supervisor.run();
    console.log(JSON.stringify(finalState, null, 2));
  } else {
    // Cowork mode — run one step at a time
    const state = await supervisor.runStep();
    console.log(JSON.stringify(state, null, 2));
    console.error('');
    if (state.current_step === 'round-complete') {
      console.error(`[supervisor] Round ${state.current_round} complete. Run again to start next round.`);
    } else {
      console.error(`[supervisor] Step "${state.current_step}" complete (round ${state.current_round}). Run again for next step.`);
    }
  }
}

main().catch((err) => {
  console.error('[supervisor] Fatal:', err);
  process.exit(1);
});
