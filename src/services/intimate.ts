import 'server-only'

import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import type { ConsentCategory, ConsentGrant, ConsentRequest, IntimateSettings, UUID } from '@/types/db'

/** Duração da sessão desbloqueada da área íntima. */
export const INTIMATE_SESSION_MINUTES = 30
const COOKIE_NAME = 'nu_intimate'

/* ------------------------------------------------------------------ PIN --- */

export function hashPin(pin: string): string {
  const salt = randomBytes(16)
  const derived = scryptSync(pin, salt, 64)
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`
}

export function verifyPin(pin: string, stored: string | null): boolean {
  if (!stored) return false
  const [algo, saltHex, hashHex] = stored.split('$')
  if (algo !== 'scrypt' || !saltHex || !hashHex) return false
  const derived = scryptSync(pin, Buffer.from(saltHex, 'hex'), 64)
  const expected = Buffer.from(hashHex, 'hex')
  if (derived.length !== expected.length) return false
  return timingSafeEqual(derived, expected)
}

/**
 * Marca a sessão como desbloqueada. O cookie é httpOnly e de vida curta —
 * ele só diz "esta pessoa digitou o PIN há pouco", nunca guarda conteúdo.
 */
export async function unlockIntimateSession(userId: UUID): Promise<void> {
  const store = await cookies()
  const expires = Date.now() + INTIMATE_SESSION_MINUTES * 60_000
  store.set(COOKIE_NAME, `${userId}:${expires}`, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: INTIMATE_SESSION_MINUTES * 60,
  })
}

export async function lockIntimateSession(): Promise<void> {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}

export async function isIntimateUnlocked(userId: UUID): Promise<boolean> {
  const store = await cookies()
  const raw = store.get(COOKIE_NAME)?.value
  if (!raw) return false
  const [owner, expires] = raw.split(':')
  return owner === userId && Number(expires) > Date.now()
}

/* ------------------------------------------------------------ preferências */

export async function getIntimateSettings(
  coupleId: UUID,
  userId: UUID,
): Promise<IntimateSettings | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('intimate_settings')
    .select('*')
    .eq('couple_id', coupleId)
    .eq('user_id', userId)
    .maybeSingle()
  return (data as IntimateSettings) ?? null
}

/* ---------------------------------------------------------- consentimento -- */

export async function listConsentCategories(): Promise<ConsentCategory[]> {
  const supabase = await createClient()
  const { data } = await supabase.from('consent_categories').select('*').order('sort_order')
  return (data ?? []) as ConsentCategory[]
}

export async function listGrants(coupleId: UUID): Promise<ConsentGrant[]> {
  const supabase = await createClient()
  const { data } = await supabase.from('consent_grants').select('*').eq('couple_id', coupleId)
  return (data ?? []) as ConsentGrant[]
}

export async function listConsentRequests(coupleId: UUID): Promise<ConsentRequest[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('consent_requests')
    .select('*')
    .eq('couple_id', coupleId)
    .order('created_at', { ascending: false })
  return (data ?? []) as ConsentRequest[]
}

/**
 * Categorias liberadas: exigem grant vigente das DUAS pessoas do casal.
 * Um "sim" sozinho nunca libera nada.
 */
export async function getActiveConsents(coupleId: UUID): Promise<string[]> {
  const supabase = await createClient()

  const [{ data: grants }, { data: members }] = await Promise.all([
    supabase.from('consent_grants').select('user_id, category_code').eq('couple_id', coupleId).is('revoked_at', null),
    supabase.from('couple_members').select('user_id').eq('couple_id', coupleId),
  ])

  const required = (members ?? []).length
  if (required < 2) return []

  const tally = new Map<string, Set<string>>()
  for (const grant of (grants ?? []) as { user_id: string; category_code: string }[]) {
    const set = tally.get(grant.category_code) ?? new Set<string>()
    set.add(grant.user_id)
    tally.set(grant.category_code, set)
  }

  return [...tally.entries()]
    .filter(([, users]) => users.size >= required)
    .map(([code]) => code)
}

export interface ConsentState {
  category: ConsentCategory
  active: boolean
  mineGranted: boolean
  partnerGranted: boolean
  pendingRequest: ConsentRequest | null
}

export async function getConsentOverview(
  coupleId: UUID,
  userId: UUID,
  partnerId: UUID | null,
): Promise<ConsentState[]> {
  const [categories, grants, requests, active] = await Promise.all([
    listConsentCategories(),
    listGrants(coupleId),
    listConsentRequests(coupleId),
    getActiveConsents(coupleId),
  ])

  const activeSet = new Set(active)

  return categories.map((category) => {
    const forCategory = grants.filter((g) => g.category_code === category.code && !g.revoked_at)
    return {
      category,
      active: activeSet.has(category.code),
      mineGranted: forCategory.some((g) => g.user_id === userId),
      partnerGranted: Boolean(partnerId) && forCategory.some((g) => g.user_id === partnerId),
      pendingRequest:
        requests.find((r) => r.category_code === category.code && r.status === 'pendente') ?? null,
    }
  })
}
