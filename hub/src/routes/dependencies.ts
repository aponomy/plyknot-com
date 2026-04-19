/**
 * POST /v1/dependencies — CLOSED (April 2026).
 *
 * Vocabulary is authored in the Python source (plyknot/registry.py) and
 * exported to universe/data/vocabulary/dependencies.json as a read-only
 * mirror at release time. Community contributions to vocabulary go through
 * Python PRs against plyknot/plyknot, not data PRs against plyknot/universe.
 *
 * Returns 501 Not Implemented with guidance.
 */

import { json } from '../lib/response.js';

export async function handleAddDependency(
  _request: Request,
  _db: D1Database,
  _auth: unknown,
  _env: unknown,
  _dryRun: boolean,
): Promise<Response> {
  return json(
    {
      error: 'Not Implemented',
      message:
        'Vocabulary contributions are made against the Python source (plyknot/registry.py), ' +
        'not via the hub API. The JSON mirror in universe/data/vocabulary/ is a downstream ' +
        'artifact exported at release time. See CONTRIBUTING.md for details.',
      see: 'https://github.com/plyknot/plyknot/blob/main/plyknot/registry.py',
    },
    501,
  );
}
