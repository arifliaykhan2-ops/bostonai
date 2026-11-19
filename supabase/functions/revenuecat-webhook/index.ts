// Grants credits for App Store purchases. Configure in RevenueCat:
//   Integrations → Webhooks → URL: <SUPABASE_URL>/functions/v1/revenuecat-webhook
//   Authorization header: Bearer <REVENUECAT_WEBHOOK_SECRET>
// The app sets RevenueCat's appUserID to the Supabase user id.
import { PRODUCT_CREDITS } from '../_shared/catalog.ts';
import { admin, json } from '../_shared/http.ts';

const SECRET = Deno.env.get('REVENUECAT_WEBHOOK_SECRET')!;
const GRANTING_EVENTS = new Set(['INITIAL_PURCHASE', 'RENEWAL', 'NON_RENEWING_PURCHASE']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RcEvent = { id: string; type: string; app_user_id: string; product_id: string; environment: string };

Deno.serve(async (req) => {
  if (req.headers.get('Authorization') !== `Bearer ${SECRET}`) return json({ error: 'unauthorized' }, 401);

  const { event } = (await req.json()) as { event: RcEvent };
  if (!GRANTING_EVENTS.has(event.type)) return json({ ok: true, ignored: event.type });

  const amount = PRODUCT_CREDITS[event.product_id];
  if (!amount) {
    console.error('unknown product', event.product_id);
    return json({ ok: true, ignored: 'unknown_product' });
  }
  if (!UUID.test(event.app_user_id)) {
    console.error('anonymous or invalid app_user_id', event.app_user_id);
    return json({ ok: true, ignored: 'no_user' });
  }

  const { error } = await admin.rpc('grant_credits', {
    p_user: event.app_user_id,
    p_amount: amount,
    p_ref: `rc:${event.id}`,
  });
  if (error) {
    console.error('grant failed', error);
    return json({ error: 'server_error' }, 500); // RevenueCat will retry
  }
  return json({ ok: true });
});
