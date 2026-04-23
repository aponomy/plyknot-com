/**
 * Plyknot Hub Commercial — Cloudflare Worker entry point.
 *
 * hub.plyknot.com — the commercial factory research API.
 * D1-backed, embeddings via Workers AI, GitHub OAuth auth
 * restricted to Solarplexor AB org members.
 *
 * Inherits all public hub routes (chains, couplings, convergence, etc.)
 * and adds factory-specific endpoints for hypotheses, deltas, tournaments,
 * experiment trees, and embargo management.
 *
 * All endpoints require authentication (org membership).
 */

import { json, notFound, cors } from './lib/response.js';
import { extractAuth } from './auth/middleware.js';
import { authorizationUrl, exchangeCode, fetchGitHubUser, upsertUser, verifyOrgMembership } from './auth/github-oauth.js';
import { createApiKey, listUserKeys } from './auth/api-keys.js';
import { handleListChains, handleGetChain } from './routes/chains.js';
import { handleListCouplings, handleAddCoupling } from './routes/couplings.js';
import { handleConvergence } from './routes/convergence.js';
import { handleCracks } from './routes/cracks.js';
import { handleHeatmap } from './routes/heatmap.js';
import { handleStats } from './routes/stats.js';
import { handleDiscovery } from './routes/discovery.js';
import { handleSearch } from './routes/search.js';
import { handleGround } from './routes/ground.js';
import { handleSubmit } from './routes/submit.js';
import { handleListEvents } from './routes/events.js';
import { handleAddDependency } from './routes/dependencies.js';
import { handleAddMeasurement } from './routes/measurements.js';
import { handleAddHypothesis } from './routes/hypotheses.js';
import { handleEchoChambers } from './routes/echo-chambers.js';
import { handleMeasurementPredictionRatio } from './routes/measurement-prediction-ratio.js';
import { handleMarkerPassing } from './routes/marker-passing.js';
import { handleSpeciation } from './routes/speciation.js';
import { handleListHypotheses, handleGetHypothesis, handleCreateHypothesis } from './routes/factory-hypotheses.js';
import { handleListDeltas, handleGetDelta, handleCreateDelta } from './routes/factory-deltas.js';
import { handleListExperiments, handleCreateExperiment, handleUpdateExperiment } from './routes/factory-experiments.js';
import { handleTournamentMatch } from './routes/factory-tournament.js';
import { handleListEmbargoed } from './routes/factory-embargo.js';
import { handleFactoryStats } from './routes/factory-stats.js';
import { handleListPrompts, handleGetPrompt } from './routes/factory-prompts.js';
import { handleListProjects, handleGetProject, handleCreateProject, handleUpdateProject, handleDeleteProject, handleAddMember } from './routes/factory-projects.js';
import { handleUpsertRun, handleRecordRound, handleRecordTasks, handleGetRun, handleListRuns, handleQueueStats } from './routes/factory-supervisor.js';
import { handleCreateAttention, handleListAttention, handleGetAttention, handleUpdateAttention, handleResolveAttention, handleAttentionStats } from './routes/factory-attention.js';
import { handleListExperts, handleGetExpert, handleAddExpert, handleUpdateExpert, handleCreateReward, handlePayReward, handleListRewards } from './routes/factory-experts.js';
import { handleListFindings, handleGetFinding, handleCreateFinding, handleUpdateFinding, handleReviewFinding } from './routes/factory-findings.js';
import { handleListPublications, handleGetPublication, handleCreatePublication, handleUpdatePublication } from './routes/factory-publications.js';
import { handleListCategories, handleListThemes, handleGetTheme, handleListIssues, handleCreateIssue, handleUpdateIssue, handleDeleteIssue, handleMarkDone, handleCreateTheme, handleUpdateTheme, handleTrackerStats, handleTrackerExport, handleTrackerBatch, handleListComments, handleCreateComment } from './routes/factory-tracker.js';
import { handleProcessPipeline, handleProcessStreams, handleListContainers, handleGetContainer, handleCreateContainer, handleUpdateContainer, handlePromoteContainer, handleSpawnDelivery } from './routes/process-containers.js';
import { handleStream } from './routes/stream.js';
import { handleAgentChat, handleGetRunMessages } from './routes/factory-agent.js';

interface Env {
  DB: D1Database;
  AI?: { run(model: string, input: { text: string[] }): Promise<{ data: number[][] }> };
  ANTHROPIC_API_KEY?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  GITHUB_TOKEN?: string;
  GITHUB_OWNER?: string;
  GITHUB_REPO?: string;
  REQUIRED_ORG?: string;
  ENVIRONMENT?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return cors();

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // ── Auth: GitHub OAuth (org-restricted) ───────────────────────────
      if (path === '/auth/github') {
        if (!env.GITHUB_CLIENT_ID) return json({ error: 'OAuth not configured' }, 500);
        const wantNew = url.searchParams.get('new') === 'true';
        const dashboardRedirect = url.searchParams.get('redirect');
        const callbackUrl = `${url.origin}/auth/github/callback`;
        // Encode dashboard redirect URL in state so we can redirect back after auth
        const state = dashboardRedirect ? `redirect:${dashboardRedirect}` : (wantNew ? 'new' : undefined);
        return Response.redirect(
          authorizationUrl(env.GITHUB_CLIENT_ID, callbackUrl, state),
          302,
        );
      }

      if (path === '/auth/github/callback') {
        if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) return json({ error: 'OAuth not configured' }, 500);
        const code = url.searchParams.get('code');
        if (!code) return json({ error: 'Missing code' }, 400);

        const token = await exchangeCode(env.GITHUB_CLIENT_ID, env.GITHUB_CLIENT_SECRET, code);
        const ghUser = await fetchGitHubUser(token);

        // Verify org membership
        const requiredOrg = env.REQUIRED_ORG ?? 'plyknot';
        const isMember = await verifyOrgMembership(token, requiredOrg);
        if (!isMember) {
          return new Response(
            `<!DOCTYPE html><html><head><title>Access Denied</title>
<style>body{font-family:system-ui;max-width:600px;margin:80px auto;padding:0 20px;background:#0D0D12;color:#F9FAFB}
.err{color:#EF4444}</style></head><body>
<h2 class="err">Access Denied</h2>
<p>hub.plyknot.com is restricted to members of the <code>${requiredOrg}</code> GitHub organization.</p>
<p>User <code>${ghUser.login}</code> is not a member. Contact the team lead for access.</p>
</body></html>`,
            { status: 403, headers: { 'content-type': 'text/html; charset=utf-8' } },
          );
        }

        const userId = await upsertUser(env.DB, ghUser);
        const existingKeys = await listUserKeys(env.DB, userId);
        const state = url.searchParams.get('state') ?? '';

        // Dashboard redirect flow: state="redirect:<url>"
        if (state.startsWith('redirect:')) {
          const redirectUrl = state.slice('redirect:'.length);
          // Reuse existing key or create one
          const apiKey = existingKeys.length > 0
            ? existingKeys[0].name  // name field contains the key prefix for lookup
            : await createApiKey(env.DB, userId, `${ghUser.login}-dashboard-${Date.now()}`);
          // For existing keys we need to create a new one since we can't retrieve the raw key
          const freshKey = existingKeys.length > 0
            ? await createApiKey(env.DB, userId, `${ghUser.login}-dashboard-${Date.now()}`)
            : apiKey;
          const params = new URLSearchParams({
            key: freshKey as string,
            login: ghUser.login,
            name: ghUser.name ?? ghUser.login,
            avatar: `https://avatars.githubusercontent.com/u/${ghUser.id}`,
          });
          return Response.redirect(`${redirectUrl}?${params}`, 302);
        }

        const forceNew = state === 'new';

        if (existingKeys.length > 0 && !forceNew) {
          // User already has keys — show them and offer to create a new one
          const keyList = existingKeys.map((k) =>
            `<li><code>${k.name}</code> — created ${k.created}${k.lastUsed ? `, last used ${k.lastUsed}` : ''}</li>`
          ).join('\n');

          return new Response(
            `<!DOCTYPE html><html><head><title>Plyknot Hub Commercial</title>
<style>body{font-family:system-ui;max-width:600px;margin:80px auto;padding:0 20px;background:#0D0D12;color:#F9FAFB}
ul{padding-left:20px}li{margin:4px 0}code{background:#1A1A24;padding:2px 6px;border-radius:4px}
pre{background:#1A1A24;padding:12px;border-radius:6px;font-size:0.8rem;overflow-x:auto}
a{color:#60A5FA}.btn{display:inline-block;margin-top:12px;padding:8px 16px;background:#2563EB;color:#fff;border-radius:6px;text-decoration:none}</style></head><body>
<h2>Welcome back, ${ghUser.login}!</h2>
<p>You already have ${existingKeys.length} API key${existingKeys.length > 1 ? 's' : ''}:</p>
<ul>${keyList}</ul>
<p>If you lost your key, generate a new one:</p>
<a class="btn" href="/auth/github?new=true">Generate new key</a>
<h3>Claude MCP</h3>
<pre>
claude mcp add plyknot -- npx tsx mcp/src/index.ts \\
  --remote https://hub.plyknot.org \\
  --factory ${url.origin} \\
  --key YOUR_KEY_FROM_THIS_PAGE
</pre>
<h3>API</h3>
<pre>
curl -H "Authorization: Bearer YOUR_KEY_FROM_THIS_PAGE" \\
  ${url.origin}/v1/factory/stats
</pre>
<p><a href="/v1/factory/stats">Factory stats →</a></p>
</body></html>`,
            { headers: { 'content-type': 'text/html; charset=utf-8' } },
          );
        }

        // Create a new key (first visit or explicit ?new=true)
        const apiKey = await createApiKey(env.DB, userId, `${ghUser.login}-${Date.now()}`);

        return new Response(
          `<!DOCTYPE html><html><head><title>Plyknot Hub Commercial</title>
<style>body{font-family:system-ui;max-width:600px;margin:80px auto;padding:0 20px;background:#0D0D12;color:#F9FAFB}
.key{background:#1A1A24;padding:16px;border-radius:8px;font-family:monospace;word-break:break-all;border:1px solid #2E2E3A}
.warn{color:#EF4444;margin-top:8px;font-size:0.85rem}pre{background:#1A1A24;padding:12px;border-radius:6px;font-size:0.8rem;overflow-x:auto}
a{color:#60A5FA}</style></head><body>
<h2>Welcome, ${ghUser.login}!</h2>
<p>Your commercial API key (copy it now — shown only once):</p>
<div class="key">${apiKey}</div>
<p class="warn">Store this securely. This grants access to embargoed data and factory state.</p>
<h3>Claude MCP</h3>
<pre>
claude mcp add plyknot -- npx tsx mcp/src/index.ts \\
  --remote https://hub.plyknot.org \\
  --factory ${url.origin} \\
  --key ${apiKey}
</pre>

<h3>API</h3>
<pre>
curl -H "Authorization: Bearer ${apiKey}" \\
  ${url.origin}/v1/factory/stats
</pre>
<p><a href="/v1/factory/stats">Factory stats →</a></p>
</body></html>`,
          { headers: { 'content-type': 'text/html; charset=utf-8' } },
        );
      }

      // ── V1 API ────────────────────────────────────────────────────────
      if (path.startsWith('/v1/')) {
        const auth = await extractAuth(request, env.DB);
        const route = path.slice(3); // strip /v1

        // ── All endpoints require authentication on commercial hub ──────
        if (!auth.userId) {
          return json({ error: 'Authentication required. Visit /auth/github to get an API key.' }, 401);
        }

        // ── SSE stream ──────────────────────────────────────────────────
        if (request.method === 'GET' && route === '/stream') {
          return handleStream(env.DB, auth);
        }

        // ── Public-equivalent read endpoints ────────────────────────────
        if (request.method === 'GET') {
          if (route === '/chains') return handleListChains(env.DB);
          if (route.startsWith('/chains/')) return handleGetChain(env.DB, route.slice(8));
          if (route === '/couplings') return handleListCouplings(env.DB, url);
          if (route.startsWith('/convergence/')) return handleConvergence(env.DB, decodeURIComponent(route.slice(13)));
          if (route === '/cracks') return handleCracks(env.DB);
          if (route === '/heatmap') return handleHeatmap(env.DB);
          if (route === '/discovery') return handleDiscovery(env.DB);
          if (route === '/stats') return handleStats(env.DB);
          if (route === '/events') return handleListEvents(env.DB, url);
          if (route === '/search') return handleSearch(env.DB, env.AI ?? null, url);
          if (route === '/ground') {
            if (!env.AI) return json({ error: 'AI binding not configured' }, 500);
            return handleGround(env.DB, env.AI, url);
          }
          if (route === '/echo-chambers') return handleEchoChambers(env.DB, url);
          if (route === '/measurement-prediction-ratio') return handleMeasurementPredictionRatio(env.DB, url);
          if (route === '/marker-passing') return handleMarkerPassing(env.DB, url);
          if (route === '/speciation') return handleSpeciation(env.DB, url);

          // ── Factory read endpoints (commercial-only) ──────────────────
          if (route === '/factory/stats') return handleFactoryStats(env.DB);
          if (route === '/factory/hypotheses') return handleListHypotheses(env.DB, url);
          if (route.startsWith('/factory/hypotheses/')) return handleGetHypothesis(env.DB, route.slice(22));
          if (route === '/factory/deltas') return handleListDeltas(env.DB, url);
          if (route.startsWith('/factory/deltas/')) return handleGetDelta(env.DB, route.slice(16));
          if (route === '/factory/experiments') return handleListExperiments(env.DB, url);
          if (route === '/factory/embargoed') return handleListEmbargoed(env.DB, url);
          if (route === '/factory/prompts') return handleListPrompts();
          if (route.startsWith('/factory/prompts/')) return handleGetPrompt(route.slice(17));
          if (route === '/factory/projects') return handleListProjects(env.DB, auth);
          if (route.startsWith('/factory/projects/') && !route.includes('/members')) {
            return handleGetProject(env.DB, auth, route.slice(18));
          }
          if (route === '/factory/supervisor/runs') return handleListRuns(env.DB, auth);
          if (route === '/factory/supervisor/queue') return handleQueueStats(env.DB, auth);
          if (route.startsWith('/factory/supervisor/runs/')) {
            const runSuffix = route.slice(24);
            if (runSuffix.endsWith('/messages')) {
              return handleGetRunMessages(env.DB, auth, runSuffix.replace('/messages', ''));
            }
            return handleGetRun(env.DB, auth, runSuffix);
          }
          if (route === '/factory/findings') return handleListFindings(env.DB, auth, url);
          if (route.match(/^\/factory\/findings\/[^/]+$/) && !route.includes('/review')) return handleGetFinding(env.DB, auth, route.slice(18));
          if (route === '/factory/publications') return handleListPublications(env.DB, auth, url);
          if (route.match(/^\/factory\/publications\/[^/]+$/)) return handleGetPublication(env.DB, auth, route.slice(22));
          if (route === '/factory/experts') return handleListExperts(env.DB, auth, url);
          if (route === '/factory/experts/rewards') return handleListRewards(env.DB, auth, url);
          if (route.match(/^\/factory\/experts\/[^/]+$/) && !route.includes('/rewards')) return handleGetExpert(env.DB, auth, route.slice(17));
          if (route === '/factory/attention') return handleListAttention(env.DB, auth, url);
          if (route === '/factory/attention/stats') return handleAttentionStats(env.DB, auth);
          if (route.match(/^\/factory\/attention\/[^/]+$/) && !route.includes('/resolve')) {
            return handleGetAttention(env.DB, auth, route.slice(19));
          }

          // ── Process read endpoints ──────────────────────────────────────
          if (route === '/process/pipeline') return handleProcessPipeline(env.DB, auth);
          if (route === '/process/streams') return handleProcessStreams(env.DB, auth);
          if (route === '/process/containers') return handleListContainers(env.DB, auth, url);
          if (route.match(/^\/process\/containers\/[^/]+$/) && !route.includes('/promote') && !route.includes('/spawn')) {
            return handleGetContainer(env.DB, auth, decodeURIComponent(route.slice(21)));
          }

          // ── Tracker read endpoints ──────────────────────────────────────
          if (route === '/factory/tracker/categories') return handleListCategories(env.DB, auth);
          if (route === '/factory/tracker/themes') return handleListThemes(env.DB, auth, url);
          if (route === '/factory/tracker/issues') return handleListIssues(env.DB, auth, url);
          if (route === '/factory/tracker/stats') return handleTrackerStats(env.DB, auth);
          if (route === '/factory/tracker/export') return handleTrackerExport(env.DB, auth);
          if (route.match(/^\/factory\/tracker\/themes\/[^/]+$/)) {
            return handleGetTheme(env.DB, auth, decodeURIComponent(route.slice(24)));
          }
          if (route.match(/^\/factory\/tracker\/issues\/[^/]+\/comments$/)) {
            return handleListComments(env.DB, auth, decodeURIComponent(route.slice(24).replace('/comments', '')));
          }
        }

        // ── Write endpoints ─────────────────────────────────────────────
        if (request.method === 'POST') {
          if (route === '/submit') return handleSubmit(request, env.DB, auth);

          const dryRun = url.searchParams.get('dryRun') === 'true';
          const ghEnv = {
            GITHUB_TOKEN: env.GITHUB_TOKEN ?? '',
            GITHUB_OWNER: env.GITHUB_OWNER ?? 'plyknot',
            GITHUB_REPO: env.GITHUB_REPO ?? 'plyknot-com',
          };

          // PR-creating write endpoints
          if (route === '/dependencies' || route === '/couplings'
              || /^\/chains\/[^/]+\/measurements$/.test(route)
              || /^\/chains\/[^/]+\/hypotheses$/.test(route)) {
            if (!dryRun && (!env.GITHUB_TOKEN || !env.GITHUB_OWNER || !env.GITHUB_REPO)) {
              return json({ error: 'Write endpoints require GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO' }, 500);
            }

            if (route === '/dependencies') return handleAddDependency(request, env.DB, auth, ghEnv, dryRun);
            if (route === '/couplings') return handleAddCoupling(request, env.DB, auth, ghEnv, dryRun);

            const measMatch = route.match(/^\/chains\/([^/]+)\/measurements$/);
            if (measMatch) return handleAddMeasurement(request, env.DB, auth, ghEnv, measMatch[1], dryRun);

            const hypMatch = route.match(/^\/chains\/([^/]+)\/hypotheses$/);
            if (hypMatch) return handleAddHypothesis(request, env.DB, auth, ghEnv, hypMatch[1], dryRun);
          }

          // ── Factory write endpoints (commercial-only) ─────────────────
          if (route === '/factory/hypotheses') return handleCreateHypothesis(request, env.DB, auth);
          if (route === '/factory/deltas') return handleCreateDelta(request, env.DB, auth);
          if (route === '/factory/experiments') return handleCreateExperiment(request, env.DB, auth);
          if (route === '/factory/tournament') return handleTournamentMatch(request, env.DB, auth);
          if (route === '/factory/projects') return handleCreateProject(request, env.DB, auth);
          if (route.match(/^\/factory\/projects\/[^/]+\/members$/)) {
            return handleAddMember(request, env.DB, auth, route.slice(18).replace('/members', ''));
          }
          if (route === '/factory/supervisor/runs') return handleUpsertRun(request, env.DB, auth);
          if (route === '/factory/supervisor/rounds') return handleRecordRound(request, env.DB, auth);
          if (route === '/factory/supervisor/tasks') return handleRecordTasks(request, env.DB, auth);
          if (route === '/factory/findings') return handleCreateFinding(request, env.DB, auth);
          if (route.match(/^\/factory\/findings\/[^/]+\/review$/)) {
            return handleReviewFinding(request, env.DB, auth, route.slice(18).replace('/review', ''));
          }
          if (route === '/factory/publications') return handleCreatePublication(request, env.DB, auth);
          if (route === '/factory/experts') return handleAddExpert(request, env.DB, auth);
          if (route === '/factory/experts/rewards') return handleCreateReward(request, env.DB, auth);
          if (route.match(/^\/factory\/experts\/rewards\/[^/]+\/pay$/)) {
            return handlePayReward(request, env.DB, auth, route.slice(25).replace('/pay', ''));
          }
          if (route === '/factory/attention') return handleCreateAttention(request, env.DB, auth);
          if (route.match(/^\/factory\/attention\/[^/]+\/resolve$/)) {
            return handleResolveAttention(request, env.DB, auth, route.slice(19).replace('/resolve', ''));
          }

          // ── Agent chat ─────────────────────────────────────────────────
          if (route === '/agent/chat') return handleAgentChat(request, { DB: env.DB, ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY }, auth);

          // ── Process write endpoints ────────────────────────────────────
          if (route === '/process/containers') return handleCreateContainer(request, env.DB, auth);
          if (route === '/process/spawn-delivery') return handleSpawnDelivery(request, env.DB, auth);
          if (route.match(/^\/process\/containers\/[^/]+\/promote$/)) {
            return handlePromoteContainer(request, env.DB, auth, decodeURIComponent(route.slice(21).replace('/promote', '')));
          }

          // ── Tracker write endpoints ─────────────────────────────────────
          if (route === '/factory/tracker/issues') return handleCreateIssue(request, env.DB, auth);
          if (route === '/factory/tracker/themes') return handleCreateTheme(request, env.DB, auth);
          if (route === '/factory/tracker/batch') return handleTrackerBatch(request, env.DB, auth);
          if (route.match(/^\/factory\/tracker\/issues\/[^/]+\/done$/)) {
            return handleMarkDone(request, env.DB, auth, decodeURIComponent(route.slice(24).replace('/done', '')));
          }
          if (route.match(/^\/factory\/tracker\/issues\/[^/]+\/comments$/)) {
            return handleCreateComment(request, env.DB, auth, decodeURIComponent(route.slice(24).replace('/comments', '')));
          }
        }

        // ── PATCH for updates ─────────────────────────────────────────
        if (request.method === 'PATCH') {
          if (route.startsWith('/factory/experiments/')) return handleUpdateExperiment(request, env.DB, route.slice(23));
          if (route.startsWith('/factory/projects/')) return handleUpdateProject(request, env.DB, auth, route.slice(18));
          if (route.startsWith('/factory/findings/')) return handleUpdateFinding(request, env.DB, auth, route.slice(18));
          if (route.startsWith('/factory/publications/')) return handleUpdatePublication(request, env.DB, auth, route.slice(22));
          if (route.startsWith('/factory/experts/')) return handleUpdateExpert(request, env.DB, auth, route.slice(17));
          if (route.startsWith('/factory/attention/')) return handleUpdateAttention(request, env.DB, auth, route.slice(19));
          if (route.match(/^\/factory\/tracker\/issues\/[^/]+$/)) {
            return handleUpdateIssue(request, env.DB, auth, decodeURIComponent(route.slice(24)));
          }
          if (route.match(/^\/factory\/tracker\/themes\/[^/]+$/)) {
            return handleUpdateTheme(request, env.DB, auth, decodeURIComponent(route.slice(24)));
          }
          // Process container PATCH
          if (route.match(/^\/process\/containers\/[^/]+$/)) {
            return handleUpdateContainer(request, env.DB, auth, decodeURIComponent(route.slice(21)));
          }
        }

        // ── DELETE ──────────────────────────────────────────────────────
        if (request.method === 'DELETE') {
          if (route.startsWith('/factory/projects/')) return handleDeleteProject(env.DB, auth, route.slice(18));
          if (route.match(/^\/factory\/tracker\/issues\/[^/]+$/)) {
            return handleDeleteIssue(env.DB, auth, decodeURIComponent(route.slice(24)));
          }
        }

        return notFound(`No route: ${request.method} ${path}`);
      }

      // ── Root ──────────────────────────────────────────────────────────
      if (path === '/' || path === '') {
        return json({
          name: 'plyknot-hub-com',
          version: '0.1.0',
          description: 'Commercial factory research API — restricted to org members',
          endpoints: [
            'GET  /v1/chains', 'GET  /v1/chains/:name', 'GET  /v1/couplings',
            'GET  /v1/convergence/:entity', 'GET  /v1/cracks', 'GET  /v1/heatmap',
            'GET  /v1/discovery', 'GET  /v1/stats', 'GET  /v1/events',
            'GET  /v1/search?q=...', 'GET  /v1/ground?text=...',
            'GET  /v1/echo-chambers', 'GET  /v1/measurement-prediction-ratio',
            'GET  /v1/marker-passing', 'GET  /v1/speciation',
            'POST /v1/submit', 'POST /v1/couplings',
            'POST /v1/chains/:name/measurements', 'POST /v1/chains/:name/hypotheses',
            '--- Factory (commercial) ---',
            'GET  /v1/factory/stats',
            'GET|POST /v1/factory/hypotheses',
            'GET  /v1/factory/hypotheses/:id',
            'GET|POST /v1/factory/deltas',
            'GET  /v1/factory/deltas/:id',
            'GET|POST /v1/factory/experiments',
            'PATCH /v1/factory/experiments/:id',
            'POST /v1/factory/tournament',
            'GET  /v1/factory/embargoed',
            'GET|POST /v1/factory/projects',
            'GET|PATCH|DELETE /v1/factory/projects/:id',
            'POST /v1/factory/projects/:id/members',
            'GET|POST /v1/factory/findings',
            'GET|PATCH /v1/factory/findings/:id',
            'POST /v1/factory/findings/:id/review',
            'GET|POST /v1/factory/publications',
            'GET|PATCH /v1/factory/publications/:id',
            'GET|POST /v1/factory/experts',
            'GET|PATCH /v1/factory/experts/:id',
            'GET|POST /v1/factory/experts/rewards',
            'POST /v1/factory/experts/rewards/:id/pay',
            'GET|POST /v1/factory/attention',
            'GET  /v1/factory/attention/stats',
            'GET|PATCH /v1/factory/attention/:id',
            'POST /v1/factory/attention/:id/resolve',
            'GET  /v1/factory/supervisor/runs',
            'GET  /v1/factory/supervisor/runs/:id',
            'GET  /v1/factory/supervisor/queue',
            'POST /v1/factory/supervisor/runs|rounds|tasks',
            'GET  /v1/factory/prompts',
            'GET  /v1/factory/prompts/:role',
            '--- Tracker ---',
            'GET  /v1/factory/tracker/categories',
            'GET  /v1/factory/tracker/themes',
            'GET  /v1/factory/tracker/themes/:id',
            'GET  /v1/factory/tracker/issues',
            'POST /v1/factory/tracker/issues',
            'PATCH /v1/factory/tracker/issues/:id',
            'DELETE /v1/factory/tracker/issues/:id',
            'POST /v1/factory/tracker/issues/:id/done',
            'GET  /v1/factory/tracker/issues/:id/comments',
            'POST /v1/factory/tracker/issues/:id/comments',
            'POST /v1/factory/tracker/themes',
            'PATCH /v1/factory/tracker/themes/:id',
            'GET  /v1/factory/tracker/stats',
            'GET  /v1/factory/tracker/export',
            'POST /v1/factory/tracker/batch',
          ],
          auth: 'GET /auth/github (requires org membership)',
        });
      }

      return notFound();
    } catch (err) {
      console.error('Hub-com error:', err);
      return json({ error: 'Internal Server Error', message: (err as Error).message }, 500);
    }
  },
};
