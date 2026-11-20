// Per-user generation limits, checked before credits are spent.
//   - at most MAX_RUNNING jobs still in the queue at once (a stuck job stops counting after 30 min)
//   - at most MAX_PER_HOUR new jobs per rolling hour
import { admin } from './http.ts';

const MAX_RUNNING = 4;
const MAX_PER_HOUR = 40;

export type LimitResult = { ok: true } | { ok: false; error: 'too_many_running' | 'rate_limited' };

export async function checkLimits(userId: string): Promise<LimitResult> {
  const now = Date.now();
  const since = (ms: number) => new Date(now - ms).toISOString();

  const [running, lastHour] = await Promise.all([
    admin
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'queued')
      .gte('created_at', since(30 * 60 * 1000)),
    admin
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', since(60 * 60 * 1000)),
  ]);
  if (running.error || lastHour.error) {
    // Never block a paying user because the count query failed; log it instead.
    console.error('limit check failed', running.error ?? lastHour.error);
    return { ok: true };
  }
  if ((running.count ?? 0) >= MAX_RUNNING) return { ok: false, error: 'too_many_running' };
  if ((lastHour.count ?? 0) >= MAX_PER_HOUR) return { ok: false, error: 'rate_limited' };
  return { ok: true };
}
