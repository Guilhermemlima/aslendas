'use server'

import { revalidatePath } from 'next/cache'
import { actionContext, clean, fail, firstIssue, ok, type Result } from '@/app/actions/_helpers'
import { letterSchema, timeCapsuleSchema } from '@/lib/validation'
import type { LetterInput, TimeCapsuleInput } from '@/lib/validation'

/* ----------------------------------------------------------------- cartas -- */

export async function saveLetter(
  input: LetterInput & { id?: string; mediaIds?: string[]; recipientId?: string | null },
): Promise<Result<{ id: string }>> {
  const parsed = letterSchema.safeParse(input)
  if (!parsed.success) return fail(firstIssue(parsed.error))

  const { supabase, coupleId, userId } = await actionContext()

  const row = {
    ...clean({
      couple_id: coupleId,
      title: parsed.data.title,
      body: parsed.data.body,
      open_condition: parsed.data.open_condition || null,
      song_id: parsed.data.song_id ?? null,
    }),
    letter_type: parsed.data.letter_type,
    envelope_style: parsed.data.envelope_style,
    deliver_at: parsed.data.deliver_at ? new Date(parsed.data.deliver_at).toISOString() : null,
    recipient_id: input.recipientId ?? null,
    author_id: userId,
  }

  const query = input.id
    ? supabase.from('letters').update(row).eq('id', input.id).select('id').single()
    : supabase.from('letters').insert(row).select('id').single()

  const { data, error } = await query
  if (error) return fail(error.message)

  const letterId = data.id as string

  if (input.mediaIds) {
    await supabase.from('letter_media').delete().eq('letter_id', letterId)
    if (input.mediaIds.length > 0) {
      await supabase.from('letter_media').insert(
        input.mediaIds.map((media_id, sort_order) => ({ letter_id: letterId, media_id, sort_order })),
      )
    }
  }

  revalidatePath('/cartas')
  revalidatePath('/')
  return ok({ id: letterId })
}

/** Marca a carta como aberta na primeira leitura de quem a recebeu. */
export async function markLetterOpened(id: string): Promise<Result> {
  const { supabase, userId } = await actionContext()

  const { data: letter } = await supabase
    .from('letters')
    .select('author_id, opened_at')
    .eq('id', id)
    .maybeSingle()

  if (!letter || letter.opened_at || letter.author_id === userId) return ok()

  const { error } = await supabase
    .from('letters')
    .update({ opened_at: new Date().toISOString(), opened_by: userId })
    .eq('id', id)

  if (error) return fail(error.message)
  revalidatePath('/cartas')
  return ok()
}

export async function deleteLetter(id: string): Promise<Result> {
  const { supabase } = await actionContext()
  const { error } = await supabase.from('letters').delete().eq('id', id)
  if (error) return fail(error.message)
  revalidatePath('/cartas')
  return ok()
}

export async function archiveLetter(id: string, archived: boolean): Promise<Result> {
  const { supabase } = await actionContext()
  const { error } = await supabase.from('letters').update({ is_archived: archived }).eq('id', id)
  if (error) return fail(error.message)
  revalidatePath('/cartas')
  return ok()
}

/* -------------------------------------------------------- cápsulas do tempo */

export async function saveCapsule(
  input: TimeCapsuleInput & { mediaIds?: string[] },
): Promise<Result<{ id: string }>> {
  const parsed = timeCapsuleSchema.safeParse(input)
  if (!parsed.success) return fail(firstIssue(parsed.error))

  const { supabase, coupleId, userId } = await actionContext()

  const { data, error } = await supabase
    .from('time_capsules')
    .insert({
      couple_id: coupleId,
      title: parsed.data.title,
      unlock_at: new Date(parsed.data.unlock_at).toISOString(),
      created_by: userId,
    })
    .select('id')
    .single()

  if (error) return fail(error.message)
  const capsuleId = data.id as string

  // A mensagem vive em outra tabela para que a RLS possa escondê-la.
  const { error: contentError } = await supabase.from('time_capsule_contents').insert({
    capsule_id: capsuleId,
    couple_id: coupleId,
    message: parsed.data.message,
  })
  if (contentError) {
    await supabase.from('time_capsules').delete().eq('id', capsuleId)
    return fail(contentError.message)
  }

  if (input.mediaIds?.length) {
    await supabase.from('time_capsule_media').insert(
      input.mediaIds.map((media_id, sort_order) => ({ capsule_id: capsuleId, media_id, sort_order })),
    )
  }

  revalidatePath('/capsulas')
  return ok({ id: capsuleId })
}

export async function openCapsule(id: string): Promise<Result> {
  const { supabase, userId } = await actionContext()

  const { data: capsule } = await supabase
    .from('time_capsules')
    .select('unlock_at, opened_at')
    .eq('id', id)
    .maybeSingle()

  if (!capsule) return fail('Cápsula não encontrada.')
  if (new Date(capsule.unlock_at as string).getTime() > Date.now()) {
    return fail('Esta cápsula ainda não pode ser aberta.')
  }
  if (capsule.opened_at) return ok()

  const { error } = await supabase
    .from('time_capsules')
    .update({ opened_at: new Date().toISOString(), opened_by: userId })
    .eq('id', id)

  if (error) return fail(error.message)
  revalidatePath('/capsulas')
  return ok()
}

export async function deleteCapsule(id: string): Promise<Result> {
  const { supabase } = await actionContext()
  const { error } = await supabase.from('time_capsules').delete().eq('id', id)
  if (error) return fail('Só dá para apagar uma cápsula antes da data de abertura.')
  revalidatePath('/capsulas')
  return ok()
}
