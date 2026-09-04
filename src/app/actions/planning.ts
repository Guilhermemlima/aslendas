'use server'

import { revalidatePath } from 'next/cache'
import { actionContext, clean, fail, firstIssue, ok, type Result } from '@/app/actions/_helpers'
import {
  bucketItemSchema,
  importantDateSchema,
  locationSchema,
  songSchema,
} from '@/lib/validation'
import type { BucketItemInput, ImportantDateInput, LocationInput, SongInput } from '@/lib/validation'

/* ------------------------------------------------------ datas importantes -- */

export async function saveImportantDate(
  input: ImportantDateInput & { id?: string },
): Promise<Result<{ id: string }>> {
  const parsed = importantDateSchema.safeParse(input)
  if (!parsed.success) return fail(firstIssue(parsed.error))

  const { supabase, coupleId, userId } = await actionContext()
  const row = {
    ...clean({
      couple_id: coupleId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      end_date: parsed.data.end_date || null,
      color: parsed.data.color || null,
    }),
    date: parsed.data.date,
    recurrence: parsed.data.recurrence,
    category: parsed.data.category,
    notify_days_before: parsed.data.notify_days_before,
    created_by: userId,
  }

  const { data, error } = input.id
    ? await supabase.from('important_dates').update(row).eq('id', input.id).select('id').single()
    : await supabase.from('important_dates').insert(row).select('id').single()

  if (error) return fail(error.message)
  revalidatePath('/calendario')
  revalidatePath('/')
  return ok({ id: data.id as string })
}

export async function deleteImportantDate(id: string): Promise<Result> {
  const { supabase } = await actionContext()
  const { error } = await supabase.from('important_dates').delete().eq('id', id)
  if (error) return fail(error.message)
  revalidatePath('/calendario')
  return ok()
}

/* --------------------------------------------------------- lista de sonhos -- */

export async function saveBucketItem(
  input: BucketItemInput & { id?: string },
): Promise<Result<{ id: string }>> {
  const parsed = bucketItemSchema.safeParse(input)
  if (!parsed.success) return fail(firstIssue(parsed.error))

  const { supabase, coupleId, userId } = await actionContext()
  const row = {
    ...clean({
      couple_id: coupleId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      target_date: parsed.data.target_date || null,
    }),
    category: parsed.data.category || 'geral',
    status: parsed.data.status,
    priority: parsed.data.priority,
    created_by: userId,
  }

  const { data, error } = input.id
    ? await supabase.from('bucket_list').update(row).eq('id', input.id).select('id').single()
    : await supabase.from('bucket_list').insert(row).select('id').single()

  if (error) return fail(error.message)
  revalidatePath('/planos')
  return ok({ id: data.id as string })
}

/** Concluir um sonho carimba a data — é o gatilho do confete na tela. */
export async function setBucketStatus(
  id: string,
  status: 'quero' | 'planejado' | 'concluido',
): Promise<Result> {
  const { supabase } = await actionContext()
  const { error } = await supabase
    .from('bucket_list')
    .update({ status, completed_at: status === 'concluido' ? new Date().toISOString() : null })
    .eq('id', id)

  if (error) return fail(error.message)
  revalidatePath('/planos')
  return ok()
}

export async function deleteBucketItem(id: string): Promise<Result> {
  const { supabase } = await actionContext()
  const { error } = await supabase.from('bucket_list').delete().eq('id', id)
  if (error) return fail(error.message)
  revalidatePath('/planos')
  return ok()
}

export async function reorderBucketList(orderedIds: string[]): Promise<Result> {
  const { supabase, coupleId } = await actionContext()
  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from('bucket_list').update({ sort_order: index }).eq('id', id).eq('couple_id', coupleId),
    ),
  )
  const failed = results.find((result) => result.error)
  if (failed?.error) return fail(failed.error.message)
  revalidatePath('/planos')
  return ok()
}

/* ---------------------------------------------------------------- lugares -- */

export async function saveLocation(
  input: LocationInput & { id?: string },
): Promise<Result<{ id: string }>> {
  const parsed = locationSchema.safeParse(input)
  if (!parsed.success) return fail(firstIssue(parsed.error))

  const { supabase, coupleId, userId } = await actionContext()
  const row = {
    ...clean({
      couple_id: coupleId,
      name: parsed.data.name,
      city: parsed.data.city || null,
      country: parsed.data.country || null,
      visited_on: parsed.data.visited_on || null,
      story: parsed.data.story || null,
    }),
    latitude: parsed.data.latitude ?? null,
    longitude: parsed.data.longitude ?? null,
    created_by: userId,
  }

  const { data, error } = input.id
    ? await supabase.from('locations').update(row).eq('id', input.id).select('id').single()
    : await supabase.from('locations').insert(row).select('id').single()

  if (error) return fail(error.message)
  revalidatePath('/mapa')
  return ok({ id: data.id as string })
}

export async function deleteLocation(id: string): Promise<Result> {
  const { supabase } = await actionContext()
  const { error } = await supabase.from('locations').delete().eq('id', id)
  if (error) return fail(error.message)
  revalidatePath('/mapa')
  return ok()
}

/* ---------------------------------------------------------------- músicas -- */

export async function saveSong(input: SongInput & { id?: string }): Promise<Result<{ id: string }>> {
  const parsed = songSchema.safeParse(input)
  if (!parsed.success) return fail(firstIssue(parsed.error))

  const { supabase, coupleId, userId } = await actionContext()
  const row = {
    ...clean({
      couple_id: coupleId,
      title: parsed.data.title,
      artist: parsed.data.artist || null,
      url: parsed.data.url || null,
      reason: parsed.data.reason || null,
    }),
    provider: providerFromUrl(parsed.data.url),
    created_by: userId,
  }

  const { data, error } = input.id
    ? await supabase.from('songs').update(row).eq('id', input.id).select('id').single()
    : await supabase.from('songs').insert(row).select('id').single()

  if (error) return fail(error.message)
  revalidatePath('/playlist')
  return ok({ id: data.id as string })
}

export async function deleteSong(id: string): Promise<Result> {
  const { supabase } = await actionContext()
  const { error } = await supabase.from('songs').delete().eq('id', id)
  if (error) return fail(error.message)
  revalidatePath('/playlist')
  return ok()
}

export async function reorderSongs(orderedIds: string[]): Promise<Result> {
  const { supabase, coupleId } = await actionContext()
  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from('songs').update({ sort_order: index }).eq('id', id).eq('couple_id', coupleId),
    ),
  )
  const failed = results.find((result) => result.error)
  if (failed?.error) return fail(failed.error.message)
  revalidatePath('/playlist')
  return ok()
}

function providerFromUrl(url?: string | null): string | null {
  if (!url) return null
  if (url.includes('spotify')) return 'spotify'
  if (url.includes('youtube') || url.includes('youtu.be')) return 'youtube'
  if (url.includes('music.apple')) return 'apple'
  if (url.includes('deezer')) return 'deezer'
  return 'link'
}
