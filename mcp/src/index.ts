#!/usr/bin/env node
/**
 * @plyknot-com/mcp — Commercial MCP server entry point.
 * Combines public tools from @plyknot/mcp with factory tools.
 *
 * Usage:
 *   claude mcp add plyknot-com -- npx tsx plyknot-com/mcp/src/index.ts \
 *     --remote https://hub.plyknot.org \
 *     --factory https://hub.plyknot.com \
 *     --key <api_key> \
 *     --data ./universe/data
 */

import { resolve } from 'node:path';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createLocalRepository, type PlyknotRepository } from '@plyknot/mcp/src/local-registry.js';
import { createRemoteRepository } from '@plyknot/mcp/src/remote-registry.js';
import { TOOLS } from '@plyknot/mcp/src/tools.js';
import type { WriteContext } from '@plyknot/mcp/src/shared.js';
import { FACTORY_TOOLS } from './factory-tools.js';

// ── Parse CLI args ──────────────────────────────────────────────────────────

interface Args {
  mode: 'local' | 'remote';
  dataDir: string;
  remoteUrl: string;
  factoryUrl?: string;
  apiKey?: string;
}

function parseArgs(argv: string[]): Args {
  let dataDir = './universe/data';
  let remoteUrl = '';
  let factoryUrl: string | undefined;
  let apiKey: string | undefined;

  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--data' && argv[i + 1]) { dataDir = argv[++i]; }
    else if (argv[i] === '--remote' && argv[i + 1]) { remoteUrl = argv[++i]; }
    else if (argv[i] === '--factory' && argv[i + 1]) { factoryUrl = argv[++i]; }
    else if (argv[i] === '--key' && argv[i + 1]) { apiKey = argv[++i]; }
  }

  return {
    mode: remoteUrl ? 'remote' : 'local',
    dataDir: resolve(dataDir),
    remoteUrl,
    factoryUrl,
    apiKey,
  };
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv);
  let repo: PlyknotRepository;

  if (args.mode === 'remote') {
    console.error(`[plyknot-com-mcp] Remote mode: ${args.remoteUrl}`);
    repo = await createRemoteRepository(args.remoteUrl, args.apiKey);
  } else {
    console.error(`[plyknot-com-mcp] Local mode: ${args.dataDir}`);
    repo = createLocalRepository(args.dataDir);
  }

  const writeCtx: WriteContext = {
    mode: args.mode,
    hubUrl: args.remoteUrl || undefined,
    factoryHubUrl: args.factoryUrl,
    apiKey: args.apiKey,
  };

  // Merge public + factory tools
  const ALL_TOOLS = [...TOOLS, ...FACTORY_TOOLS];

  const stats = repo.getStats();
  const factoryStatus = args.factoryUrl ? ` | factory: ${args.factoryUrl}` : ' | WARNING: no --factory';
  console.error(
    `[plyknot-com-mcp] Ready: ${stats.chainCount} chains, ${stats.couplingCount} couplings, ${stats.crackCount} cracks (${ALL_TOOLS.length} tools${factoryStatus})`,
  );

  // Fetch agent prompts from factory hub
  let agentPrompts: Array<{ name: string; description: string; content: string }> = [];
  if (args.factoryUrl && args.apiKey) {
    try {
      const resp = await fetch(`${args.factoryUrl}/v1/factory/prompts`, {
        headers: { authorization: `Bearer ${args.apiKey}`, accept: 'application/json' },
      });
      if (resp.ok) {
        const data = (await resp.json()) as { prompts: Array<{ name: string; description: string }> };
        const fetches = data.prompts.map(async (p) => {
          const r = await fetch(`${args.factoryUrl}/v1/factory/prompts/${p.name}`, {
            headers: { authorization: `Bearer ${args.apiKey!}` },
          });
          return r.ok ? (r.json() as Promise<{ name: string; description: string; content: string }>) : null;
        });
        agentPrompts = (await Promise.all(fetches)).filter((p): p is NonNullable<typeof p> => p !== null);
        console.error(`[plyknot-com-mcp] Loaded ${agentPrompts.length} agent prompts: ${agentPrompts.map((p) => p.name).join(', ')}`);
      }
    } catch {
      console.error('[plyknot-com-mcp] Could not fetch agent prompts');
    }
  }

  const server = new Server(
    { name: 'plyknot-com', version: '0.1.0' },
    { capabilities: { tools: {}, prompts: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: ALL_TOOLS.map(({ name, description, inputSchema }) => ({
      name,
      description,
      inputSchema,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const tool = ALL_TOOLS.find((t) => t.name === name);
    if (!tool) {
      return {
        isError: true,
        content: [{ type: 'text' as const, text: `Tool not found: ${name}` }],
      };
    }
    try {
      const result = await tool.handler(args ?? {}, repo, writeCtx);
      return {
        content: [
          { type: 'text' as const, text: JSON.stringify(result, null, 2) },
        ],
      };
    } catch (e) {
      return {
        isError: true,
        content: [
          { type: 'text' as const, text: (e as Error).message },
        ],
      };
    }
  });

  // ── MCP Prompts (agent roles) ──────────────────────────────────────────
  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: agentPrompts.map(({ name, description }) => ({
      name,
      description,
      arguments: [
        { name: 'crack_id', description: 'The crack or opening to work on', required: false },
      ],
    })),
  }));

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const prompt = agentPrompts.find((p) => p.name === request.params.name);
    if (!prompt) {
      throw new Error(`Prompt not found: ${request.params.name}. Available: ${agentPrompts.map((p) => p.name).join(', ')}`);
    }
    const crackId = request.params.arguments?.crack_id;
    const crackContext = crackId ? `\n\nYour target crack: ${crackId}` : '';
    return {
      messages: [
        {
          role: 'user' as const,
          content: { type: 'text' as const, text: prompt.content + crackContext },
        },
      ],
    };
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[plyknot-com-mcp] Server running on stdio');
}

main().catch((err) => {
  console.error('[plyknot-com-mcp] Fatal:', err);
  process.exit(1);
});
