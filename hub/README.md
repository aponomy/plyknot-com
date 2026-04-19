# Plyknot Hub Commercial

Commercial factory research API at **hub.plyknot.com**. Cloudflare Worker + D1, restricted to `plyknot` GitHub org members.

This is the commercial counterpart to the public hub at [hub.plyknot.org](https://hub.plyknot.org). It inherits all public hub endpoints and adds factory-specific routes for hypothesis management, experiment trees, tournament matches, convergence deltas, and embargo tracking.

## Key differences from org hub

| | hub.plyknot.org | hub.plyknot.com |
|--|-----------------|-----------------|
| **Auth** | Public read, API key for writes | All endpoints require API key + org membership |
| **OAuth scope** | `read:user` | `read:user read:org` |
| **D1** | `plyknot-hub-prod` (8 tables) | `plyknot-hub-com-prod` (16 tables) |
| **PR target** | `plyknot/universe` | `plyknot-com` |
| **Factory routes** | None | `/v1/factory/*` (hypotheses, deltas, experiments, tournament, embargo, stats) |

## Cloudflare resources

| Resource | Name / ID |
|----------|-----------|
| Worker | `plyknot-hub-com` |
| D1 database | `plyknot-hub-com-prod` / `9929f003-c413-4056-a425-397256443f2a` |
| Custom domain | `hub.plyknot.com` (zone: `plyknot.com`) |
| Workers AI | `@cf/baai/bge-base-en-v1.5` (embedding search + grounding) |

## Development

```bash
npm install
npm run dev          # local Worker on localhost:8791 with local D1
npm run db:reset     # init schema + seed from universe-private/
```

## Deployment

```bash
npm run deploy       # wrangler deploy to hub.plyknot.com
```

### Secrets

Set via `npx wrangler secret put <NAME>`:

| Secret | Source | Purpose |
|--------|--------|---------|
| `GITHUB_CLIENT_ID` | GitHub OAuth App settings | OAuth login flow |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App settings | OAuth token exchange |
| `GITHUB_TOKEN` | GitHub fine-grained PAT (plyknot org, Contents + PRs r/w) | PR creation for write endpoints |

OAuth App callback URL: `https://hub.plyknot.com/auth/github/callback`

### D1 schema

```bash
npm run db:init-remote   # apply schema.sql to production D1
```

The schema includes all org hub tables plus 7 factory tables: `embargoed_couplings`, `hypotheses`, `tournament_matches`, `deltas`, `experiment_nodes`, `failure_graph`, `agent_trust`.

## Factory API

All factory endpoints are under `/v1/factory/` and require authentication.

### Read endpoints

- `GET /v1/factory/stats` — aggregate factory metrics
- `GET /v1/factory/hypotheses?crack_id=...&status=...` — list hypotheses (sorted by Elo)
- `GET /v1/factory/hypotheses/:id` — single hypothesis
- `GET /v1/factory/deltas?crack_id=...&pipeline=...` — list convergence deltas
- `GET /v1/factory/deltas/:id` — single delta
- `GET /v1/factory/experiments?hypothesis_id=...&status=...` — list experiment nodes
- `GET /v1/factory/embargoed?status=active|expired` — embargoed coupling entries

### Write endpoints

- `POST /v1/factory/hypotheses` — create hypothesis (from Proposer agent)
- `POST /v1/factory/deltas` — record convergence delta
- `POST /v1/factory/experiments` — create experiment tree node
- `PATCH /v1/factory/experiments/:id` — update experiment status/result
- `POST /v1/factory/tournament` — record judge pairwise match (updates Elo ratings)

### Experiment node types

`preliminary` | `hyperparameter` | `replication` | `aggregation` | `ablation` | `contradiction`

### Pipeline types

`crack-resolution` | `opening-extension` | `extraction` | `surveillance` | `rendering`
