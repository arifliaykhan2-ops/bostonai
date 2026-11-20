// Sign in with Apple token revocation (required when an account is deleted).
// https://developer.apple.com/documentation/sign_in_with_apple/revoke_tokens
//
// Secrets (supabase secrets set …):
//   APPLE_TEAM_ID      10-character Team ID
//   APPLE_KEY_ID       Key ID of a "Sign in with Apple" key
//   APPLE_PRIVATE_KEY  contents of that key's .p8 file (PEM, newlines kept or as \n)
//   APPLE_CLIENT_ID    the app's bundle id (default ai.boson.app)

const TEAM_ID = Deno.env.get('APPLE_TEAM_ID');
const KEY_ID = Deno.env.get('APPLE_KEY_ID');
const PRIVATE_KEY = Deno.env.get('APPLE_PRIVATE_KEY');
const CLIENT_ID = Deno.env.get('APPLE_CLIENT_ID') ?? 'ai.boson.app';

export const appleRevokeConfigured = () => !!(TEAM_ID && KEY_ID && PRIVATE_KEY);

const b64url = (data: ArrayBuffer | Uint8Array | string) => {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

/** ES256 client secret JWT, valid for 5 minutes. */
async function clientSecret(): Promise<string> {
  const pem = PRIVATE_KEY!.replace(/\\n/g, '\n');
  const der = Uint8Array.from(
    atob(pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s+/g, '')),
    (c) => c.charCodeAt(0),
  );
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'ES256', kid: KEY_ID }));
  const payload = b64url(
    JSON.stringify({ iss: TEAM_ID, iat: now, exp: now + 300, aud: 'https://appleid.apple.com', sub: CLIENT_ID }),
  );
  const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(`${header}.${payload}`));
  return `${header}.${payload}.${b64url(signature)}`;
}

async function applePost(path: string, form: Record<string, string>) {
  return fetch(`https://appleid.apple.com/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(form),
  });
}

/**
 * Exchanges a fresh authorization code from the app for a refresh token and
 * revokes it, which ends the app's Sign in with Apple link for this user.
 */
export async function revokeAppleAuthorization(authorizationCode: string): Promise<void> {
  if (!appleRevokeConfigured()) throw new Error('apple_revoke_not_configured');
  const secret = await clientSecret();

  const tokenRes = await applePost('token', {
    client_id: CLIENT_ID,
    client_secret: secret,
    code: authorizationCode,
    grant_type: 'authorization_code',
  });
  if (!tokenRes.ok) throw new Error(`apple token ${tokenRes.status}: ${(await tokenRes.text()).slice(0, 200)}`);
  const tokens = (await tokenRes.json()) as { refresh_token?: string; access_token?: string };
  const token = tokens.refresh_token ?? tokens.access_token;
  if (!token) throw new Error('apple token: no token in response');

  const revokeRes = await applePost('revoke', {
    client_id: CLIENT_ID,
    client_secret: secret,
    token,
    token_type_hint: tokens.refresh_token ? 'refresh_token' : 'access_token',
  });
  if (!revokeRes.ok) throw new Error(`apple revoke ${revokeRes.status}: ${(await revokeRes.text()).slice(0, 200)}`);
}
