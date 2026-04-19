/**
 * Validation helpers for write endpoints.
 *
 * Validates against the data contract, not JSON Schema —
 * the schemas are for file-level validation, these are for API payloads.
 */

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

function fail(errors: string[]): ValidationResult {
  return { ok: false, errors };
}

function pass(): ValidationResult {
  return { ok: true, errors: [] };
}

// ── Dependency ──────────────────────────────────────────────────────────────

export function validateDependency(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object') return fail(['Body must be a JSON object']);
  const b = body as Record<string, unknown>;
  const errors: string[] = [];

  if (!Array.isArray(b.labels) || b.labels.length === 0) {
    errors.push('labels: required, must be a non-empty string array');
  } else if (b.labels.some((l: unknown) => typeof l !== 'string' || l === '')) {
    errors.push('labels: all entries must be non-empty strings');
  }

  if (typeof b.description !== 'string' || b.description === '') {
    errors.push('description: required non-empty string');
  }

  if (!Array.isArray(b.complexityLevels)) {
    errors.push('complexityLevels: required integer array');
  } else if (b.complexityLevels.some((n: unknown) => typeof n !== 'number' || n < 0 || n > 5 || !Number.isInteger(n))) {
    errors.push('complexityLevels: each value must be an integer 0-5');
  }

  return errors.length ? fail(errors) : pass();
}

// ── Coupling ────────────────────────────────────────────────────────────────

export function validateCoupling(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object') return fail(['Body must be a JSON object']);
  const b = body as Record<string, unknown>;
  const errors: string[] = [];

  if (typeof b.entityA !== 'number' || !Number.isInteger(b.entityA)) errors.push('entityA: required integer');
  if (typeof b.entityB !== 'number' || !Number.isInteger(b.entityB)) errors.push('entityB: required integer');
  if (typeof b.property !== 'string' || b.property === '') errors.push('property: required non-empty string');
  if (typeof b.value !== 'number') errors.push('value: required number');
  if (typeof b.method !== 'string' || b.method === '') errors.push('method: required non-empty string');
  if (b.sigma !== undefined && typeof b.sigma !== 'number') errors.push('sigma: must be a number if provided');

  return errors.length ? fail(errors) : pass();
}

// ── Measurement ─────────────────────────────────────────────────────────────

export function validateMeasurement(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object') return fail(['Body must be a JSON object']);
  const b = body as Record<string, unknown>;
  const errors: string[] = [];

  if (typeof b.stepIndex !== 'number' || !Number.isInteger(b.stepIndex) || b.stepIndex < 0) {
    errors.push('stepIndex: required non-negative integer');
  }

  if (!b.measurement || typeof b.measurement !== 'object') {
    errors.push('measurement: required object with { method, value, year, lab }');
  } else {
    const m = b.measurement as Record<string, unknown>;
    if (typeof m.method !== 'string' || m.method === '') errors.push('measurement.method: required non-empty string');
    if (typeof m.value !== 'string' || m.value === '') errors.push('measurement.value: required non-empty string');
    if (typeof m.year !== 'number' || !Number.isInteger(m.year) || m.year < 1600 || m.year > 2100) {
      errors.push('measurement.year: required integer 1600-2100');
    }
    if (typeof m.lab !== 'string' || m.lab === '') errors.push('measurement.lab: required non-empty string');
  }

  return errors.length ? fail(errors) : pass();
}

// ── Hypothesis ──────────────────────────────────────────────────────────────

export function validateHypothesis(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object') return fail(['Body must be a JSON object']);
  const b = body as Record<string, unknown>;
  const errors: string[] = [];

  if (typeof b.claim !== 'string' || b.claim === '') errors.push('claim: required non-empty string');
  const validConv = new Set(['converged', 'tension', 'divergent', 'single']);
  if (typeof b.convergence !== 'string' || !validConv.has(b.convergence)) {
    errors.push('convergence: must be converged|tension|divergent|single');
  }
  if (!Array.isArray(b.depends)) {
    errors.push('depends: required integer array');
  } else if (b.depends.some((d: unknown) => typeof d !== 'number' || !Number.isInteger(d))) {
    errors.push('depends: all entries must be integers');
  }
  if (typeof b.challengeCost !== 'string' || b.challengeCost === '') {
    errors.push('challengeCost: required non-empty string');
  }
  if (typeof b.complexityLevel !== 'number' || !Number.isInteger(b.complexityLevel) || b.complexityLevel < 0 || b.complexityLevel > 5) {
    errors.push('complexityLevel: required integer 0-5');
  }

  return errors.length ? fail(errors) : pass();
}

// ── Cross-validation ────────────────────────────────────────────────────────

/**
 * Check that all dependency IDs in a `depends` array exist in the registry.
 */
export function validateDependsExist(depends: number[], knownIds: Set<number>): string[] {
  const unknown = depends.filter((d) => !knownIds.has(d));
  return unknown.length
    ? [`Unknown dependency IDs: ${unknown.join(', ')}. Check /v1/search or dependencies.json.`]
    : [];
}
