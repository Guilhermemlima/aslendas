import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { signMedia, type SignedMedia } from '@/services/media'
import { nextOccurrence } from '@/lib/date'
import type {
  BucketListItem,
  ImportantDate,
  Letter,
  Location,
  Media,
  Memory,
  ProfileItem,
  ProfileSection,
  Song,
  Surprise,
  TimeCapsule,
  TimelineEvent,
  UUID,
} from '@/types/db'

/* -------------------------------------------------------------- memórias -- */

export interface MemoryWithMedia extends Memory {
  media: SignedMedia[]
  cover: SignedMedia | null
}

export async function listMemories(
  coupleId: UUID,
  options: { limit?: number; favoritesOnly?: boolean; tag?: string; search?: string } = {},
): Promise<MemoryWithMedia[]> {
  const supabase = await createClient()
  let query = supabase
    .from('memories')
    .select('*, memory_media(media_id, sort_order)')
    .eq('couple_id', coupleId)
    .eq('is_intimate', false)
    .order('happened_on', { ascending: false, nullsFirst: false })
    .limit(options.limit ?? 100)

  if (options.favoritesOnly) query = query.eq('is_favorite', true)
  if (options.tag) query = query.contains('tags', [options.tag])
  if (options.search) query = query.ilike('title', `%${options.search}%`)

  const { data } = await query
  return hydrateMemories((data ?? []) as never[])
}

export async function getMemory(id: UUID): Promise<MemoryWithMedia | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('memories')
    .select('*, memory_media(media_id, sort_order)')
    .eq('id', id)
    .maybeSingle()
  if (!data) return null
  const [memory] = await hydrateMemories([data as never])
  return memory ?? null
}

export async function randomMemory(coupleId: UUID): Promise<MemoryWithMedia | null> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('memories')
    .select('id', { count: 'exact', head: true })
    .eq('couple_id', coupleId)
    .eq('is_intimate', false)
  if (!count) return null

  const offset = Math.floor(Math.random() * count)
  const { data } = await supabase
    .from('memories')
    .select('*, memory_media(media_id, sort_order)')
    .eq('couple_id', coupleId)
    .eq('is_intimate', false)
    .range(offset, offset)

  const [memory] = await hydrateMemories((data ?? []) as never[])
  return memory ?? null
}

type MemoryRow = Memory & { memory_media: { media_id: UUID; sort_order: number }[] }

async function hydrateMemories(rows: MemoryRow[]): Promise<MemoryWithMedia[]> {
  if (rows.length === 0) return []
  const supabase = await createClient()

  const ids = new Set<UUID>()
  for (const row of rows) {
    row.memory_media?.forEach((link) => ids.add(link.media_id))
    if (row.cover_media_id) ids.add(row.cover_media_id)
  }
  if (ids.size === 0) return rows.map((row) => ({ ...row, media: [], cover: null }))

  const { data } = await supabase.from('media').select('*').in('id', [...ids])
  const signed = await signMedia((data ?? []) as Media[])
  const map = new Map(signed.map((item) => [item.id, item]))

  return rows.map((row) => {
    const media = (row.memory_media ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((link) => map.get(link.media_id))
      .filter(Boolean) as SignedMedia[]
    return {
      ...row,
      media,
      cover: (row.cover_media_id ? map.get(row.cover_media_id) : null) ?? media[0] ?? null,
    }
  })
}

/* -------------------------------------------------------------- timeline -- */

export interface TimelineEventWithMedia extends TimelineEvent {
  media: SignedMedia[]
  location: Location | null
  song: Song | null
}

export async function listTimeline(coupleId: UUID): Promise<TimelineEventWithMedia[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('timeline_events')
    .select('*, timeline_event_media(media_id, sort_order), locations(*), songs(*)')
    .eq('couple_id', coupleId)
    .order('event_date', { ascending: true })
    .order('sort_order', { ascending: true })

  const rows = (data ?? []) as never as (TimelineEvent & {
    timeline_event_media: { media_id: UUID; sort_order: number }[]
    locations: Location | null
    songs: Song | null
  })[]

  const ids = new Set<UUID>()
  rows.forEach((row) => row.timeline_event_media?.forEach((l) => ids.add(l.media_id)))

  let map = new Map<UUID, SignedMedia>()
  if (ids.size > 0) {
    const { data: mediaRows } = await supabase.from('media').select('*').in('id', [...ids])
    const signed = await signMedia((mediaRows ?? []) as Media[])
    map = new Map(signed.map((item) => [item.id, item]))
  }

  return rows.map((row) => ({
    ...row,
    media: (row.timeline_event_media ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((link) => map.get(link.media_id))
      .filter(Boolean) as SignedMedia[],
    location: row.locations ?? null,
    song: row.songs ?? null,
  }))
}

/* ---------------------------------------------------------------- cartas -- */

export interface LetterWithMedia extends Letter {
  media: SignedMedia[]
}

/**
 * A RLS já esconde cartas programadas antes da data. Aqui só separamos as que
 * ainda estão fechadas para a pessoa que está lendo.
 */
export async function listLetters(coupleId: UUID): Promise<LetterWithMedia[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('letters')
    .select('*, letter_media(media_id, sort_order)')
    .eq('couple_id', coupleId)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })

  const rows = (data ?? []) as never as (Letter & {
    letter_media: { media_id: UUID; sort_order: number }[]
  })[]

  const ids = new Set<UUID>()
  rows.forEach((row) => row.letter_media?.forEach((l) => ids.add(l.media_id)))

  let map = new Map<UUID, SignedMedia>()
  if (ids.size > 0) {
    const { data: mediaRows } = await supabase.from('media').select('*').in('id', [...ids])
    const signed = await signMedia((mediaRows ?? []) as Media[])
    map = new Map(signed.map((item) => [item.id, item]))
  }

  return rows.map((row) => ({
    ...row,
    media: (row.letter_media ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((link) => map.get(link.media_id))
      .filter(Boolean) as SignedMedia[],
  }))
}

/* ------------------------------------------------------ cápsulas do tempo -- */

export interface CapsuleView extends TimeCapsule {
  unlocked: boolean
  message: string | null
  media: SignedMedia[]
}

export async function listCapsules(coupleId: UUID): Promise<CapsuleView[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('time_capsules')
    .select('*')
    .eq('couple_id', coupleId)
    .order('unlock_at', { ascending: true })

  const capsules = (data ?? []) as TimeCapsule[]
  if (capsules.length === 0) return []

  const now = Date.now()
  const unlockedIds = capsules.filter((c) => new Date(c.unlock_at).getTime() <= now).map((c) => c.id)

  // A RLS devolve apenas o conteúdo que a pessoa já pode ver.
  const [{ data: contents }, { data: links }] = await Promise.all([
    supabase.from('time_capsule_contents').select('*').in('capsule_id', capsules.map((c) => c.id)),
    supabase.from('time_capsule_media').select('*').in('capsule_id', unlockedIds.length ? unlockedIds : ['00000000-0000-0000-0000-000000000000']),
  ])

  const contentMap = new Map(
    ((contents ?? []) as { capsule_id: UUID; message: string }[]).map((c) => [c.capsule_id, c.message]),
  )

  const mediaIds = ((links ?? []) as { media_id: UUID }[]).map((l) => l.media_id)
  let mediaMap = new Map<UUID, SignedMedia>()
  if (mediaIds.length > 0) {
    const { data: mediaRows } = await supabase.from('media').select('*').in('id', mediaIds)
    const signed = await signMedia((mediaRows ?? []) as Media[])
    mediaMap = new Map(signed.map((item) => [item.id, item]))
  }

  return capsules.map((capsule) => {
    const unlocked = new Date(capsule.unlock_at).getTime() <= now
    const capsuleMedia = ((links ?? []) as { capsule_id: UUID; media_id: UUID }[])
      .filter((l) => l.capsule_id === capsule.id)
      .map((l) => mediaMap.get(l.media_id))
      .filter(Boolean) as SignedMedia[]

    return {
      ...capsule,
      unlocked,
      message: unlocked ? contentMap.get(capsule.id) ?? null : null,
      media: unlocked ? capsuleMedia : [],
    }
  })
}

/* ------------------------------------------------------ datas importantes -- */

export interface UpcomingDate extends ImportantDate {
  occursOn: Date
  daysAway: number
}

export async function listImportantDates(coupleId: UUID): Promise<ImportantDate[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('important_dates')
    .select('*')
    .eq('couple_id', coupleId)
    .order('date')
  return (data ?? []) as ImportantDate[]
}

export function upcomingDates(dates: ImportantDate[], limit = 5, from = new Date()): UpcomingDate[] {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate())

  return dates
    .map((item) => {
      const base = new Date(`${item.date}T12:00:00`)
      const occursOn = item.recurrence === 'anual' ? nextOccurrence(base, start) : base
      const daysAway = Math.round((occursOn.getTime() - start.getTime()) / 86_400_000)
      return { ...item, occursOn, daysAway }
    })
    .filter((item) => item.daysAway >= 0)
    .sort((a, b) => a.daysAway - b.daysAway)
    .slice(0, limit)
}

/* ------------------------------------------------------------- planos ----- */

export async function listBucketList(coupleId: UUID): Promise<BucketListItem[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('bucket_list')
    .select('*')
    .eq('couple_id', coupleId)
    .order('sort_order')
    .order('created_at', { ascending: false })
  return (data ?? []) as BucketListItem[]
}

export async function listLocations(coupleId: UUID): Promise<Location[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('locations')
    .select('*')
    .eq('couple_id', coupleId)
    .order('visited_on', { ascending: false, nullsFirst: false })
  return (data ?? []) as Location[]
}

export async function listSongs(coupleId: UUID): Promise<Song[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('songs')
    .select('*')
    .eq('couple_id', coupleId)
    .order('sort_order')
  return (data ?? []) as Song[]
}

/* ------------------------------------------------------------ sobre ela --- */

export interface ProfileSectionWithItems extends ProfileSection {
  items: ProfileItem[]
}

export async function listProfileSections(
  coupleId: UUID,
  subjectUserId: UUID,
): Promise<ProfileSectionWithItems[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profile_sections')
    .select('*, profile_items(*)')
    .eq('couple_id', coupleId)
    .eq('subject_user_id', subjectUserId)
    .order('sort_order')

  return ((data ?? []) as never as ProfileSectionWithItems[]).map((section) => ({
    ...section,
    items: [...(section.items ?? [])].sort((a, b) => a.sort_order - b.sort_order),
  }))
}

/* ------------------------------------------------------------- surpresas -- */

export interface SurpriseWithMedia extends Surprise {
  media: SignedMedia[]
}

/** Só devolve o que a RLS liberou: surpresas próprias ou já reveladas. */
export async function listSurprises(coupleId: UUID): Promise<SurpriseWithMedia[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('surprises')
    .select('*, surprise_media(media_id, sort_order)')
    .eq('couple_id', coupleId)
    .order('reveal_at', { ascending: false })

  const rows = (data ?? []) as never as (Surprise & {
    surprise_media: { media_id: UUID; sort_order: number }[]
  })[]

  const ids = new Set<UUID>()
  rows.forEach((row) => row.surprise_media?.forEach((l) => ids.add(l.media_id)))

  let map = new Map<UUID, SignedMedia>()
  if (ids.size > 0) {
    const { data: mediaRows } = await supabase.from('media').select('*').in('id', [...ids])
    const signed = await signMedia((mediaRows ?? []) as Media[])
    map = new Map(signed.map((item) => [item.id, item]))
  }

  return rows.map((row) => ({
    ...row,
    media: (row.surprise_media ?? [])
      .map((l) => map.get(l.media_id))
      .filter(Boolean) as SignedMedia[],
  }))
}

/** Surpresas que já chegaram a hora e ainda não foram vistas. */
export async function pendingSurprises(coupleId: UUID, userId: UUID): Promise<SurpriseWithMedia[]> {
  const all = await listSurprises(coupleId)
  const now = Date.now()
  return all.filter(
    (s) =>
      s.is_active &&
      new Date(s.reveal_at).getTime() <= now &&
      !s.revealed_at &&
      s.created_by !== userId &&
      (!s.target_user_id || s.target_user_id === userId),
  )
}
