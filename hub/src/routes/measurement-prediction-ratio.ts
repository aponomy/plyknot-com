import { computeMeasurementPredictionRatio } from '../lib/echo-chamber.js';
import * as d1 from '../lib/d1.js';
import { json } from '../lib/response.js';

export async function handleMeasurementPredictionRatio(db: D1Database, url: URL): Promise<Response> {
  const entityParam = url.searchParams.get('entity');
  const entity = entityParam !== null ? (isNaN(Number(entityParam)) ? undefined : Number(entityParam)) : undefined;
  const includeGroups = url.searchParams.get('include_groups') === 'true';

  const rows = await d1.listCouplings(db, { entity });

  const entityRows = await d1.listEntities(db);
  const entities = new Map<number, string>();
  for (const e of entityRows) entities.set(e.id, e.name);

  const { summary, groups, gaps } = computeMeasurementPredictionRatio(rows, entities);

  const response: Record<string, unknown> = {
    summary,
    concept_measurement_gaps: gaps,
  };
  if (includeGroups) response.groups = groups;

  return json(response);
}
