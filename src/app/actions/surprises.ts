'use server'

import { revalidatePath } from 'next/cache'
import { actionContext, fail, firstIssue, ok, type Result } from '@/app/actions/_helpers'
import { surpriseSchema } from '@/lib/validation'
import type { SurpriseInput } from '@/lib/validation'

/**
 * Surpresa programada. Enquanto reveal_at não chega, a RLS esconde a linha
 * inteira de quem vai receber — nem o título aparece.
 */
export async function saveSurprise(
  input: SurpriseInput & { id?: string; mediaIds?: string[]; targetUserId?: string | null; songId?: string | null },
): Promise<Result<{ id: string }>> {
  const parsed = surpriseSchema.safeParse(input)
  if (!parsed.success) return fail(firstIssue(parsed.error))

  const { supabase, coupleId, userId } = await actionContext()

  const row = {
    couple_id: coupleId,
    title: parsed.data.title,
    message: parsed.data.message,
    reveal_at: new Date(parsed.data.reveal_at).toISOString(),
    animation: parsed.data.animation,
    target_user_id: input.targetUserId ?? null,
    song_id: input.songId ?? null,
    created_by: userId,
  }

  const { data, error } = input.id
    ? await supabase.from('surprises').update(row).eq('id', input.id).select('id').single()
    : await supabase.from('surprises').insert(row).select('id').single()

  if (error) return fail(error.message)
  const surpriseId = data.id as string

  if (input.mediaIds) {
    await supabase.from('surprise_media').delete().eq('surprise_id', surpriseId)
    if (input.mediaIds.length > 0) {
      await supabase.from('surprise_media').insert(
        input.mediaIds.map((media_id, sort_order) => ({ surprise_id: surpriseId, media_id, sort_order })),
      )
    }
  }

  revalidatePath('/admin/surpresas')
  return ok({ id: surpriseId })
}

/** Chamado quando a pessoa vê a surpresa na tela pela primeira vez. */
export async function markSurpriseRevealed(id: string): Promise<Result> {
  const { supabase } = await actionContext()
  const { error } = await supabase
    .from('surprises')
    .update({ revealed_at: new Date().toISOString() })
    .eq('id', id)
    .is('revealed_at', null)

  if (error) return fail(error.message)
  revalidatePath('/')
  return ok()
}

export async function deleteSurprise(id: string): Promise<Result> {
  const { supabase } = await actionContext()
  const { error } = await supabase.from('surprises').delete().eq('id', id)
  if (error) return fail(error.message)
  revalidatePath('/admin/surpresas')
  return ok()
}

export async function setSurpriseActive(id: string, active: boolean): Promise<Result> {
  const { supabase } = await actionContext()
  const { error } = await supabase.from('surprises').update({ is_active: active }).eq('id', id)
  if (error) return fail(error.message)
  revalidatePath('/admin/surpresas')
  return ok()
}
