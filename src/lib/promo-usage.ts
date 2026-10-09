import type { SupabaseClient } from '@supabase/supabase-js'

/** Release exactly one known failed reservation without overwriting concurrent uses. */
export async function releasePromoUsage(db: Pick<SupabaseClient, 'from'>, id: string): Promise<boolean> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data, error } = await db.from('promo_codes').select('used_count').eq('id', id).maybeSingle()
    if (error || !data || !Number.isSafeInteger(data.used_count) || data.used_count <= 0) return false
    const { data: released, error: updateError } = await db.from('promo_codes')
      .update({ used_count: data.used_count - 1 }).eq('id', id).eq('used_count', data.used_count)
      .select('id').maybeSingle()
    // A transport error may follow a committed decrement; never retry it.
    if (updateError) return false
    if (released) return true
    // A successful empty response means the compare-and-swap lost a race: reread.
  }
  return false
}
