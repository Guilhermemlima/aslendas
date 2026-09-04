'use server'

import { revalidatePath } from 'next/cache'
import { actionContext, clean, fail, firstIssue, ok, type Result } from '@/app/actions/_helpers'
import { memorySchema, timelineEventSchema } from '@/lib/validation'
import type { MemoryInput, TimelineEventInput } from '@/lib/validation'

/* -------------------------------------------------------------- memórias -- */

export async function saveMemory(
  input: MemoryInput & { id?: string; mediaIds?: string[] },
): Promise<Result<{ id: string }>> {
  const parsed = memorySchema.safeParse(input)
  if (!parsed.success) return fail(firstIssue(parsed.error))

  const { supabase, coupleId, userId } = await actionContext()
  const payload = clean({
    couple_id: coupleId,
    title: parsed.data.title,
    description: parsed.data.description || null,
    happened_on: parsed.data.happened_on || null,
    emoji: parsed.data.emoji || null,
    location_id: parsed.data.location_id ?? null,
    song_id: parsed.data.song_id ?? null,
    cover_media_id: parsed.data.cover_media_id ?? null,
  })

  const row = {
    ...payload,
    tags: parsed.data.tags,
    is_favorite: parsed.data.is_favorite,
    created_by: userId,
  }

  const query = input.id
    ? supabase.from('memories').update(row).eq('id', input.id).select('id').single()
    : supabase.from('memories').insert(row).select('id').single()

  const { data, error } = await query
  if (error) return fail(error.message)

  const memoryId = data.id as string

  if (input.mediaIds) {
    await supabase.from('memory_media').delete().eq('memory_id', memoryId)
    if (input.mediaIds.length > 0) {
      await supabase.from('memory_media').insert(
        input.mediaIds.map((media_id, sort_order) => ({ memory_id: memoryId, media_id, sort_order })),
      )
    }
  }

  revalidatePath('/')
  revalidatePath('/historia')
  revalidatePath('/admin/memorias')
  return ok({ id: memoryId })
}

export async function deleteMemory(id: string): Promise<Result> {
  const { supabase } = await actionContext()
  const { error } = await supabase.from('memories').delete().eq('id', id)
  if (error) return fail(error.message)
  revalidatePath('/historia')
  revalidatePath('/admin/memorias')
  return ok()
}

export async function toggleMemoryFavorite(id: string, value: boolean): Promise<Result> {
  const { supabase } = await actionContext()
  const { error } = await supabase.from('memories').update({ is_favorite: value }).eq('id', id)
  if (error) return fail(error.message)
  revalidatePath('/historia')
  return ok()
}

/* -------------------------------------------------------------- timeline -- */

export async function saveTimelineEvent(
  input: TimelineEventInput & { id?: string; mediaIds?: string[] },
): Promise<Result<{ id: string }>> {
  const parsed = timelineEventSchema.safeParse(input)
  if (!parsed.success) return fail(firstIssue(parsed.error))

  const { supabase, coupleId, userId } = await actionContext()

  const row = {
    ...clean({
      couple_id: coupleId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      event_time: parsed.data.event_time || null,
      emoji: parsed.data.emoji || null,
      location_id: parsed.data.location_id ?? null,
      song_id: parsed.data.song_id ?? null,
    }),
    event_date: parsed.data.event_date,
    category: parsed.data.category,
    tags: parsed.data.tags,
    is_highlight: parsed.data.is_highlight,
    created_by: userId,
  }

  const query = input.id
    ? supabase.from('timeline_events').update(row).eq('id', input.id).select('id').single()
    : supabase.from('timeline_events').insert(row).select('id').single()

  const { data, error } = await query
  if (error) return fail(error.message)

  const eventId = data.id as string

  if (input.mediaIds) {
    await supabase.from('timeline_event_media').delete().eq('event_id', eventId)
    if (input.mediaIds.length > 0) {
      await supabase.from('timeline_event_media').insert(
        input.mediaIds.map((media_id, sort_order) => ({ event_id: eventId, media_id, sort_order })),
      )
    }
  }

  revalidatePath('/historia')
  revalidatePath('/admin/timeline')
  return ok({ id: eventId })
}

export async function deleteTimelineEvent(id: string): Promise<Result> {
  const { supabase } = await actionContext()
  const { error } = await supabase.from('timeline_events').delete().eq('id', id)
  if (error) return fail(error.message)
  revalidatePath('/historia')
  revalidatePath('/admin/timeline')
  return ok()
}

/** Reordenação vinda do drag-and-drop do painel administrativo. */
export async function reorderTimeline(orderedIds: string[]): Promise<Result> {
  const { supabase, coupleId } = await actionContext()

  const updates = orderedIds.map((id, index) =>
    supabase.from('timeline_events').update({ sort_order: index }).eq('id', id).eq('couple_id', coupleId),
  )
  const results = await Promise.all(updates)
  const failed = results.find((result) => result.error)
  if (failed?.error) return fail(failed.error.message)

  revalidatePath('/historia')
  revalidatePath('/admin/timeline')
  return ok()
}
