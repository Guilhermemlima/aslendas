import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { SIGNED_URL_TTL } from '@/lib/constants'
import type { Album, Media, UUID } from '@/types/db'

export interface SignedMedia extends Media {
  url: string | null
}

/**
 * Assina em lote as URLs de um conjunto de mídias.
 * Nenhuma URL permanente é exposta: cada link vale por SIGNED_URL_TTL segundos.
 */
export async function signMedia(items: Media[]): Promise<SignedMedia[]> {
  if (items.length === 0) return []
  const supabase = await createClient()

  const byBucket = new Map<string, Media[]>()
  for (const item of items) {
    const list = byBucket.get(item.bucket) ?? []
    list.push(item)
    byBucket.set(item.bucket, list)
  }

  const urls = new Map<string, string>()
  await Promise.all(
    [...byBucket.entries()].map(async ([bucket, list]) => {
      const { data } = await supabase.storage
        .from(bucket)
        .createSignedUrls(list.map((m) => m.path), SIGNED_URL_TTL)
      data?.forEach((entry, index) => {
        const media = list[index]
        if (entry.signedUrl && media) urls.set(media.id, entry.signedUrl)
      })
    }),
  )

  return items.map((item) => ({ ...item, url: urls.get(item.id) ?? null }))
}

export async function signOne(media: Media | null): Promise<SignedMedia | null> {
  if (!media) return null
  const [signed] = await signMedia([media])
  return signed ?? null
}

export interface MediaFilters {
  albumId?: UUID | null
  kind?: 'image' | 'video' | 'audio'
  favoritesOnly?: boolean
  year?: number
  tag?: string
  search?: string
  includeIntimate?: boolean
  limit?: number
}

export async function listMedia(coupleId: UUID, filters: MediaFilters = {}): Promise<SignedMedia[]> {
  const supabase = await createClient()
  let query = supabase
    .from('media')
    .select('*')
    .eq('couple_id', coupleId)
    .order('taken_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(filters.limit ?? 200)

  // Mídia marcada como íntima nunca vaza para a galeria comum.
  if (!filters.includeIntimate) query = query.eq('is_intimate', false)
  if (filters.albumId) query = query.eq('album_id', filters.albumId)
  if (filters.kind) query = query.eq('kind', filters.kind)
  if (filters.favoritesOnly) query = query.eq('is_favorite', true)
  if (filters.tag) query = query.contains('tags', [filters.tag])
  if (filters.search) query = query.ilike('caption', `%${filters.search}%`)
  if (filters.year) {
    query = query
      .gte('taken_at', `${filters.year}-01-01`)
      .lte('taken_at', `${filters.year}-12-31T23:59:59`)
  }

  const { data } = await query
  return signMedia((data ?? []) as Media[])
}

export async function listAlbums(coupleId: UUID): Promise<Album[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('albums')
    .select('*')
    .eq('couple_id', coupleId)
    .order('sort_order')
  return (data ?? []) as Album[]
}

/** "Neste dia": fotos tiradas no mesmo dia e mês, em anos anteriores. */
export async function onThisDay(coupleId: UUID, reference = new Date()): Promise<SignedMedia[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('media')
    .select('*')
    .eq('couple_id', coupleId)
    .eq('is_intimate', false)
    .not('taken_at', 'is', null)
    .order('taken_at', { ascending: false })
    .limit(500)

  const day = reference.getDate()
  const month = reference.getMonth()
  const year = reference.getFullYear()

  const matches = ((data ?? []) as Media[]).filter((item) => {
    if (!item.taken_at) return false
    const taken = new Date(item.taken_at)
    return taken.getDate() === day && taken.getMonth() === month && taken.getFullYear() < year
  })

  return signMedia(matches.slice(0, 12))
}

export async function randomMedia(coupleId: UUID): Promise<SignedMedia | null> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('media')
    .select('id', { count: 'exact', head: true })
    .eq('couple_id', coupleId)
    .eq('kind', 'image')
    .eq('is_intimate', false)

  if (!count) return null
  const offset = Math.floor(Math.random() * count)
  const { data } = await supabase
    .from('media')
    .select('*')
    .eq('couple_id', coupleId)
    .eq('kind', 'image')
    .eq('is_intimate', false)
    .range(offset, offset)

  return signOne(((data ?? []) as Media[])[0] ?? null)
}

export async function getMediaByIds(ids: UUID[]): Promise<SignedMedia[]> {
  if (ids.length === 0) return []
  const supabase = await createClient()
  const { data } = await supabase.from('media').select('*').in('id', ids)
  const signed = await signMedia((data ?? []) as Media[])
  // Preserva a ordem pedida pelo chamador.
  return ids.map((id) => signed.find((m) => m.id === id)).filter(Boolean) as SignedMedia[]
}

export async function listYears(coupleId: UUID): Promise<number[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('media')
    .select('taken_at, created_at')
    .eq('couple_id', coupleId)
    .eq('is_intimate', false)
    .limit(2000)

  const years = new Set<number>()
  for (const row of data ?? []) {
    const value = (row.taken_at as string | null) ?? (row.created_at as string)
    years.add(new Date(value).getFullYear())
  }
  return [...years].sort((a, b) => b - a)
}

export async function listTags(coupleId: UUID): Promise<string[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('media')
    .select('tags')
    .eq('couple_id', coupleId)
    .limit(2000)

  const tags = new Set<string>()
  for (const row of data ?? []) {
    for (const tag of (row.tags as string[]) ?? []) tags.add(tag)
  }
  return [...tags].sort()
}
