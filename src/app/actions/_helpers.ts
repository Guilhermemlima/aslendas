import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { requireCouple } from '@/services/session'
import { sanitizeText } from '@/lib/utils'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface Result<T = undefined> {
  ok: boolean
  error?: string
  data?: T
}

export const ok = <T>(data?: T): Result<T> => ({ ok: true, data })
export const fail = (error: string): Result<never> => ({ ok: false, error })

/** Contexto padrão de qualquer Server Action de conteúdo. */
export async function actionContext(): Promise<{
  supabase: SupabaseClient
  coupleId: string
  userId: string
}> {
  const [{ couple, userId }, supabase] = await Promise.all([requireCouple(), createClient()])
  return { supabase, coupleId: couple.id, userId }
}

/** Converte campos vazios do formulário em null e limpa texto livre. */
export function clean<T extends Record<string, unknown>>(input: T): T {
  const output: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === 'string') {
      const text = sanitizeText(value)
      output[key] = text === '' ? null : text
    } else {
      output[key] = value === undefined ? null : value
    }
  }
  return output as T
}

/** Lê um FormData respeitando os tipos que os schemas Zod esperam. */
export function formValues(formData: FormData): Record<string, unknown> {
  const values: Record<string, unknown> = {}
  for (const [key, value] of formData.entries()) {
    if (typeof value !== 'string') continue
    if (key.endsWith('[]')) {
      const name = key.slice(0, -2)
      const list = (values[name] as string[]) ?? []
      list.push(value)
      values[name] = list
    } else if (value === 'true' || value === 'false') {
      values[key] = value === 'true'
    } else {
      values[key] = value
    }
  }
  return values
}

export function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? 'Confira os campos preenchidos.'
}
