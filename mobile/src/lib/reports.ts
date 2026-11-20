import { supabase } from './supabase';

export type ReportTarget = 'job' | 'showcase' | 'effect';
export type ReportReason = 'sexual' | 'violent' | 'hateful' | 'real_person' | 'minor' | 'other';

/** Files a report (App Store guideline 1.2). Reporting the same item twice is not an error. */
export async function reportContent(targetType: ReportTarget, targetId: string, reason: ReportReason): Promise<void> {
  const { error } = await supabase.from('reports').insert({ target_type: targetType, target_id: targetId, reason });
  // 23505 = unique violation: this user already reported this item.
  if (error && error.code !== '23505') throw error;
}
