import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { UUID, WatchlistItem, WatchlistRating } from '@/types/db'

export interface WatchlistEntry extends WatchlistItem {
  ratings: WatchlistRating[]
}

/**
 * Lista com as notas já agregadas.
 *
 * Duas consultas em paralelo em vez de uma por item: o custo aqui é a ida até
 * o banco, não o volume de linhas.
 */
export async function listWatchlist(coupleId: UUID): Promise<WatchlistEntry[]> {
  const supabase = await createClient()

  const [{ data: itens }, { data: notas }] = await Promise.all([
    supabase
      .from('watchlist')
      .select('*')
      .eq('couple_id', coupleId)
      .order('sort_order')
      .order('created_at', { ascending: false }),
    supabase.from('watchlist_ratings').select('*').eq('couple_id', coupleId),
  ])

  const porItem = new Map<UUID, WatchlistRating[]>()
  for (const nota of (notas ?? []) as WatchlistRating[]) {
    porItem.set(nota.item_id, [...(porItem.get(nota.item_id) ?? []), nota])
  }

  return ((itens ?? []) as WatchlistItem[]).map((item) => ({
    ...item,
    ratings: porItem.get(item.id) ?? [],
  }))
}
