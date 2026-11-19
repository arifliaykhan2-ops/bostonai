import { useCallback, useEffect, useState } from 'react';
import type { Job } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth';

/** The signed-in user's jobs, newest first, kept live via Realtime. */
export function useJobs() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    setJobs((data as Job[] | null) ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    void refresh();

    const channel = supabase
      // Unique per hook instance (Gallery and the job screen can be mounted together).
      .channel(`jobs:${userId}:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'jobs', filter: `user_id=eq.${userId}` },
        () => void refresh(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  return { jobs, loading, refresh };
}

export function useJob(id: string) {
  const { jobs, loading } = useJobs();
  return { job: jobs.find((j) => j.id === id), loading };
}
