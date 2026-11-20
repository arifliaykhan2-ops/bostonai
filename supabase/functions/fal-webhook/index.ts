// Receives fal.ai queue results, copies the output into Storage,
// completes or refunds the job, and sends a push notification.
// Signature check follows https://fal.ai/docs/model-apis/model-endpoints/webhooks
import { admin, json } from '../_shared/http.ts';
import { pushText, type PushKey } from '../_shared/push.ts';

const JWKS_URL = 'https://rest.fal.ai/.well-known/jwks.json';
const JWKS_TTL_MS = 12 * 60 * 60 * 1000; // fal says cache ≤ 24h

let jwksCache: { keys: CryptoKey[]; fetchedAt: number } | null = null;

const hex = (buf: ArrayBuffer) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

const hexToBytes = (s: string) => new Uint8Array(s.match(/../g)?.map((h) => parseInt(h, 16)) ?? []);

const b64urlToBytes = (s: string) => {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=');
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
};

async function falKeys(): Promise<CryptoKey[]> {
  if (jwksCache && Date.now() - jwksCache.fetchedAt < JWKS_TTL_MS) return jwksCache.keys;
  const { keys } = (await (await fetch(JWKS_URL)).json()) as { keys: { x: string }[] };
  const imported = await Promise.all(
    keys.map((k) => crypto.subtle.importKey('raw', b64urlToBytes(k.x), { name: 'Ed25519' }, false, ['verify'])),
  );
  jwksCache = { keys: imported, fetchedAt: Date.now() };
  return imported;
}

async function verifyFalSignature(req: Request, rawBody: Uint8Array): Promise<boolean> {
  const requestId = req.headers.get('x-fal-webhook-request-id');
  const userId = req.headers.get('x-fal-webhook-user-id');
  const timestamp = req.headers.get('x-fal-webhook-timestamp');
  const signature = req.headers.get('x-fal-webhook-signature');
  if (!requestId || !userId || !timestamp || !signature) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

  const bodyHash = hex(await crypto.subtle.digest('SHA-256', rawBody));
  const message = new TextEncoder().encode([requestId, userId, timestamp, bodyHash].join('\n'));
  const sig = hexToBytes(signature);

  for (const key of await falKeys()) {
    if (await crypto.subtle.verify('Ed25519', key, sig, message)) return true;
  }
  return false;
}

type FalWebhook = {
  request_id: string;
  status: 'OK' | 'ERROR';
  payload?: { video?: { url: string }; images?: { url: string }[]; image?: { url: string } } | null;
  error?: string;
};

Deno.serve(async (req) => {
  const rawBody = new Uint8Array(await req.arrayBuffer());
  if (!(await verifyFalSignature(req, rawBody))) return json({ error: 'bad_signature' }, 401);

  const jobId = new URL(req.url).searchParams.get('job');
  const event = JSON.parse(new TextDecoder().decode(rawBody)) as FalWebhook;

  const { data: job } = await admin
    .from('jobs')
    .select('id, user_id, kind, status, fal_request_id')
    .eq('id', jobId)
    .single();
  if (!job) return json({ ok: true }); // unknown job — ack so fal stops retrying
  if (job.status !== 'queued') return json({ ok: true }); // already handled
  if (job.fal_request_id && job.fal_request_id !== event.request_id) return json({ error: 'mismatch' }, 400);

  const resultUrl = event.payload?.video?.url ?? event.payload?.images?.[0]?.url ?? event.payload?.image?.url;

  if (event.status !== 'OK' || !resultUrl) {
    console.error('generation failed', jobId, event.error);
    await admin.rpc('fail_job', { p_job: job.id, p_error: 'Generation failed. Your credits were refunded.' });
    await notify(job.user_id, 'push.failed', 'push.refunded', job.id);
    return json({ ok: true });
  }

  try {
    const file = await fetch(resultUrl);
    if (!file.ok) throw new Error(`download ${file.status}`);
    const contentType = file.headers.get('content-type') ?? (job.kind === 'video' ? 'video/mp4' : 'image/jpeg');
    const ext = job.kind === 'video' ? 'mp4' : contentType.includes('png') ? 'png' : 'jpg';
    const path = `${job.user_id}/${job.id}.${ext}`;

    const { error } = await admin.storage
      .from('outputs')
      .upload(path, await file.arrayBuffer(), { contentType, upsert: true });
    if (error) throw error;

    await admin.rpc('complete_job', { p_job: job.id, p_output_path: path });
    await notify(job.user_id, job.kind === 'video' ? 'push.videoReady' : 'push.imageReady', 'push.tapToView', job.id);
  } catch (e) {
    console.error('store output failed', jobId, e);
    await admin.rpc('fail_job', { p_job: job.id, p_error: 'Could not save the result. Your credits were refunded.' });
  }

  return json({ ok: true });
});

/** Sends a push in the user's app language (profiles.locale, set by the app with the push token). */
async function notify(userId: string, titleKey: PushKey, bodyKey: PushKey, jobId: string) {
  const { data } = await admin.from('profiles').select('push_token, locale').eq('id', userId).single();
  if (!data?.push_token) return;
  const title = pushText(data.locale, titleKey);
  const body = pushText(data.locale, bodyKey);
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: data.push_token, title, body, data: { url: `/job/${jobId}` } }),
  }).catch((e) => console.error('push failed', e));
}
