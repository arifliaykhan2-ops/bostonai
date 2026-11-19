// In-app account deletion (App Store guideline 5.1.1(v)).
// Removes the user's files, then the auth user; tables cascade.
// TODO before launch: also revoke the Sign in with Apple token
// (https://appleid.apple.com/auth/revoke) as Apple requires.
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

  await removeFolder('inputs', user.id);
  await removeFolder('outputs', user.id);

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error('delete user failed', error);
    return json({ error: 'server_error' }, 500);
  }
  return json({ ok: true });
});
