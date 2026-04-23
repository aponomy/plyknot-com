/**
 * Shared tool definitions — single source of truth for both:
 * - MCP server (mcp/src/tools.ts) — handlers use PlyknotRepository
 * - Hub agent (plyknot-com/hub/src/routes/factory-agent.ts) — handlers use D1
 *
 * Only definitions here (name, description, inputSchema). No handlers.
 */

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  // ── Read ─────────────────────────────────────────────────────────────────
  {
    name: 'list_chains',
    description: 'List all inference chains with summary info (name, entity, step count, cracks).',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_chain',
    description: 'Fetch a single inference chain by name with full step detail.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Chain name (file basename without .json)' },
      },
      required: ['name'],
    },
  },
  {
    name: 'find_cracks',
    description: 'List all divergent/tension steps across all chains. Sorted by severity (sigmaTension desc).',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'query_couplings',
    description: 'Query coupling entries; optional filters by property or entity.',
    inputSchema: {
      type: 'object',
      properties: {
        property: { type: 'string' },
        entity: { type: 'string', description: 'Filter by entity name' },
        limit: { type: 'number', description: 'Max results (default 20)' },
      },
    },
  },
  {
    name: 'get_collisions',
    description: 'Marker passing crack-connections and openings (precomputed from the current graph).',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_heatmap',
    description: 'Crack map: inference level x complexity level grid with status per cell.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_level_status',
    description: 'Complexity level derivation status (earned, tension, not-earned) with reasoning.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'search_vocabulary',
    description: 'Fuzzy search the dependency registry by label or description. Returns matching registry entries.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search term' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_convergence_map',
    description: 'Full convergence map across all chains: weakest level, crack count, level status.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_discovery_report',
    description: 'Crack-connections, openings, and structural holes for the current universe.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_stats',
    description: 'Overall universe stats: chain/coupling/entity/crack counts.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_entity_history',
    description: 'Event timeline for an entity — all measurements, convergence changes, and submissions involving this entity.',
    inputSchema: {
      type: 'object',
      properties: {
        entity: { type: 'string', description: 'Entity name (e.g. "Electron")' },
      },
      required: ['entity'],
    },
  },
  {
    name: 'get_echo_chambers',
    description: 'Echo-chamber detection — prediction consensus unsupported or contradicted by measurements.',
    inputSchema: {
      type: 'object',
      properties: {
        entity: { type: 'string', description: 'Filter by target entity' },
        property: { type: 'string', description: 'Filter by property' },
        min_predictions: { type: 'number', description: 'Minimum predictions to consider (default: 2)' },
        strict: { type: 'boolean', description: 'Require ALL measurements to diverge (default: false)' },
      },
    },
  },
  {
    name: 'get_measurement_prediction_ratio',
    description: 'Measurement vs prediction coverage — which properties have measurements, which are prediction-only.',
    inputSchema: {
      type: 'object',
      properties: {
        entity: { type: 'string', description: 'Filter by entity' },
        include_groups: { type: 'boolean', description: 'Include per-group breakdown (default: false)' },
      },
    },
  },
  {
    name: 'get_marker_passing',
    description: 'Marker passing on the dependency graph — finds shared vulnerabilities between cracked chains and bridges between solid chains.',
    inputSchema: {
      type: 'object',
      properties: {
        decay: { type: 'number', description: 'Marker decay per hop (default: 0.8)' },
        max_hops: { type: 'number', description: 'Maximum propagation depth (default: 5)' },
        mode: { type: 'string', enum: ['cracks', 'openings', 'both'], description: 'Filter collision type (default: both)' },
        include_paths: { type: 'boolean', description: 'Include propagation paths (default: false)' },
      },
    },
  },
  {
    name: 'get_speciation',
    description: 'Speciation detection — does a (entity, property) group contain hidden sub-populations? Uses GMM+BIC.',
    inputSchema: {
      type: 'object',
      properties: {
        entity: { type: 'string', description: 'Entity name or ID (required)' },
        property: { type: 'string', description: 'Property to analyze (required)' },
        max_components: { type: 'number', description: 'Max GMM components (default: 5)' },
        min_component_size: { type: 'number', description: 'Min entries per component (default: 5)' },
        min_delta_bic: { type: 'number', description: 'ΔBIC threshold (default: 10)' },
      },
      required: ['entity', 'property'],
    },
  },

  // ── Compute ──────────────────────────────────────────────────────────────
  {
    name: 'run_simulator',
    description: 'Run the plyknot simulator on an arbitrary set of chains. Returns rendered output + crack count.',
    inputSchema: {
      type: 'object',
      properties: {
        chains: { type: 'array', description: 'Array of ChainFile objects to simulate' },
      },
      required: ['chains'],
    },
  },
  {
    name: 'run_marker_passing',
    description: 'Run marker passing over the current universe. Optional MarkerPassingConfig overrides.',
    inputSchema: {
      type: 'object',
      properties: {
        config: { type: 'object', description: 'Partial MarkerPassingConfig overrides' },
      },
    },
  },
  {
    name: 'derive_level',
    description: 'Test whether a complexity level has earned its place given the current chains.',
    inputSchema: {
      type: 'object',
      properties: {
        complexityLevel: { type: 'number', description: '0-5' },
      },
      required: ['complexityLevel'],
    },
  },
  {
    name: 'diff_convergence',
    description: 'Compare two ChainFile[] states and return crack/step delta.',
    inputSchema: {
      type: 'object',
      properties: {
        before: { type: 'array' },
        after: { type: 'array' },
      },
      required: ['before', 'after'],
    },
  },

  // ── Write ─────────────────────────────────────────────────────────────────
  {
    name: 'add_coupling',
    description: 'Add a coupling entry (measurement between two entities). Creates a PR.',
    inputSchema: {
      type: 'object',
      properties: {
        entityA: { type: 'number', description: 'First entity ID' },
        entityB: { type: 'number', description: 'Second entity ID' },
        property: { type: 'string', description: 'Property being measured' },
        value: { type: 'number', description: 'Measured value' },
        method: { type: 'string', description: 'Measurement method' },
        sigma: { type: 'number', description: 'Measurement uncertainty' },
        preview: { type: 'boolean', description: 'Validate without creating PR' },
      },
      required: ['entityA', 'entityB', 'property', 'value', 'method'],
    },
  },
  {
    name: 'add_measurement',
    description: 'Add a measurement to an existing chain step. Creates a PR.',
    inputSchema: {
      type: 'object',
      properties: {
        chainName: { type: 'string', description: 'Chain name' },
        stepIndex: { type: 'number', description: 'Step index (0-based)' },
        method: { type: 'string', description: 'Measurement method' },
        value: { type: 'string', description: 'Measured value' },
        year: { type: 'number', description: 'Publication year' },
        lab: { type: 'string', description: 'Laboratory or group' },
        preview: { type: 'boolean', description: 'Validate without creating PR' },
      },
      required: ['chainName', 'stepIndex', 'method', 'value', 'year', 'lab'],
    },
  },
  {
    name: 'propose_hypothesis',
    description: 'Propose a Level ⑤ hypothesis step for a chain. Creates a PR.',
    inputSchema: {
      type: 'object',
      properties: {
        chainName: { type: 'string', description: 'Chain name' },
        claim: { type: 'string', description: 'The hypothesis claim' },
        convergence: { type: 'string', enum: ['converged', 'tension', 'divergent', 'single'] },
        depends: { type: 'array', items: { type: 'number' }, description: 'Dependency registry IDs' },
        challengeCost: { type: 'string', description: 'What it would take to overturn' },
        complexityLevel: { type: 'number', description: 'Complexity level 0-5' },
        preview: { type: 'boolean', description: 'Validate without creating PR' },
      },
      required: ['chainName', 'claim', 'convergence', 'depends', 'challengeCost', 'complexityLevel'],
    },
  },

  // ── Factory (plyknot.com only) ───────────────────────────────────────────
  {
    name: 'list_projects',
    description: 'List all factory projects/work containers with status, kind, and budget.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['active', 'paused', 'completed', 'blocked', 'archived'] },
      },
    },
  },
  {
    name: 'get_project',
    description: 'Get details of a specific factory project by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'create_project',
    description: 'Create a new factory project/work container.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        kind: { type: 'string', enum: ['crack-resolution', 'extraction-batch', 'surveillance', 'opening-extension', 'investigation'] },
        description: { type: 'string' },
        category_slug: { type: 'string', description: 'Category (default: other)' },
        budget_usd: { type: 'number' },
        crack_ids: { type: 'array', items: { type: 'string' } },
        entity_scope: { type: 'array', items: { type: 'string' } },
      },
      required: ['title', 'kind'],
    },
  },
  {
    name: 'update_project',
    description: 'Update a factory project (status, budget, description, etc.).',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        status: { type: 'string' },
        description: { type: 'string' },
        budget_usd: { type: 'number' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'list_attention_items',
    description: 'List pending attention items (review queue, wet-lab requests, embargoes).',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['pending', 'acknowledged', 'resolved'] },
        type: { type: 'string' },
        project_id: { type: 'string' },
      },
    },
  },
  {
    name: 'resolve_attention_item',
    description: 'Resolve an attention item with a response.',
    inputSchema: {
      type: 'object',
      properties: {
        item_id: { type: 'string' },
        response: { type: 'object', description: 'Response data' },
      },
      required: ['item_id'],
    },
  },
];
