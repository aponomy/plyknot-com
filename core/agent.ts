/**
 * Agent runtime — dispatches tasks to the orchestrator gateway.
 *
 * The gateway routes to the appropriate container (claude-sim, codex-sim,
 * gemini-sim) which has vendor auth already injected. The Supervisor never
 * touches API keys.
 *
 * Fallback: if GATEWAY_URL is not set, falls back to direct vendor API calls
 * for local development (requires vendor API keys in env).
 */

import type { AgentConfig, ModelVendor } from './types.js';

export interface AgentRequest {
  config: AgentConfig;
  /** User message describing the task */
  message: string;
  /** Optional context from meta-review */
  meta_review_context?: string;
}

export interface AgentResponse {
  content: string;
  /** Structured data extracted from the response */
  data?: Record<string, unknown>;
  /** Tokens used */
  input_tokens: number;
  output_tokens: number;
  /** Estimated cost in USD */
  cost_usd: number;
  /** Which model actually ran */
  model: string;
  vendor: ModelVendor;
}

// ── Token pricing (per million tokens) ──────────────────────────────────

const PRICING: Record<string, { input: number; output: number }> = {
  'claude-opus-4-6':     { input: 15,    output: 75 },
  'claude-sonnet-4-6':   { input: 3,     output: 15 },
  'claude-haiku-4-5':    { input: 0.80,  output: 4 },
  'gpt-4o':              { input: 2.50,  output: 10 },
  'gpt-4o-mini':         { input: 0.15,  output: 0.60 },
  'o3':                  { input: 10,    output: 40 },
  'o4-mini':             { input: 1.10,  output: 4.40 },
  'gpt-4.1':             { input: 2,     output: 8 },
  'gpt-4.1-mini':        { input: 0.40,  output: 1.60 },
  'gemini-2.5-flash':    { input: 0.075, output: 0.30 },
  'gemini-2.5-pro':      { input: 1.25,  output: 10 },
};

function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const p = PRICING[model] ?? { input: 3, output: 15 };
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}

// ── Model → vendor mapping ──────────────────────────────────────────────

const MODEL_VENDOR: Record<string, string> = {
  'claude-opus-4-6': 'claude', 'claude-sonnet-4-6': 'claude', 'claude-haiku-4-5': 'claude',
  'gpt-4o': 'codex', 'gpt-4o-mini': 'codex', 'o3': 'codex', 'o4-mini': 'codex',
  'gpt-4.1': 'codex', 'gpt-4.1-mini': 'codex', 'gpt-4.1-nano': 'codex',
  'gemini-2.5-flash': 'gemini', 'gemini-2.5-pro': 'gemini',
  'gemini-2.0-flash': 'gemini', 'gemini-2.0-flash-lite': 'gemini',
};

// ── Gateway dispatch (primary) ──────────────────────────────────────────
// The orchestrator gateway at GATEWAY_URL manages containers with
// pre-injected auth. No API keys needed here.

const GATEWAY_URL = process.env.GATEWAY_URL; // e.g. http://plyknot-orchestrator:8080

async function callGateway(
  config: AgentConfig,
  systemPrompt: string,
  userMessage: string,
): Promise<AgentResponse> {
  if (!GATEWAY_URL) throw new Error('GATEWAY_URL not set');

  // The gateway's dispatch_task tool routes to the right container
  // based on model name. The container's CLI handles the actual LLM call.
  const command = JSON.stringify({
    system: systemPrompt,
    message: userMessage,
    model: config.model,
    max_tokens: config.max_tokens,
    temperature: config.temperature,
    role: config.role,
  });

  const requestBody = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'dispatch_task',
      arguments: {
        role: config.role,
        task_type: config.role === 'proposer' ? 'propose'
          : config.role === 'critic' ? 'critique'
          : config.role === 'planner' ? 'plan'
          : config.role === 'executor' ? 'execute'
          : 'archive',
        command,
        model: config.model,
      },
    },
  };

  const resp = await fetch(`${GATEWAY_URL}/messages/`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Gateway error ${resp.status}: ${err}`);
  }

  const data = await resp.json() as {
    result?: {
      content?: Array<{ type: string; text?: string }>;
    };
  };

  const text = data.result?.content
    ?.filter((c) => c.type === 'text')
    .map((c) => c.text)
    .join('') ?? '';

  // Estimate tokens from text length (gateway will report actuals via D1)
  const estInputTokens = Math.ceil(systemPrompt.length / 4) + Math.ceil(userMessage.length / 4);
  const estOutputTokens = Math.ceil(text.length / 4);

  return {
    content: text,
    data: tryParseJSON(text),
    input_tokens: estInputTokens,
    output_tokens: estOutputTokens,
    cost_usd: estimateCost(config.model, estInputTokens, estOutputTokens),
    model: config.model,
    vendor: config.vendor,
  };
}

// ── Direct vendor API calls (fallback for local dev) ────────────────────
// Only used when GATEWAY_URL is not set. Requires vendor API keys in env.

async function callClaude(
  config: AgentConfig,
  systemPrompt: string,
  userMessage: string,
): Promise<AgentResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('No GATEWAY_URL set and no ANTHROPIC_API_KEY for direct fallback');

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: config.max_tokens,
      temperature: config.temperature,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Claude API error ${resp.status}: ${err}`);
  }

  const data = await resp.json() as {
    content: Array<{ type: string; text?: string }>;
    usage: { input_tokens: number; output_tokens: number };
    model: string;
  };

  const text = data.content
    .filter((c) => c.type === 'text')
    .map((c) => c.text)
    .join('');

  return {
    content: text,
    data: tryParseJSON(text),
    input_tokens: data.usage.input_tokens,
    output_tokens: data.usage.output_tokens,
    cost_usd: estimateCost(config.model, data.usage.input_tokens, data.usage.output_tokens),
    model: data.model,
    vendor: 'claude',
  };
}

async function callOpenAI(
  config: AgentConfig,
  systemPrompt: string,
  userMessage: string,
): Promise<AgentResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('No GATEWAY_URL set and no OPENAI_API_KEY for direct fallback');

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: config.max_tokens,
      temperature: config.temperature,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`OpenAI API error ${resp.status}: ${err}`);
  }

  const data = await resp.json() as {
    choices: Array<{ message: { content: string } }>;
    usage: { prompt_tokens: number; completion_tokens: number };
    model: string;
  };

  const text = data.choices[0]?.message?.content ?? '';

  return {
    content: text,
    data: tryParseJSON(text),
    input_tokens: data.usage.prompt_tokens,
    output_tokens: data.usage.completion_tokens,
    cost_usd: estimateCost(config.model, data.usage.prompt_tokens, data.usage.completion_tokens),
    model: data.model,
    vendor: 'openai',
  };
}

async function callGemini(
  config: AgentConfig,
  systemPrompt: string,
  userMessage: string,
): Promise<AgentResponse> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error('No GATEWAY_URL set and no GOOGLE_API_KEY for direct fallback');

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userMessage }] }],
        generationConfig: {
          temperature: config.temperature,
          maxOutputTokens: config.max_tokens,
        },
      }),
    },
  );

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Gemini API error ${resp.status}: ${err}`);
  }

  const data = await resp.json() as {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
    usageMetadata?: { promptTokenCount: number; candidatesTokenCount: number };
  };

  const text = data.candidates?.[0]?.content?.parts
    ?.map((p) => p.text)
    .join('') ?? '';

  const inputTokens = data.usageMetadata?.promptTokenCount ?? 0;
  const outputTokens = data.usageMetadata?.candidatesTokenCount ?? 0;

  return {
    content: text,
    data: tryParseJSON(text),
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cost_usd: estimateCost(config.model, inputTokens, outputTokens),
    model: config.model,
    vendor: 'google',
  };
}

// ── Dispatch ────────────────────────────────────────────────────────────

const DIRECT_VENDORS: Record<ModelVendor, typeof callClaude> = {
  claude: callClaude,
  openai: callOpenAI,
  google: callGemini,
};

export async function runAgent(request: AgentRequest): Promise<AgentResponse> {
  const { config, message, meta_review_context } = request;

  let systemPrompt = config.system_prompt ?? `You are a ${config.role} agent in the plyknot research factory.`;

  if (meta_review_context) {
    systemPrompt += `\n\n## Meta-review context from previous rounds\n\n${meta_review_context}`;
  }

  systemPrompt += '\n\nRespond with valid JSON. Do not include markdown code fences.';

  // Primary: dispatch through the orchestrator gateway (containers handle auth)
  if (GATEWAY_URL) {
    return callGateway(config, systemPrompt, message);
  }

  // Fallback: direct vendor API calls (local dev only, needs API keys in env)
  const callFn = DIRECT_VENDORS[config.vendor];
  if (!callFn) throw new Error(`Unknown vendor: ${config.vendor}`);

  return callFn(config, systemPrompt, message);
}

// ── Helpers ─────────────────────────────────────────────────────────────

function tryParseJSON(text: string): Record<string, unknown> | undefined {
  try {
    let cleaned = text.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.split('\n').slice(1).join('\n');
      if (cleaned.endsWith('```')) {
        cleaned = cleaned.slice(0, -3).trim();
      }
    }
    return JSON.parse(cleaned);
  } catch {
    return undefined;
  }
}
