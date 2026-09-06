'use server'

import { revalidatePath } from 'next/cache'
import { actionContext, fail, ok, type Result } from '@/app/actions/_helpers'
import { intimatePreferencesSchema, pinSchema } from '@/lib/validation'
import {
  assertIntimateAccess,
  getIntimateSettings,
  hashPin,
  lockIntimateSession,
  unlockIntimateSession,
  verifyPin,
} from '@/services/intimate'
import { logSecurityEvent } from '@/services/session'
import { sanitizeText } from '@/lib/utils'
import type { IntensityLevel } from '@/types/db'

/**
 * Ativação da área íntima. Exige, nesta ordem:
 *   1. confirmação de maioridade;
 *   2. PIN próprio (independente da senha da conta);
 *   3. consentimento das duas pessoas para cada categoria de conteúdo.
 */
export async function confirmAdultAndSetPin(input: { pin: string }): Promise<Result> {
  const parsed = pinSchema.safeParse({ pin: input.pin })
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'PIN inválido.')

  const { supabase, coupleId, userId } = await actionContext()
  const now = new Date().toISOString()

  const { error } = await supabase.from('intimate_settings').upsert({
    couple_id: coupleId,
    user_id: userId,
    pin_hash: hashPin(parsed.data.pin),
    adult_confirmed_at: now,
    is_enabled: true,
    updated_at: now,
  })
  if (error) return fail(error.message)

  await supabase.from('profiles').update({ adult_confirmed_at: now }).eq('id', userId)
  await unlockIntimateSession(userId)
  await logSecurityEvent('area_intima_ativada')

  revalidatePath('/intimo')
  return ok()
}

export async function unlockWithPin(input: { pin: string }): Promise<Result> {
  const { coupleId, userId } = await actionContext()
  const settings = await getIntimateSettings(coupleId, userId)

  if (!settings?.pin_hash) return fail('Você ainda não configurou um PIN.')

  if (!verifyPin(input.pin, settings.pin_hash)) {
    await logSecurityEvent('pin_incorreto')
    return fail('PIN incorreto.')
  }

  await unlockIntimateSession(userId)
  await logSecurityEvent('area_intima_desbloqueada')
  revalidatePath('/intimo')
  return ok()
}

export async function lockIntimateArea(): Promise<Result> {
  await lockIntimateSession()
  revalidatePath('/intimo')
  return ok()
}

export async function changePin(input: { currentPin: string; newPin: string }): Promise<Result> {
  const parsed = pinSchema.safeParse({ pin: input.newPin })
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'PIN inválido.')

  const { supabase, coupleId, userId } = await actionContext()
  const settings = await getIntimateSettings(coupleId, userId)
  if (!verifyPin(input.currentPin, settings?.pin_hash ?? null)) return fail('PIN atual incorreto.')

  const { error } = await supabase
    .from('intimate_settings')
    .update({ pin_hash: hashPin(parsed.data.pin), updated_at: new Date().toISOString() })
    .eq('couple_id', coupleId)
    .eq('user_id', userId)

  if (error) return fail(error.message)
  await logSecurityEvent('pin_alterado')
  return ok()
}

export async function saveIntimatePreferences(input: {
  max_intensity: IntensityLevel
  blocked_categories: string[]
}): Promise<Result> {
  const parsed = intimatePreferencesSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Dados inválidos.')

  const { supabase, coupleId, userId } = await actionContext()
  const { error } = await supabase
    .from('intimate_settings')
    .update({
      max_intensity: parsed.data.max_intensity,
      blocked_categories: parsed.data.blocked_categories,
      updated_at: new Date().toISOString(),
    })
    .eq('couple_id', coupleId)
    .eq('user_id', userId)

  if (error) return fail(error.message)
  revalidatePath('/intimo')
  return ok()
}

/** Desliga a área íntima só para quem chamou, sem afetar o outro perfil. */
export async function disableIntimateArea(): Promise<Result> {
  const { supabase, coupleId, userId } = await actionContext()
  const { error } = await supabase
    .from('intimate_settings')
    .update({ is_enabled: false, updated_at: new Date().toISOString() })
    .eq('couple_id', coupleId)
    .eq('user_id', userId)

  if (error) return fail(error.message)
  await lockIntimateSession()
  await logSecurityEvent('area_intima_desativada')
  revalidatePath('/intimo')
  return ok()
}

/* -------------------------------------------------------- consentimento --- */

export async function requestConsent(input: { categoryCode: string; message?: string }): Promise<Result> {
  const { supabase, coupleId, userId } = await actionContext()

  const { data: existing } = await supabase
    .from('consent_requests')
    .select('id')
    .eq('couple_id', coupleId)
    .eq('category_code', input.categoryCode)
    .eq('status', 'pendente')
    .maybeSingle()

  if (existing) return fail('Já existe um pedido em aberto para esta categoria.')

  const { error } = await supabase.from('consent_requests').insert({
    couple_id: coupleId,
    category_code: input.categoryCode,
    requested_by: userId,
    message: input.message ? sanitizeText(input.message, 500) : null,
  })
  if (error) return fail(error.message)

  // A notificação é neutra: nunca revela conteúdo da área íntima.
  await supabase.from('notifications').insert({
    couple_id: coupleId,
    kind: 'consentimento',
    title: 'Existe um pedido esperando sua resposta',
    body: 'Abra as configurações de consentimento quando puder.',
    link: '/intimo/consentimento',
    is_intimate: true,
  })

  revalidatePath('/intimo/consentimento')
  return ok()
}

/** A aprovação só vale quando vem da outra pessoa — a regra vive no Postgres. */
export async function respondConsent(requestId: string, approve: boolean): Promise<Result> {
  const { supabase } = await actionContext()
  const { error } = await supabase.rpc('respond_consent_request', {
    request_id: requestId,
    approve,
  })
  if (error) return fail(error.message)

  await logSecurityEvent(approve ? 'consentimento_aprovado' : 'consentimento_recusado')
  revalidatePath('/intimo/consentimento')
  revalidatePath('/intimo')
  return ok()
}

/** Retirar consentimento bloqueia a categoria imediatamente para os dois. */
export async function revokeConsent(categoryCode: string): Promise<Result> {
  const { supabase } = await actionContext()
  const { error } = await supabase.rpc('revoke_consent', { code: categoryCode })
  if (error) return fail(error.message)

  await logSecurityEvent('consentimento_revogado', { categoria: categoryCode })
  revalidatePath('/intimo/consentimento')
  revalidatePath('/intimo')
  return ok()
}

/* --------------------------------------------------- registro de intimidade */

const dataValida = (valor: string) => /^\d{4}-\d{2}-\d{2}$/.test(valor)

/** Marca ou desmarca um dia. É o toque simples no calendário. */
export async function toggleIntimateDay(
  date: string,
): Promise<Result<{ marcado: boolean }>> {
  if (!dataValida(date)) return fail('Data inválida.')

  const { supabase, coupleId, userId } = await actionContext()
  const acesso = await assertIntimateAccess(coupleId, userId)
  if (!acesso.ok) return fail(acesso.motivo)

  // Registrar no futuro não faz sentido e sujaria as estatísticas.
  if (date > new Date().toISOString().slice(0, 10)) {
    return fail('Não dá para marcar um dia que ainda não chegou.')
  }

  const { data: existente } = await supabase
    .from('intimate_log')
    .select('id')
    .eq('couple_id', coupleId)
    .eq('happened_on', date)
    .maybeSingle()

  if (existente) {
    const { error } = await supabase.from('intimate_log').delete().eq('id', existente.id)
    if (error) return fail(error.message)
    revalidatePath('/intimo/registro')
    return ok({ marcado: false })
  }

  const { error } = await supabase
    .from('intimate_log')
    .insert({ couple_id: coupleId, happened_on: date, created_by: userId })

  if (error) return fail(error.message)
  revalidatePath('/intimo/registro')
  return ok({ marcado: true })
}

/** Detalhes de um dia já marcado: quantas vezes, humor e anotação. */
export async function saveIntimateEntry(input: {
  date: string
  vezes?: number
  note?: string
  mood?: string
}): Promise<Result> {
  if (!dataValida(input.date)) return fail('Data inválida.')

  const { supabase, coupleId, userId } = await actionContext()
  const acesso = await assertIntimateAccess(coupleId, userId)
  if (!acesso.ok) return fail(acesso.motivo)

  const { error } = await supabase.from('intimate_log').upsert(
    {
      couple_id: coupleId,
      happened_on: input.date,
      vezes: Math.max(1, Math.min(input.vezes ?? 1, 20)),
      note: input.note ? sanitizeText(input.note, 500) : null,
      mood: input.mood ? sanitizeText(input.mood, 40) : null,
      created_by: userId,
    },
    { onConflict: 'couple_id,happened_on' },
  )

  if (error) return fail(error.message)
  revalidatePath('/intimo/registro')
  return ok()
}
