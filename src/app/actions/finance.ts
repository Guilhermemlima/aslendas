'use server'

import { revalidatePath } from 'next/cache'
import { actionContext, clean, fail, ok, type Result } from '@/app/actions/_helpers'
import { lerValorEmCentavos } from '@/lib/finance'
import { sanitizeText } from '@/lib/utils'
import type { GoalStatus } from '@/types/db'

/** Teto de sanidade: evita que um zero a mais vire uma meta absurda. */
const TETO_CENTS = 100_000_000_00 // R$ 100 milhões

export async function saveGoal(input: {
  id?: string
  title: string
  description?: string
  emoji?: string
  category?: string
  /** Como a pessoa digitou: "10000", "10.000,50", "R$ 10 mil"... */
  targetRaw: string
  targetDate?: string
}): Promise<Result<{ id: string }>> {
  const title = sanitizeText(input.title, 120)
  if (!title) return fail('Dê um nome para a meta.')

  const targetCents = lerValorEmCentavos(input.targetRaw)
  if (targetCents === null) return fail('Não entendi o valor. Tente algo como 10.000 ou 10000,50.')
  if (targetCents <= 0) return fail('O valor da meta precisa ser maior que zero.')
  if (targetCents > TETO_CENTS) return fail('Esse valor parece alto demais. Confira os zeros.')

  if (input.targetDate && input.targetDate < new Date().toISOString().slice(0, 10) && !input.id) {
    return fail('A data da meta já passou. Escolha uma data futura.')
  }

  const { supabase, coupleId, userId } = await actionContext()

  const row = {
    ...clean({
      couple_id: coupleId,
      title,
      description: input.description ? sanitizeText(input.description, 2000) : null,
      emoji: input.emoji ? sanitizeText(input.emoji, 8) : null,
      target_date: input.targetDate || null,
    }),
    category: input.category || 'viagem',
    target_cents: targetCents,
    created_by: userId,
  }

  const { data, error } = input.id
    ? await supabase.from('financial_goals').update(row).eq('id', input.id).select('id').single()
    : await supabase.from('financial_goals').insert(row).select('id').single()

  if (error) return fail(error.message)

  revalidatePath('/metas')
  return ok({ id: data.id as string })
}

export async function setGoalStatus(id: string, status: GoalStatus): Promise<Result> {
  const { supabase } = await actionContext()
  const { error } = await supabase.from('financial_goals').update({ status }).eq('id', id)
  if (error) return fail(error.message)
  revalidatePath('/metas')
  return ok()
}

export async function deleteGoal(id: string): Promise<Result> {
  const { supabase } = await actionContext()
  const { error } = await supabase.from('financial_goals').delete().eq('id', id)
  if (error) return fail(error.message)
  revalidatePath('/metas')
  return ok()
}

/**
 * Registra um aporte. `tipo` decide o sinal: guardar soma, retirar subtrai —
 * assim a mesma tela serve para os dois casos sem campo de número negativo.
 */
export async function addContribution(input: {
  goalId: string
  amountRaw: string
  tipo?: 'aporte' | 'retirada'
  contributedOn?: string
  note?: string
}): Promise<Result<{ id: string }>> {
  const valor = lerValorEmCentavos(input.amountRaw)
  if (valor === null) return fail('Não entendi o valor.')
  if (valor <= 0) return fail('Informe um valor maior que zero.')
  if (valor > TETO_CENTS) return fail('Esse valor parece alto demais. Confira os zeros.')

  const { supabase, coupleId, userId } = await actionContext()

  // Confere que a meta é deste casal antes de gravar: goal_id vem do cliente.
  const { data: goal } = await supabase
    .from('financial_goals')
    .select('id')
    .eq('id', input.goalId)
    .eq('couple_id', coupleId)
    .maybeSingle()

  if (!goal) return fail('Meta não encontrada.')

  const { data, error } = await supabase
    .from('financial_contributions')
    .insert({
      goal_id: input.goalId,
      couple_id: coupleId,
      amount_cents: input.tipo === 'retirada' ? -valor : valor,
      contributed_on: input.contributedOn || new Date().toISOString().slice(0, 10),
      note: input.note ? sanitizeText(input.note, 300) : null,
      created_by: userId,
    })
    .select('id')
    .single()

  if (error) return fail(error.message)

  revalidatePath('/metas')
  return ok({ id: data.id as string })
}

export async function deleteContribution(id: string): Promise<Result> {
  const { supabase } = await actionContext()
  const { error } = await supabase.from('financial_contributions').delete().eq('id', id)
  if (error) return fail(error.message)
  revalidatePath('/metas')
  return ok()
}
