import { useEffect, useState } from 'react';
import { useAuth } from '@/providers/auth';
import { supabase } from '@/lib/supabase';

/** Live credit balance; updates through Supabase Realtime when the server changes it. */
export function useCredits(): number | null {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    if (!userId) return;

    supabase
      .from('profiles')
      .select('credits')
      .eq('id', userId)
      .single()
      .then(({ data }) => setCredits(data?.credits ?? 0));

    const channel = supabase
      // Unique per hook instance: supabase.channel() returns an existing channel
      // with the same name, and several screens use this hook at once.
      .channel(`profile:${userId}:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        (payload) => setCredits((payload.new as { credits: number }).credits),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  return credits;
}
