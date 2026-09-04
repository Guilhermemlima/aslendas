import 'server-only'

import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Couple, CoupleMember, CoupleSettings, Profile } from '@/types/db'

export interface CoupleContext {
  userId: string
  me: Profile
  partner: Profile | null
  couple: Couple
  settings: CoupleSettings
  members: CoupleMember[]
  isOwner: boolean
}

/**
 * Contexto do casal para a request atual. Memorizado por render para não
 * repetir as mesmas quatro queries em cada Server Component da página.
 */
export const getCoupleContext = cache(async (): Promise<CoupleContext | null> => {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: membership } = await supabase
    .from('couple_members')
    .select('couple_id, role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) return null

  const coupleId = membership.couple_id as string

  const [coupleRes, membersRes, settingsRes] = await Promise.all([
    supabase.from('couples').select('*').eq('id', coupleId).single(),
    supabase.from('couple_members').select('*').eq('couple_id', coupleId),
    supabase.from('couple_settings').select('*').eq('couple_id', coupleId).maybeSingle(),
  ])

  if (!coupleRes.data) return null

  const members = (membersRes.data ?? []) as CoupleMember[]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .in('id', members.map((m) => m.user_id))

  const list = (profiles ?? []) as Profile[]
  const me = list.find((p) => p.id === user.id)
  if (!me) return null

  const settings =
    (settingsRes.data as CoupleSettings | null) ??
    ({
      couple_id: coupleId,
      palette: 'rose',
      font: 'serif',
      animations: true,
      particles: true,
      ambient_song_id: null,
      hidden_pages: [],
      home_quote: null,
      intimate_enabled: false,
      updated_at: new Date().toISOString(),
    } satisfies CoupleSettings)

  return {
    userId: user.id,
    me,
    partner: list.find((p) => p.id !== user.id) ?? null,
    couple: coupleRes.data as Couple,
    settings,
    members,
    isOwner: membership.role === 'owner',
  }
})

/** Igual ao anterior, mas redireciona para o onboarding quando não há casal. */
export async function requireCouple(): Promise<CoupleContext> {
  const context = await getCoupleContext()
  if (!context) redirect('/comecar')
  return context
}

export async function requireUserId(): Promise<string> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/entrar')
  return user.id
}

/** Registro leve de auditoria — falhas nunca interrompem o fluxo do usuário. */
export async function logSecurityEvent(
  action: string,
  meta: Record<string, unknown> = {},
): Promise<void> {
  try {
    const supabase = await createClient()
    const context = await getCoupleContext()
    await supabase.from('security_logs').insert({
      couple_id: context?.couple.id ?? null,
      user_id: context?.userId ?? null,
      action,
      meta,
    })
  } catch {
    // auditoria é best-effort
  }
}
