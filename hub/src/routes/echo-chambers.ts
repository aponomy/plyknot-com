import { computeEchoChambers } from '../lib/echo-chamber.js';
import * as d1 from '../lib/d1.js';
import { json } from '../lib/response.js';

export async function handleEchoChambers(db: D1Database, url: URL): Promise<Response> {
  const entityParam = url.searchParams.get('entity');
  const property = url.searchParams.get('property') ?? undefined;
  const minPredictions = Number(url.searchParams.get('min_predictions') ?? 2);
  const strict = url.searchParams.get('strict') === 'true';

  const entity = entityParam !== null ? (isNaN(Number(entityParam)) ? undefined : Number(entityParam)) : undefined;
  const entityName = entityParam !== null && isNaN(Number(entityParam)) ? entityParam : undefined;

  // Load couplings with filters
  const rows = await d1.listCouplings(db, { property, entity });

  // Build entity name map
  const entityRows = await d1.listEntities(db);
  const entities = new Map<number, string>();
  for (const e of entityRows) entities.set(e.id, e.name);

  // Filter by entity name if provided as string
  let filtered = rows;
  if (entityName) {
    const matchId = entityRows.find((e) => e.name.toLowerCase() === entityName.toLowerCase())?.id;
    if (matchId !== undefined) {
      filtered = rows.filter((r) => r.entity_b === matchId);
    } else {
      filtered = [];
    }
  }

  const echoChambers = computeEchoChambers(filtered, entities, { minPredictions, strict });

  return json({
    echo_chambers: echoChambers,
    total: echoChambers.length,
    query: { entity: entityParam, property, min_predictions: minPredictions, strict },
  });
}
