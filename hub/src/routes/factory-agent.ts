/**
 * Agent chat endpoint — POST /v1/agent/chat
 *
 * SSE streaming. Sends user message to Claude with plyknot MCP tool definitions,
 * streams response back. Handles tool_use blocks by dispatching to D1 query functions.
 * Persists all messages to agent_messages table.
 *
 * Each conversation is a supervisor_run with mode='interactive'.
 */

import type { AuthContext } from '../auth/middleware.js';
import { emitEvent } from './stream.js';

interface AgentEnv {
  DB: D1Database;
  ANTHROPIC_API_KEY?: string;
}

interface AgentChatBody {
  message: string;
  run_id?: string;
  project_id?: string;
  model?: string;
}

// ── Tool definitions ──────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'find_cracks',
    description: 'Find convergence cracks (σ-tensions) in the universe. Returns cracks sorted by σ descending.',
    input_schema: { type: 'object', properties: { min_sigma: { type: 'number', description: 'Minimum σ-tension threshold (default 2.0)' } } },
  },
  {
    name: 'get_stats',
    description: 'Get universe statistics: chain count, coupling count, entity count, crack count.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_heatmap',
    description: 'Get the convergence heatmap: coupling counts and convergence status at each inference×complexity position.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'list_chains',
    description: 'List all inference chains with their step count and crack count.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'query_couplings',
    description: 'Query couplings, optionally filtered by entity name.',
    input_schema: { type: 'object', properties: { entity: { type: 'string', description: 'Filter by entity name' }, limit: { type: 'number' } } },
  },
  {
    name: 'search_vocabulary',
    description: 'Search the universe vocabulary (entities, instruments, properties) by text query.',
    input_schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
  },
  {
    name: 'list_projects',
    description: 'List all factory projects with their status, kind, and budget.',
    input_schema: { type: 'object', properties: { status: { type: 'string', enum: ['active', 'paused', 'completed', 'blocked'] } } },
  },
  {
    name: 'get_project',
    description: 'Get details of a specific factory project by ID.',
    input_schema: { type: 'object', properties: { project_id: { type: 'string' } }, required: ['project_id'] },
  },
  {
    name: 'propose_hypothesis',
    description: 'Propose a new hypothesis for a crack. Returns the created hypothesis.',
    input_schema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        crack_id: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        predicted_outcome: { type: 'string' },
      },
      required: ['project_id', 'crack_id', 'name', 'description'],
    },
  },
];

// ── Tool execution ────────────────────────────────────────────────────

async function executeTool(
  name: string,
  input: Record<string, unknown>,
  db: D1Database,
): Promise<{ result: unknown; error?: boolean }> {
  try {
    switch (name) {
      case 'find_cracks': {
        const minSigma = (input.min_sigma as number) ?? 2.0;
        const rows = await db.prepare(
          `SELECT c.*, ch.name as chain_name FROM cracks c
           LEFT JOIN chains ch ON c.chain_id = ch.id
           WHERE c.sigma_tension >= ?
           ORDER BY c.sigma_tension DESC LIMIT 20`
        ).bind(minSigma).all();
        return { result: rows.results };
      }
      case 'get_stats': {
        const [chains, couplings, entities, cracks] = await Promise.all([
          db.prepare('SELECT COUNT(*) as n FROM chains').first<{ n: number }>(),
          db.prepare('SELECT COUNT(*) as n FROM couplings').first<{ n: number }>(),
          db.prepare('SELECT COUNT(DISTINCT entity) as n FROM vocabulary').first<{ n: number }>(),
          db.prepare('SELECT COUNT(*) as n FROM cracks').first<{ n: number }>(),
        ]);
        return { result: { chains: chains?.n ?? 0, couplings: couplings?.n ?? 0, entities: entities?.n ?? 0, cracks: cracks?.n ?? 0 } };
      }
      case 'get_heatmap': {
        const rows = await db.prepare(
          `SELECT inference_level, complexity_level, COUNT(*) as total,
                  SUM(CASE WHEN convergence = 'converged' THEN 1 ELSE 0 END) as converged,
                  SUM(CASE WHEN convergence = 'tension' THEN 1 ELSE 0 END) as tension,
                  SUM(CASE WHEN convergence = 'divergent' THEN 1 ELSE 0 END) as divergent
           FROM couplings GROUP BY inference_level, complexity_level`
        ).all();
        return { result: rows.results };
      }
      case 'list_chains': {
        const rows = await db.prepare(
          `SELECT ch.*, COUNT(cr.id) as crack_count
           FROM chains ch LEFT JOIN cracks cr ON cr.chain_id = ch.id
           GROUP BY ch.id ORDER BY ch.name`
        ).all();
        return { result: rows.results };
      }
      case 'query_couplings': {
        const entity = input.entity as string | undefined;
        const limit = (input.limit as number) ?? 20;
        const q = entity
          ? db.prepare(`SELECT * FROM couplings WHERE entity LIKE ? LIMIT ?`).bind(`%${entity}%`, limit)
          : db.prepare(`SELECT * FROM couplings ORDER BY id DESC LIMIT ?`).bind(limit);
        const rows = await q.all();
        return { result: rows.results };
      }
      case 'search_vocabulary': {
        const query = input.query as string;
        const rows = await db.prepare(
          `SELECT * FROM vocabulary WHERE entity LIKE ? OR label LIKE ? LIMIT 20`
        ).bind(`%${query}%`, `%${query}%`).all();
        return { result: rows.results };
      }
      case 'list_projects': {
        const status = input.status as string | undefined;
        const q = status
          ? db.prepare(`SELECT * FROM work_containers WHERE status = ? ORDER BY updated_at DESC`).bind(status)
          : db.prepare(`SELECT * FROM work_containers ORDER BY updated_at DESC LIMIT 50`);
        const rows = await q.all();
        return { result: rows.results };
      }
      case 'get_project': {
        const row = await db.prepare('SELECT * FROM work_containers WHERE id = ?').bind(input.project_id).first();
        return row ? { result: row } : { result: 'Project not found', error: true };
      }
      case 'propose_hypothesis': {
        const id = `hyp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        await db.prepare(
          `INSERT INTO hypotheses (id, project_id, crack_id, name, description, predicted_outcome, status, elo, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 'proposed', 1200, datetime('now'))`
        ).bind(id, input.project_id, input.crack_id, input.name, input.description, input.predicted_outcome ?? null).run();
        return { result: { id, name: input.name, status: 'proposed', elo: 1200 } };
      }
      default:
        return { result: `Unknown tool: ${name}`, error: true };
    }
  } catch (err) {
    return { result: `Tool error: ${(err as Error).message}`, error: true };
  }
}

// ── SSE helpers ───────────────────────────────────────────────────────

function sseFrame(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

// ── Main handler ──────────────────────────────────────────────────────

export async function handleAgentChat(
  request: Request,
  env: AgentEnv,
  auth: AuthContext,
): Promise<Response> {
  if (!auth.userId) return new Response(JSON.stringify({ error: 'Auth required' }), { status: 401, headers: { 'content-type': 'application/json' } });

  const corsHeaders = { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, content-type' };

  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) return new Response(JSON.stringify({ error: 'Anthropic API key not configured' }), { status: 500, headers: corsHeaders });

  let body: AgentChatBody;
  try {
    body = (await request.json()) as AgentChatBody;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: corsHeaders });
  }
  if (!body.message?.trim()) return new Response(JSON.stringify({ error: 'message is required' }), { status: 400, headers: corsHeaders });

  const model = body.model ?? 'claude-sonnet-4-20250514';
  const maxInnerTurns = 5; // max tool-use loops per request

  // Get or create run
  let runId = body.run_id;
  if (!runId) {
    runId = `agent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await env.DB.prepare(
      `INSERT INTO supervisor_runs (id, project_id, crack_id, status, mode, current_round, total_cost_usd, budget_usd, started_at)
       VALUES (?, ?, '', 'running', 'interactive', 0, 0, 2.0, datetime('now'))`
    ).bind(runId, body.project_id ?? '').run();
  }

  // Load conversation history
  const historyRows = await env.DB.prepare(
    `SELECT role, content, tool_name, tool_input, tool_result FROM agent_messages
     WHERE run_id = ? ORDER BY created_at ASC LIMIT 60`
  ).bind(runId).all();

  // Build messages array for Anthropic
  const messages: Array<{ role: string; content: unknown }> = [];
  for (const row of historyRows.results as Record<string, unknown>[]) {
    if (row.role === 'user') {
      messages.push({ role: 'user', content: row.content as string });
    } else if (row.role === 'assistant') {
      // Reconstruct assistant message with tool_use blocks if present
      const blocks: unknown[] = [];
      if (row.content) blocks.push({ type: 'text', text: row.content });
      if (row.tool_name && row.tool_input) {
        blocks.push({
          type: 'tool_use',
          id: `tool-${Math.random().toString(36).slice(2, 10)}`,
          name: row.tool_name,
          input: JSON.parse(row.tool_input as string),
        });
      }
      messages.push({ role: 'assistant', content: blocks.length === 1 && typeof blocks[0] === 'string' ? blocks[0] : blocks });
    } else if (row.role === 'tool') {
      messages.push({
        role: 'user',
        content: [{
          type: 'tool_result',
          tool_use_id: `tool-${Math.random().toString(36).slice(2, 10)}`,
          content: row.tool_result as string,
        }],
      });
    }
  }

  // Add the new user message
  messages.push({ role: 'user', content: body.message });

  // Persist user message
  await env.DB.prepare(
    `INSERT INTO agent_messages (id, run_id, role, content, turn, created_at)
     VALUES (?, ?, 'user', ?, 0, datetime('now'))`
  ).bind(`msg-${Date.now()}-u`, runId, body.message).run();

  // Build system prompt
  let systemPrompt = `You are a plyknot research agent. You have access to the plyknot universe — a convergence map of scientific measurements across domains — and the factory that runs research projects on top of it.

Use the available tools to answer questions, find cracks (σ-tensions between measurements), query couplings, search entities, and manage projects. Be precise and cite data from the tools.`;

  if (body.project_id) {
    const project = await env.DB.prepare('SELECT * FROM work_containers WHERE id = ?').bind(body.project_id).first();
    if (project) {
      systemPrompt += `\n\nYou are currently scoped to project "${project.name}" (${project.kind}, ${project.status}). ${project.description ?? ''}`;
    }
  }

  // ── SSE streaming response ──────────────────────────────────────────
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  let closed = false;
  function write(data: string) {
    if (closed) return;
    writer.write(encoder.encode(data)).catch(() => { closed = true; });
  }

  // Run the conversation loop in the background
  (async () => {
    let turn = 0;
    let currentMessages = [...messages];

    try {
      while (turn < maxInnerTurns) {
        // Call Anthropic streaming API
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model,
            max_tokens: 4096,
            system: systemPrompt,
            messages: currentMessages,
            tools: TOOLS,
            stream: true,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          write(sseFrame({ type: 'error', message: `Anthropic ${response.status}: ${errText.slice(0, 200)}` }));
          break;
        }

        // Parse SSE stream from Anthropic
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let assistantText = '';
        const toolUseBlocks: Array<{ id: string; name: string; input: string }> = [];
        let currentToolId = '';
        let currentToolName = '';
        let currentToolInput = '';
        let stopReason = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            if (!data) continue;

            let event: Record<string, unknown>;
            try { event = JSON.parse(data); } catch { continue; }

            const eventType = event.type as string;

            if (eventType === 'content_block_start') {
              const block = event.content_block as Record<string, unknown>;
              if (block?.type === 'tool_use') {
                currentToolId = block.id as string;
                currentToolName = block.name as string;
                currentToolInput = '';
              }
            } else if (eventType === 'content_block_delta') {
              const delta = event.delta as Record<string, unknown>;
              if (delta?.type === 'text_delta') {
                const text = delta.text as string;
                assistantText += text;
                write(sseFrame({ type: 'content_delta', delta: text }));
              } else if (delta?.type === 'input_json_delta') {
                currentToolInput += delta.partial_json as string;
              }
            } else if (eventType === 'content_block_stop') {
              if (currentToolId) {
                toolUseBlocks.push({ id: currentToolId, name: currentToolName, input: currentToolInput });
                currentToolId = '';
              }
            } else if (eventType === 'message_delta') {
              const delta = event.delta as Record<string, unknown>;
              stopReason = (delta?.stop_reason as string) ?? '';
            }
          }
        }
        reader.releaseLock();

        // If no tool calls, we're done
        if (toolUseBlocks.length === 0 || stopReason === 'end_turn') {
          // Persist assistant message
          await env.DB.prepare(
            `INSERT INTO agent_messages (id, run_id, role, content, turn, created_at)
             VALUES (?, ?, 'assistant', ?, ?, datetime('now'))`
          ).bind(`msg-${Date.now()}-a`, runId, assistantText, turn).run();

          write(sseFrame({ type: 'done' }));
          break;
        }

        // Execute tool calls
        // Build assistant content blocks for the conversation
        const assistantBlocks: unknown[] = [];
        if (assistantText) assistantBlocks.push({ type: 'text', text: assistantText });

        const toolResultBlocks: Array<{ type: string; tool_use_id: string; content: string }> = [];

        for (const tool of toolUseBlocks) {
          let parsedInput: Record<string, unknown> = {};
          try { parsedInput = JSON.parse(tool.input || '{}'); } catch { /* empty */ }

          assistantBlocks.push({
            type: 'tool_use',
            id: tool.id,
            name: tool.name,
            input: parsedInput,
          });

          // Emit tool_executing
          write(sseFrame({ type: 'tool_executing', name: tool.name, input: parsedInput }));

          const startMs = Date.now();
          const { result, error } = await executeTool(tool.name, parsedInput, env.DB);
          const durationMs = Date.now() - startMs;

          const resultStr = typeof result === 'string' ? result : JSON.stringify(result);

          // Emit tool_result
          write(sseFrame({ type: 'tool_result', name: tool.name, result, duration_ms: durationMs, error: !!error }));

          toolResultBlocks.push({
            type: 'tool_result',
            tool_use_id: tool.id,
            content: resultStr,
          });

          // Persist tool messages
          await env.DB.prepare(
            `INSERT INTO agent_messages (id, run_id, role, content, tool_name, tool_input, tool_result, tool_duration_ms, turn, created_at)
             VALUES (?, ?, 'assistant', ?, ?, ?, NULL, NULL, ?, datetime('now'))`
          ).bind(`msg-${Date.now()}-at`, runId, assistantText || null, tool.name, JSON.stringify(parsedInput), turn).run();

          await env.DB.prepare(
            `INSERT INTO agent_messages (id, run_id, role, tool_name, tool_result, tool_duration_ms, turn, created_at)
             VALUES (?, ?, 'tool', ?, ?, ?, ?, datetime('now'))`
          ).bind(`msg-${Date.now()}-t`, runId, tool.name, resultStr, durationMs, turn).run();
        }

        // Add assistant + tool results to conversation for next turn
        currentMessages.push({ role: 'assistant', content: assistantBlocks });
        currentMessages.push({ role: 'user', content: toolResultBlocks });

        // Reset for next turn
        assistantText = '';
        turn++;
      }
    } catch (err) {
      write(sseFrame({ type: 'error', message: (err as Error).message }));
    } finally {
      write('data: [DONE]\n\n');
      writer.close().catch(() => {});

      // Emit audit event
      await emitEvent(env.DB, 'agent-chat', `Agent conversation turn in run ${runId}`, {
        projectId: body.project_id,
        userId: auth.userId ?? undefined,
      }).catch(() => {});
    }
  })();

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    },
  });
}

// ── Get messages for a run ────────────────────────────────────────────

export async function handleGetRunMessages(
  db: D1Database,
  auth: AuthContext,
  runId: string,
): Promise<Response> {
  if (!auth.userId) return new Response(JSON.stringify({ error: 'Auth required' }), { status: 401, headers: { 'content-type': 'application/json' } });

  const rows = await db.prepare(
    `SELECT id, role, content, tool_name, tool_input, tool_result, tool_duration_ms, turn, created_at
     FROM agent_messages WHERE run_id = ? ORDER BY created_at ASC`
  ).bind(runId).all();

  return new Response(JSON.stringify({ messages: rows.results }), {
    headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
  });
}
