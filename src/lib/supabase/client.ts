'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

import { requireSupabaseEnv } from '@/lib/env'

let cached: SupabaseClient | null = null

/**
 * Cliente do browser. Usa apenas a anon key — toda a proteção de dados vem da
 * RLS no Postgres, nunca de esconder chaves no frontend.
 */
export function createClient(): SupabaseClient {
  if (cached) return cached
  const { url, anonKey } = requireSupabaseEnv()
  cached = createBrowserClient(url, anonKey)
  return cached
}
