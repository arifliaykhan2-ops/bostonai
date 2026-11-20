// In-app account deletion (App Store guideline 5.1.1(v)).
// Revokes the Sign in with Apple link (if the user signed in with Apple),
// removes the user's files, then the auth user; tables cascade.
//
//   POST { appleAuthorizationCode?: string }
// The app gets a fresh authorization code by asking the user to confirm with
// Apple once more right before deleting (see mobile/src/lib/api.ts deleteAccount).
import { appleRevokeConfigured, revokeAppleAuthorization } from '../_shared/apple.ts';
import { admin, corsHeaders, json, requireUser } from '../_shared/http.ts';

async function removeFolder(bucket: string, folder: string) {
  for (;;) {
    const { data } = await admin.storage.from(bucket).list(folder, { limit: 1000 });
    if (!data?.length) return;
    await admin.storage.from(bucket).remove(data.map((f) => `${folder}/${f.name}`));
    if (data.length < 1000) return;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const user = await requireUser(req);
  if (!user) return json({ error: 'unauthorized' }, 401);
  const body = (await req.json().catch(() => ({}))) as { appleAuthorizationCode?: string };

  const usesApple = (user.identities ?? []).some((i) => i.provider === 'apple');
  if (usesApple) {
    if (!body.appleAuthorizationCode) return json({ error: 'apple_reauth_required' }, 400);
    if (appleRevokeConfigured()) {
      try {
        await revokeAppleAuthorization(body.appleAuthorizationCode);
      } catch (e) {
        // Deleting the account matters more than the revoke call; keep going but log it.
        console.error('apple revoke failed', String(e).slice(0, 300));
      }
    } else {
      console.error('apple revoke skipped: APPLE_TEAM_ID / APPLE_KEY_ID / APPLE_PRIVATE_KEY not set');
    }
  }

  await removeFolder('inputs', user.id);
  await removeFolder('outputs', user.id);

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error('delete user failed', error);
    return json({ error: 'server_error' }, 500);
  }
  return json({ ok: true });
});
