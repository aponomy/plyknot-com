/**
 * GitHub OAuth — restricted to Solarplexor AB org members.
 *
 * Commercial hub requires membership in the REQUIRED_ORG GitHub organization.
 * Requests read:org scope to verify membership.
 */

export interface GitHubUser {
  login: string;
  id: number;
  name: string | null;
  email: string | null;
}

export function authorizationUrl(clientId: string, redirectUri: string, state?: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'read:user read:org',
  });
  if (state) params.set('state', state);
  return `https://github.com/login/oauth/authorize?${params}`;
}

/**
 * Verify that the authenticated user is a member of the required GitHub org.
 */
export async function verifyOrgMembership(accessToken: string, org: string): Promise<boolean> {
  const resp = await fetch(`https://api.github.com/user/memberships/orgs/${org}`, {
    headers: {
      authorization: `Bearer ${accessToken}`,
      'user-agent': 'plyknot-hub-com',
      accept: 'application/vnd.github+json',
    },
  });
  if (!resp.ok) return false;
  const data = (await resp.json()) as { state?: string };
  return data.state === 'active';
}

export async function exchangeCode(clientId: string, clientSecret: string, code: string): Promise<string> {
  const resp = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`GitHub token exchange failed: ${resp.status} ${body.slice(0, 200)}`);
  }
  const data = (await resp.json()) as { access_token?: string; error?: string };
  if (data.error || !data.access_token) throw new Error(`GitHub OAuth error: ${data.error}`);
  return data.access_token;
}

export async function fetchGitHubUser(accessToken: string): Promise<GitHubUser> {
  const resp = await fetch('https://api.github.com/user', {
    method: 'GET',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'user-agent': 'plyknot-hub-com/0.1',
      accept: 'application/vnd.github+json',
    },
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`GitHub user fetch failed: ${resp.status} ${body.slice(0, 200)}`);
  }
  return (await resp.json()) as GitHubUser;
}

export async function upsertUser(db: D1Database, ghUser: GitHubUser): Promise<string> {
  const userId = String(ghUser.id);
  await db.prepare(
    `INSERT INTO users (id, github_login, display_name, email)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET github_login = ?, display_name = ?, email = ?`,
  ).bind(userId, ghUser.login, ghUser.name, ghUser.email, ghUser.login, ghUser.name, ghUser.email).run();
  return userId;
}
