# Plyknot Hub — What's Built

Built 2026-04-14 following `hub-build-instructions.md`.

## Architecture

```
hub.plyknot.org (Cloudflare Workers + D1)
    │
    ├── GET  /v1/chains              list all chains
    ├── GET  /v1/chains/:name        single chain detail
    ├── GET  /v1/couplings           query couplings (?property=X&entity=Y)
    ├── GET  /v1/convergence/:entity per-entity convergence (computed at query time)
    ├── GET  /v1/cracks              all divergent/tension steps, sorted by sigma
    ├── GET  /v1/heatmap             inference × complexity grid
    ├── GET  /v1/discovery           cracks + heatmap + stats combined
    ├── GET  /v1/stats               chain/coupling/entity/crack counts
    ├── GET  /v1/search?q=...        embedding similarity or text fallback
    ├── GET  /v1/ground?text=...     map free text → entity IDs + similarity
    ├── POST /v1/submit              authenticated submission → pending review
    │
    ├── GET  /auth/github            start GitHub OAuth
    └── GET  /auth/github/callback   complete OAuth → create API key
```

## File Structure

```
apps/hub/
├── package.json
├── wrangler.toml                    D1 + Workers AI bindings, port 8790
├── tsconfig.json
├── schema.sql                       8 tables (chains, couplings, entities,
│                                    vocabulary, embeddings, users, api_keys,
│                                    submissions)
└── src/
    ├── index.ts                     Worker entry: routes /v1/* and /auth/*
    ├── lib/
    │   ├── d1.ts                    Typed D1 query helpers
    │   ├── embeddings.ts            Workers AI embedding + cosine similarity
    │   └── response.ts              JSON + CORS response helpers
    ├── compute/
    │   └── convergence.ts           Heatmap, cracks, per-entity convergence
    │                                (computed at query time from chain data)
    ├── routes/
    │   ├── chains.ts                GET /v1/chains, /v1/chains/:name
    │   ├── couplings.ts             GET /v1/couplings
    │   ├── convergence.ts           GET /v1/convergence/:entity
    │   ├── cracks.ts                GET /v1/cracks
    │   ├── heatmap.ts               GET /v1/heatmap
    │   ├── stats.ts                 GET /v1/stats
    │   ├── discovery.ts             GET /v1/discovery
    │   ├── search.ts                GET /v1/search?q=...
    │   ├── ground.ts                GET /v1/ground?text=...
    │   └── submit.ts                POST /v1/submit
    └── auth/
        ├── github-oauth.ts          OAuth flow + user upsert
        ├── api-keys.ts              SHA-256 hashed key creation + verification
        └── middleware.ts            Extract auth from request headers
```

## Design Decisions

**D1 stores FACTS, not CONCLUSIONS.** Chains, couplings, entities, vocabulary are stored as-is from GitHub. Convergence status, heatmap, and crack lists are computed at query time from the chain data. The cache can never become stale.

**Convergence from chain steps.** The initial version reads convergence from the `convergence` field on each chain step (pre-computed by the simulator). Full re-computation from raw couplings is a later optimization.

**Embeddings via Workers AI.** Uses `@cf/baai/bge-base-en-v1.5` (768 dimensions, free tier). Pre-computed vectors stored in D1. At query time: embed the query, brute-force cosine similarity. Falls back to text search if no embeddings loaded.

**Submissions are pending.** `POST /v1/submit` creates a row in the `submissions` table with `status='pending'`. Manual review for now. Auto-accept for trusted keys is a later feature.

**GitHub OAuth for identity.** Researchers sign in with GitHub (one click, they already have accounts). The OAuth callback creates a user in D1 and generates an API key shown once.

## MCP Remote Mode

The MCP server (`mcp/src/`) now supports two modes:

```bash
# Local mode (existing — reads files from disk):
claude mcp add plyknot -- npx tsx mcp/src/index.ts --data ./universe/data

# Remote mode (new — reads from Hub API):
claude mcp add plyknot -- npx tsx mcp/src/index.ts --remote https://hub.plyknot.org

# Remote mode with API key (for write tools):
claude mcp add plyknot -- npx tsx mcp/src/index.ts --remote https://hub.plyknot.org --key plyknot_abc123
```

Remote mode eagerly loads all chain data at startup, then serves the same `PlyknotRepository` interface synchronously. All 15 MCP tools work unchanged in both modes.

New files:
- `mcp/src/remote-registry.ts` — HTTP client wrapping Hub `/v1/*` endpoints
- `mcp/src/index.ts` — updated with `--remote` and `--key` argument parsing

## D1 Schema

8 tables:

| Table | Purpose |
|-------|---------|
| `chains` | Full chain JSON + step/crack counts |
| `couplings` | Individual coupling entries with provenance |
| `entities` | Entity registry (id, name, tags) |
| `vocabulary` | Canonical terms + aliases |
| `embeddings` | Pre-computed Float32Array vectors for grounding |
| `users` | GitHub user profiles |
| `api_keys` | SHA-256 hashed API keys per user |
| `submissions` | Pending write submissions |

## Deploy Pipeline

All scripts and automation are built. Tested locally: 14 chains, 1 coupling, 4 entities, 8 vocab loaded into D1, all 11 endpoints verified.

### Scripts

| Script | What it does |
|--------|-------------|
| `scripts/seed-d1.ts` | Reads `universe/data/`, generates SQL, applies per-statement to D1 |
| `scripts/generate-embeddings.ts` | Calls Workers AI to embed entity names + vocab, writes to D1 |

### npm scripts

```bash
npm run db:init          # Apply schema locally
npm run db:seed          # Seed local D1 from universe/data/
npm run db:reset         # init + seed (full reset)
npm run db:init-remote   # Apply schema to production D1
npm run db:seed-remote   # Seed production D1
npm run embeddings       # Generate embeddings (needs CF_ACCOUNT_ID + CF_API_TOKEN)
npm run dev              # Local Worker on :8790
npm run deploy           # Deploy to Cloudflare
```

### GitHub Action

`.github/workflows/rebuild-hub.yml` — triggers on push to `main` when `universe/data/**` changes. Applies schema + seeds remote D1.

### To go live

```bash
# 1. Create D1 database
cd apps/hub && npx wrangler d1 create plyknot-hub
# Paste the database_id into wrangler.toml

# 2. Set secrets
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler secret put GITHUB_TOKEN

# 3. Deploy
npm run db:init-remote
npm run db:seed-remote
npm run deploy
```

## What's Next

1. **Data ingestion:** PDB × AlphaFold scripts → JSONL → universe → D1 rebuild
2. **Embeddings in production:** Run `npm run embeddings` with CF credentials
3. **Web UI:** Point the explorer at `hub.plyknot.org/v1/` instead of the old registry
