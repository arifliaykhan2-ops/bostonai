// Showcase posts that must not be shown: blocked for everyone after enough
// reports (public.blocked_content), plus the ones this user reported themselves.
import { admin } from './http.ts';

let blockedCache: { ids: Set<string>; at: number } | null = null;

async function blockedForEveryone(): Promise<Set<string>> {
  if (blockedCache && Date.now() - blockedCache.at < 60 * 1000) return blockedCache.ids;
  const { data, error } = await admin.from('blocked_content').select('target_id').eq('target_type', 'showcase');
  if (error) console.error('blocked_content read failed', error);
  blockedCache = { ids: new Set((data ?? []).map((r: { target_id: string }) => r.target_id)), at: Date.now() };
  return blockedCache.ids;
}

export async function hiddenShowcaseIds(userId?: string | null): Promise<Set<string>> {
  const blocked = await blockedForEveryone();
  if (!userId) return blocked;
  const { data } = await admin
    .from('reports')
    .select('target_id')
    .eq('user_id', userId)
    .eq('target_type', 'showcase');
  if (!data?.length) return blocked;
  return new Set([...blocked, ...data.map((r: { target_id: string }) => r.target_id)]);
}
