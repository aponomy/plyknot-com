/**
 * D1 query helpers — typed wrappers around D1Database.
 */

export interface ChainRow {
  id: number;
  name: string;
  entity: string;
  data: string;
  step_count: number;
  crack_count: number;
}

export interface CouplingRow {
  id: number;
  entity_a: number;
  entity_b: number;
  property: string;
  value: number;
  method: string;
  sigma: number | null;
  source: string;
  provenance: string | null;
}

export interface EntityRow {
  id: number;
  name: string;
  tags: string;
}

export interface EmbeddingRow {
  id: number;
  entity_label: string;
  entity_id: number | null;
  vector: ArrayBuffer;
}

// ── Queries ─────────────────────────────────────────────────────────────

export async function listChains(db: D1Database) {
  const { results } = await db
    .prepare('SELECT name, entity, step_count, crack_count FROM chains ORDER BY name')
    .all<Pick<ChainRow, 'name' | 'entity' | 'step_count' | 'crack_count'>>();
  return results;
}

export async function getChain(db: D1Database, name: string) {
  return db
    .prepare('SELECT * FROM chains WHERE name = ?')
    .bind(name)
    .first<ChainRow>();
}

export async function listCouplings(
  db: D1Database,
  filters: { property?: string; entity?: number } = {},
) {
  let sql = 'SELECT * FROM couplings';
  const binds: (string | number)[] = [];
  const wheres: string[] = [];

  if (filters.property) {
    wheres.push('property = ?');
    binds.push(filters.property);
  }
  if (filters.entity !== undefined) {
    wheres.push('(entity_a = ? OR entity_b = ?)');
    binds.push(filters.entity, filters.entity);
  }
  if (wheres.length) sql += ' WHERE ' + wheres.join(' AND ');
  sql += ' LIMIT 10000';

  const stmt = db.prepare(sql);
  const { results } = await (binds.length ? stmt.bind(...binds) : stmt).all<CouplingRow>();
  return results;
}

export async function listEntities(db: D1Database) {
  const { results } = await db.prepare('SELECT * FROM entities ORDER BY id').all<EntityRow>();
  return results;
}

export async function getEntity(db: D1Database, id: number) {
  return db.prepare('SELECT * FROM entities WHERE id = ?').bind(id).first<EntityRow>();
}

export interface DependencyRow {
  id: number;
  labels: string;
  description: string;
  created_by: string;
  complexity_levels: string;
}

export interface EventRow {
  id: number;
  timestamp: string;
  type: string;
  actor: string;
  details: string;
}

export async function listDependencies(db: D1Database) {
  const { results } = await db
    .prepare('SELECT * FROM dependencies ORDER BY id')
    .all<DependencyRow>();
  return results.map((r) => ({
    id: r.id,
    labels: JSON.parse(r.labels) as string[],
    description: r.description,
    createdBy: r.created_by,
    complexityLevels: JSON.parse(r.complexity_levels) as number[],
  }));
}

export async function listEvents(
  db: D1Database,
  filters: { type?: string; actor?: string; since?: string } = {},
) {
  let sql = 'SELECT * FROM events';
  const binds: string[] = [];
  const wheres: string[] = [];
  if (filters.type) { wheres.push('type = ?'); binds.push(filters.type); }
  if (filters.actor) { wheres.push('actor = ?'); binds.push(filters.actor); }
  if (filters.since) { wheres.push('timestamp >= ?'); binds.push(filters.since); }
  if (wheres.length) sql += ' WHERE ' + wheres.join(' AND ');
  sql += ' ORDER BY id DESC LIMIT 1000';
  const stmt = db.prepare(sql);
  const { results } = await (binds.length ? stmt.bind(...binds) : stmt).all<EventRow>();
  return results.map((r) => ({
    id: r.id,
    timestamp: r.timestamp,
    type: r.type,
    actor: r.actor,
    details: JSON.parse(r.details),
  }));
}

export async function getStats(db: D1Database) {
  const chains = await db.prepare('SELECT COUNT(*) as n FROM chains').first<{ n: number }>();
  const couplings = await db.prepare('SELECT COUNT(*) as n FROM couplings').first<{ n: number }>();
  const entities = await db.prepare('SELECT COUNT(*) as n FROM entities').first<{ n: number }>();
  const cracks = await db.prepare('SELECT SUM(crack_count) as n FROM chains').first<{ n: number }>();
  return {
    chainCount: chains?.n ?? 0,
    couplingCount: couplings?.n ?? 0,
    entityCount: entities?.n ?? 0,
    crackCount: cracks?.n ?? 0,
  };
}

export async function getEmbeddings(db: D1Database) {
  const { results } = await db
    .prepare('SELECT entity_label, entity_id, vector FROM embeddings')
    .all<EmbeddingRow>();
  return results;
}
