# plyknot-com

Commercial repository for the plyknot.com research factory. Private, owned by Solarplexor AB.

**Architecture doc:** `research/project/architecture/plyknot-com-architecture.md` (in the research repo)

## Structure

```
plyknot-com/
├── hub/                          # Commercial Hub Worker (hub.plyknot.com)
│   ├── wrangler.toml             # Cloudflare Worker config
│   ├── schema.sql                # D1 schema (16 tables: 8 core + 7 factory + auth)
│   ├── src/                      # TypeScript source
│   │   ├── index.ts              # Entry point — all routes
│   │   ├── auth/                 # GitHub OAuth + org-membership gate
│   │   ├── lib/                  # D1 queries, embeddings, GitHub PR, validation
│   │   ├── compute/              # Convergence computation
│   │   └── routes/               # Route handlers (org-inherited + factory-*)
│   └── scripts/                  # Seed + embedding scripts
├── agents/
│   ├── registry.yaml             # Agent definitions: model, tools, trust weights
│   ├── trust-weights.jsonl       # Behavioral history
│   └── prompts/                  # Versioned role prompts
├── pipelines/
│   ├── crack-resolution/
│   ├── opening-extension/
│   ├── extraction/               # Commercial extraction configs
│   ├── surveillance/
│   └── rendering/                # Writer + validator
├── universe-private/             # Embargoed commercial data (same schema as plyknot/universe + embargo block)
│   ├── couplings/
│   ├── chains/
│   ├── entities/
│   └── events/
├── research-private/             # Factory state
│   ├── plans/                    # Per-crack research plans
│   ├── common-ground-private/
│   ├── failure-graph/
│   └── meta-review/              # Textual-gradient history
├── wetlab/
│   ├── partners.yaml             # CRO/cloud-lab registry
│   ├── protocols/
│   └── intake/
├── rendering/
│   ├── templates/                # Preprint, audit-report, alert
│   ├── validator/                # No-new-claims checker
│   └── style/
├── schemas/                      # JSON schemas (embargo, delta, hypothesis)
├── scripts/                      # Embargo promotion, D1 rebuild, migration
└── .github/workflows/            # Daily embargo promotion, schema validation, D1 rebuild
```

## Cloudflare infrastructure

| Resource | Details |
|----------|---------|
| Worker | `plyknot-hub-com` at `hub.plyknot.com` |
| D1 | `plyknot-hub-com-prod` (`9929f003-c413-4056-a425-397256443f2a`) |
| Workers AI | Bound for embedding search + grounding |
| Auth | GitHub OAuth, requires `plyknot` org membership |

## Build commands

**Hub dev:** `cd hub && npm run dev` (localhost:8791)

**Hub deploy:** `cd hub && npm run deploy`

**Hub D1 init:** `cd hub && npm run db:init-remote`

## Key principles

- All endpoints require authentication (org membership)
- PRs target `plyknot-com` repo, not `plyknot/universe`
- Embargoed entries have date-gated automatic promotion to public universe
- Factory output unit is a convergence delta, not a document
- Agents are registry entities subject to the same convergence rules as measurements
- The no-new-claims validator is the architectural guarantee against hallucinated papers
