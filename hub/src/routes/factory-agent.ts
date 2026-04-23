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
import { TOOL_DEFINITIONS } from '../tool-definitions.js';

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

// Tool definitions from shared source, mapped to Anthropic format
const TOOLS = TOOL_DEFINITIONS.map((t) => ({
  name: t.name,
  description: t.description,
  input_schema: t.inputSchema,
}));

// ── Tool execution ────────────────────────────────────────────────────

async function executeTool(
  name: string,
  input: Record<string, unknown>,
  db: D1Database,
): Promise<{ result: unknown; error?: boolean }> {
  try {
    switch (name) {
      // --- Tables that exist in remote D1 ---
      // chains: id, name, entity, data, step_count, crack_count
      // couplings: id, entity_a, entity_b, property, value, method, sigma, source, provenance, created_at
      // hypotheses: id, crack_id, proposer_id, parent_hypothesis_id, target_entity, target_property,
      //             proposed_mechanism, required_measurements, predicted_convergence_delta, depends,
      //             elo_rating, tournament_matches, status, created_at, project_id
      // projects: id, name, description, crack_ids, entity_scope, status, budget_usd, spent_usd, owner_id, kind, scope, schedule
      // pipeline_projects: id, title, category_slug, kind, status, description, ...
      // NOTE: cracks table does NOT exist. vocabulary table does NOT exist.

      case 'find_cracks': {
        // No cracks table — derive from chains.crack_count
        const rows = await db.prepare(
          `SELECT * FROM chains WHERE crack_count > 0 ORDER BY crack_count DESC LIMIT 20`
        ).all();
        return { result: rows.results };
      }
      case 'get_stats': {
        const [chains, couplings, entities] = await Promise.all([
          db.prepare('SELECT COUNT(*) as n FROM chains').first<{ n: number }>(),
          db.prepare('SELECT COUNT(*) as n FROM couplings').first<{ n: number }>(),
          db.prepare('SELECT COUNT(DISTINCT entity_a) + COUNT(DISTINCT entity_b) as n FROM couplings').first<{ n: number }>(),
        ]);
        const crackChains = await db.prepare('SELECT SUM(crack_count) as n FROM chains').first<{ n: number }>();
        return { result: { chains: chains?.n ?? 0, couplings: couplings?.n ?? 0, entities: entities?.n ?? 0, cracks: crackChains?.n ?? 0 } };
      }
      case 'get_heatmap': {
        // couplings table has no inference_level/complexity_level columns
        // Return raw coupling counts grouped by method as a proxy
        const rows = await db.prepare(
          `SELECT method, COUNT(*) as total FROM couplings GROUP BY method ORDER BY total DESC`
        ).all();
        return { result: { note: 'Heatmap not available — couplings lack inference/complexity columns. Showing method distribution.', data: rows.results } };
      }
      case 'list_chains': {
        const rows = await db.prepare(
          `SELECT * FROM chains ORDER BY name`
        ).all();
        return { result: rows.results };
      }
      case 'query_couplings': {
        const entity = input.entity as string | undefined;
        const limit = (input.limit as number) ?? 20;
        const q = entity
          ? db.prepare(`SELECT * FROM couplings WHERE entity_a LIKE ? OR entity_b LIKE ? ORDER BY created_at DESC LIMIT ?`).bind(`%${entity}%`, `%${entity}%`, limit)
          : db.prepare(`SELECT * FROM couplings ORDER BY created_at DESC LIMIT ?`).bind(limit);
        const rows = await q.all();
        return { result: rows.results };
      }
      case 'search_vocabulary': {
        // No vocabulary table — search entity names in couplings instead
        const query = input.query as string;
        const rows = await db.prepare(
          `SELECT DISTINCT entity_a as entity FROM couplings WHERE entity_a LIKE ?
           UNION
           SELECT DISTINCT entity_b as entity FROM couplings WHERE entity_b LIKE ?
           LIMIT 20`
        ).bind(`%${query}%`, `%${query}%`).all();
        return { result: rows.results };
      }
      case 'list_projects': {
        const status = input.status as string | undefined;
        // Query both tables, prefer pipeline_projects but fall back to projects
        const wcQ = status
          ? db.prepare(`SELECT id, title as name, kind, status, description, budget_usd, spent_usd, updated_at FROM pipeline_projects WHERE status = ? ORDER BY updated_at DESC`).bind(status)
          : db.prepare(`SELECT id, title as name, kind, status, description, budget_usd, spent_usd, updated_at FROM pipeline_projects ORDER BY updated_at DESC LIMIT 50`);
        const wcRows = await wcQ.all();
        if (wcRows.results.length > 0) return { result: wcRows.results };
        // Fall back to old projects table
        const pQ = status
          ? db.prepare(`SELECT * FROM projects WHERE status = ? ORDER BY updated_at DESC`).bind(status)
          : db.prepare(`SELECT * FROM projects ORDER BY updated_at DESC LIMIT 50`);
        const pRows = await pQ.all();
        return { result: pRows.results };
      }
      case 'get_project': {
        // Try pipeline_projects first, then projects
        const row = await db.prepare('SELECT id, title as name, kind, status, description, budget_usd, spent_usd FROM pipeline_projects WHERE id = ?').bind(input.project_id).first();
        if (row) return { result: row };
        const row2 = await db.prepare('SELECT * FROM projects WHERE id = ?').bind(input.project_id).first();
        return row2 ? { result: row2 } : { result: 'Project not found', error: true };
      }
      case 'propose_hypothesis': {
        const id = `hyp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        await db.prepare(
          `INSERT INTO hypotheses (id, project_id, crack_id, proposer_id, target_entity, target_property, proposed_mechanism, required_measurements, status, elo_rating, created_at)
           VALUES (?, ?, ?, 'agent', ?, ?, ?, ?, 'proposed', 1200, datetime('now'))`
        ).bind(
          id,
          input.project_id,
          input.crack_id,
          input.name ?? 'unknown',
          input.predicted_outcome ?? 'unknown',
          input.description ?? 'No mechanism specified',
          input.required_measurements ?? '[]',
        ).run();
        return { result: { id, status: 'proposed', elo_rating: 1200 } };
      }

      // --- Missing read tools (return helpful messages for tools that need local data) ---
      case 'get_chain': {
        const chainName = input.name as string;
        const row = await db.prepare('SELECT * FROM chains WHERE name = ?').bind(chainName).first();
        if (!row) return { result: `Chain "${chainName}" not found`, error: true };
        return { result: row };
      }
      case 'get_collisions':
        return { result: { note: 'Collision detection requires marker passing computation. Use hub.plyknot.org MCP server for full computation.' } };
      case 'get_level_status':
        return { result: { note: 'Level derivation status requires simulator. Use hub.plyknot.org MCP server for full computation.' } };
      case 'get_convergence_map': {
        const chainsForMap = await db.prepare('SELECT * FROM chains ORDER BY name').all();
        return { result: { chains: chainsForMap.results } };
      }
      case 'get_discovery_report':
        return { result: { note: 'Discovery report requires marker passing + structural holes computation. Use hub.plyknot.org MCP server.' } };
      case 'get_entity_history': {
        const entityName = input.entity as string;
        const couplingRows = await db.prepare(
          `SELECT * FROM couplings WHERE entity_a LIKE ? OR entity_b LIKE ? ORDER BY created_at DESC LIMIT 50`
        ).bind(`%${entityName}%`, `%${entityName}%`).all();
        return { result: { entity: entityName, couplings: couplingRows.results, total: couplingRows.results.length } };
      }
      case 'get_echo_chambers':
        return { result: { note: 'Echo-chamber detection requires hub.plyknot.org API. Not available via D1 directly.' } };
      case 'get_measurement_prediction_ratio':
        return { result: { note: 'Measurement/prediction ratio requires hub.plyknot.org API.' } };
      case 'get_marker_passing':
        return { result: { note: 'Marker passing requires hub.plyknot.org API.' } };
      case 'get_speciation':
        return { result: { note: 'Speciation detection requires hub.plyknot.org API with GMM computation.' } };

      // --- Compute tools (need simulator, not available in Worker) ---
      case 'run_simulator':
      case 'run_marker_passing':
      case 'derive_level':
      case 'diff_convergence':
        return { result: { note: `Compute tool "${name}" requires the plyknot simulator. Run via MCP server (npx tsx mcp/src/index.ts --data ./universe/data).` } };

      // --- Write tools ---
      case 'add_coupling':
      case 'add_measurement':
        return { result: { note: `Write tool "${name}" creates PRs via hub.plyknot.org. Use the MCP server in remote mode with an API key.` } };

      // --- Factory tools ---
      case 'create_project': {
        const projId = `proj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        await db.prepare(
          `INSERT INTO pipeline_projects (id, title, category_slug, kind, status, description, budget_usd, crack_ids, entity_scope)
           VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?)`
        ).bind(
          projId,
          input.title,
          input.category_slug ?? 'other',
          input.kind,
          input.description ?? '',
          input.budget_usd ?? 0,
          JSON.stringify(input.crack_ids ?? []),
          JSON.stringify(input.entity_scope ?? []),
        ).run();
        return { result: { id: projId, title: input.title, kind: input.kind, status: 'active' } };
      }
      case 'update_project': {
        const updates: string[] = [];
        const binds: unknown[] = [];
        if (input.status) { updates.push('status = ?'); binds.push(input.status); }
        if (input.description) { updates.push('description = ?'); binds.push(input.description); }
        if (input.budget_usd !== undefined) { updates.push('budget_usd = ?'); binds.push(input.budget_usd); }
        if (updates.length === 0) return { result: 'Nothing to update', error: true };
        updates.push("updated_at = datetime('now')");
        binds.push(input.project_id);
        await db.prepare(`UPDATE pipeline_projects SET ${updates.join(', ')} WHERE id = ?`).bind(...binds).run();
        return { result: { id: input.project_id, updated: updates.length - 1 } };
      }
      case 'list_attention_items': {
        let q = 'SELECT * FROM attention_items';
        const conditions: string[] = [];
        const binds: unknown[] = [];
        if (input.status) { conditions.push('status = ?'); binds.push(input.status); }
        if (input.type) { conditions.push('type = ?'); binds.push(input.type); }
        if (input.project_id) { conditions.push('project_id = ?'); binds.push(input.project_id); }
        if (conditions.length > 0) q += ' WHERE ' + conditions.join(' AND ');
        q += ' ORDER BY created_at DESC LIMIT 50';
        const attRows = await db.prepare(q).bind(...binds).all();
        return { result: attRows.results };
      }
      case 'resolve_attention_item': {
        await db.prepare(
          `UPDATE attention_items SET status = 'resolved', response = ?, resolved_at = datetime('now') WHERE id = ?`
        ).bind(JSON.stringify(input.response ?? {}), input.item_id).run();
        return { result: { id: input.item_id, status: 'resolved' } };
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
  const corsHeaders = { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, content-type' };

  try {
  if (!auth.userId) return new Response(JSON.stringify({ error: 'Auth required' }), { status: 401, headers: corsHeaders });

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

    // Ensure a project exists for agent chats (sentinel row)
    // Remote D1 still has the old `projects` table (supervisor_runs FK targets it)
    const agentContainerId = body.project_id || '__agent-chats__';
    if (!body.project_id) {
      await env.DB.prepare(
        `INSERT OR IGNORE INTO projects (id, name, description, crack_ids, entity_scope, status, budget_usd, spent_usd, owner_id, kind)
         VALUES ('__agent-chats__', 'Agent chats', 'Sentinel for interactive agent conversations', '[]', '[]', 'active', 0, 0, 'system', 'investigation')`
      ).run();
    }

    try {
      await env.DB.prepare(
        `INSERT INTO supervisor_runs (id, project_id, crack_id, status, mode, config, current_round, total_cost_usd, budget_usd, started_at)
         VALUES (?, ?, '', 'running', 'interactive', '{}', 0, 0, 2.0, datetime('now'))`
      ).bind(runId, agentContainerId).run();
    } catch (e) {
      return new Response(JSON.stringify({ error: `Failed to create run: ${(e as Error).message}` }), { status: 500, headers: corsHeaders });
    }
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
    const project = await env.DB.prepare('SELECT * FROM pipeline_projects WHERE id = ?').bind(body.project_id).first();
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
  } catch (e) {
    return new Response(JSON.stringify({ error: `Agent handler error: ${(e as Error).message}` }), { status: 500, headers: corsHeaders });
  }
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
