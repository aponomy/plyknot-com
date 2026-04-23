/**
 * Agent runtime — calls Claude, GPT, or Gemini with role prompts and tool definitions.
 * Each agent call is a single-turn: system prompt + user message → response.
 * The Supervisor handles multi-turn orchestration.
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
  'gemini-2.5-flash':    { input: 0.075, output: 0.30 },
  'gemini-2.5-pro':      { input: 1.25,  output: 10 },
};

function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const p = PRICING[model] ?? { input: 3, output: 15 }; // default to Sonnet pricing
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}

// ── API keys from environment ───────────────────────────────────────────

interface APIKeys {
  anthropic?: string;
  openai?: string;
  google?: string;
}

function getAPIKeys(): APIKeys {
  return {
    anthropic: process.env.ANTHROPIC_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    google: process.env.GOOGLE_API_KEY,
  };
}

// ── Claude API ──────────────────────────────────────────────────────────

async function callClaude(
  config: AgentConfig,
  systemPrompt: string,
  userMessage: string,
): Promise<AgentResponse> {
  const keys = getAPIKeys();
  if (!keys.anthropic) throw new Error('ANTHROPIC_API_KEY not set');

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': keys.anthropic,
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

// ── OpenAI API ──────────────────────────────────────────────────────────

async function callOpenAI(
  config: AgentConfig,
  systemPrompt: string,
  userMessage: string,
): Promise<AgentResponse> {
  const keys = getAPIKeys();
  if (!keys.openai) throw new Error('OPENAI_API_KEY not set');

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${keys.openai}`,
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

// ── Google Gemini API ───────────────────────────────────────────────────

async function callGemini(
  config: AgentConfig,
  systemPrompt: string,
  userMessage: string,
): Promise<AgentResponse> {
  const keys = getAPIKeys();
  if (!keys.google) throw new Error('GOOGLE_API_KEY not set');

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${keys.google}`,
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

const VENDORS: Record<ModelVendor, typeof callClaude> = {
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

  // Add output format instruction
  systemPrompt += '\n\nRespond with valid JSON. Do not include markdown code fences.';

  const callFn = VENDORS[config.vendor];
  if (!callFn) throw new Error(`Unknown vendor: ${config.vendor}`);

  return callFn(config, systemPrompt, message);
}

// ── Helpers ─────────────────────────────────────────────────────────────

function tryParseJSON(text: string): Record<string, unknown> | undefined {
  try {
    // Strip markdown code fences if present
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
