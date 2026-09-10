'use server'

import { revalidatePath } from 'next/cache'
import { actionContext, clean, fail, ok, type Result } from '@/app/actions/_helpers'
import { sanitizeText } from '@/lib/utils'
import type { WatchKind, WatchStatus } from '@/types/db'

export async function saveWatchItem(input: {
  id?: string
  title: string
  kind?: WatchKind
  platform?: string
  genre?: string
  year?: string
  note?: string
}): Promise<Result<{ id: string }>> {
  const title = sanitizeText(input.title, 160)
  if (!title) return fail('Informe o nome do filme ou série.')

  const ano = input.year ? Number(input.year) : null
  if (ano !== null && (!Number.isInteger(ano) || ano < 1888 || ano > 2200)) {
    return fail('Ano inválido.')
  }

  const { supabase, coupleId, userId } = await actionContext()

  const row = {
    ...clean({
      couple_id: coupleId,
      title,
      platform: input.platform ? sanitizeText(input.platform, 60) : null,
      genre: input.genre ? sanitizeText(input.genre, 60) : null,
      note: input.note ? sanitizeText(input.note, 1000) : null,
    }),
    kind: input.kind ?? 'filme',
    year: ano,
    created_by: userId,
  }

  const { data, error } = input.id
    ? await supabase.from('watchlist').update(row).eq('id', input.id).select('id').single()
    : await supabase.from('watchlist').insert(row).select('id').single()

  if (error) return fail(error.message)

  revalidatePath('/assistir')
  return ok({ id: data.id as string })
}

/** Muda o status. Marcar como assistido carimba a data automaticamente. */
export async function setWatchStatus(id: string, status: WatchStatus): Promise<Result> {
  const { supabase } = await actionContext()

  const { error } = await supabase
    .from('watchlist')
    .update({
      status,
      watched_on: status === 'assistido' ? new Date().toISOString().slice(0, 10) : null,
    })
    .eq('id', id)

  if (error) return fail(error.message)
  revalidatePath('/assistir')
  return ok()
}

/** Progresso de série. Passar null zera o campo. */
export async function setWatchProgress(input: {
  id: string
  season?: number | null
  episode?: number | null
}): Promise<Result> {
  const { supabase } = await actionContext()

  const temporada = input.season ?? null
  const episodio = input.episode ?? null
  if (temporada !== null && temporada < 1) return fail('Temporada inválida.')
  if (episodio !== null && episodio < 1) return fail('Episódio inválido.')

  const { error } = await supabase
    .from('watchlist')
    .update({ season: temporada, episode: episodio, status: 'assistindo' })
    .eq('id', input.id)

  if (error) return fail(error.message)
  revalidatePath('/assistir')
  return ok()
}

/** Nota de quem está logado. A RLS garante que ninguém escreve pela outra pessoa. */
export async function rateWatchItem(input: {
  itemId: string
  rating: number
  comment?: string
}): Promise<Result> {
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    return fail('A nota vai de 1 a 5.')
  }

  const { supabase, coupleId, userId } = await actionContext()

  const { error } = await supabase.from('watchlist_ratings').upsert(
    {
      item_id: input.itemId,
      couple_id: coupleId,
      user_id: userId,
      rating: input.rating,
      comment: input.comment ? sanitizeText(input.comment, 500) : null,
    },
    { onConflict: 'item_id,user_id' },
  )

  if (error) return fail(error.message)
  revalidatePath('/assistir')
  return ok()
}

export async function deleteWatchItem(id: string): Promise<Result> {
  const { supabase } = await actionContext()
  const { error } = await supabase.from('watchlist').delete().eq('id', id)
  if (error) return fail(error.message)
  revalidatePath('/assistir')
  return ok()
}
