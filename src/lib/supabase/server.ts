import 'server-only'

import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient as createRawClient, type SupabaseClient } from '@supabase/supabase-js'

import { requireSupabaseEnv } from '@/lib/env'

/** Cliente para Server Components, Server Actions e Route Handlers. */
export async function createClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies()
  const { url, anonKey } = requireSupabaseEnv()

  return createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
          try {
            list.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Server Component não pode escrever cookies; o middleware renova a
            // sessão a cada request, então é seguro ignorar aqui.
          }
        },
      },
    },
  )
}

/**
 * Cliente com service role. IGNORA a RLS — use somente em código de servidor e
 * sempre validando manualmente a quem pertence o dado.
 * Hoje é usado apenas pelo cron de surpresas e pela exportação de backup.
 */
export function createAdminClient(): SupabaseClient {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada')

  return createRawClient(requireSupabaseEnv().url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
