'use server'

import { revalidatePath } from 'next/cache'
import { actionContext, fail, firstIssue, ok, type Result } from '@/app/actions/_helpers'
import { gameQuestionSchema } from '@/lib/validation'
import { usaBancoDePerguntas } from '@/lib/constants'
import { getGame, listQuestions } from '@/services/games'
import { getCoupleContext } from '@/services/session'
import { shuffle, sanitizeText } from '@/lib/utils'
import type { GameAnswer, GameMode, GameQuestion, GameSession } from '@/types/db'

export interface StartedSession {
  session: GameSession
  questions: GameQuestion[]
}

/** Cria a sessão já com a lista de perguntas sorteada e travada. */
export async function startSession(input: {
  slug: string
  mode: GameMode
  rounds?: number
}): Promise<Result<StartedSession>> {
  const context = await getCoupleContext()
  if (!context) return fail('Sessão expirada.')

  const game = await getGame(input.slug)
  if (!game) return fail('Jogo não encontrado.')
  if (!game.modes.includes(input.mode)) return fail('Este modo não está disponível para o jogo.')

  const pool = await listQuestions(game, context.couple.id, context.userId)
  // Roletas e os "adivinhe" não sorteiam do banco: para eles, pool vazio é normal.
  if (usaBancoDePerguntas(game.slug) && pool.length === 0) {
    return fail(
      game.is_intimate
        ? 'Nenhuma pergunta liberada. Confira o consentimento e o nível de intensidade.'
        : 'Ainda não há perguntas para este jogo.',
    )
  }

  const rounds = Math.min(Math.max(input.rounds ?? 8, 3), 20)
  const questions = shuffle(pool).slice(0, rounds)

  const { supabase, coupleId, userId } = await actionContext()
  const { data, error } = await supabase
    .from('game_sessions')
    .insert({
      couple_id: coupleId,
      game_id: game.id,
      mode: input.mode,
      question_ids: questions.map((q) => q.id),
      settings: { rounds },
      created_by: userId,
    })
    .select('*')
    .single()

  if (error) return fail(error.message)

  return ok({ session: data as GameSession, questions })
}

export async function submitAnswer(input: {
  sessionId: string
  questionId: string
  value: string
  aboutUserId?: string | null
  isCorrect?: boolean | null
  points?: number
}): Promise<Result<{ answerId: string }>> {
  const { supabase, coupleId, userId } = await actionContext()

  const payload = {
    answer: { value: sanitizeText(input.value, 2000) },
    is_correct: input.isCorrect ?? null,
    points: Math.max(0, Math.min(input.points ?? 0, 100)),
  }

  // O índice único da tabela é uma expressão com coalesce(), que o PostgREST não
  // consegue inferir em upsert. Então: atualiza se já existe, insere se não.
  const { data: existing } = await supabase
    .from('game_answers')
    .select('id')
    .eq('session_id', input.sessionId)
    .eq('question_id', input.questionId)
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase.from('game_answers').update(payload).eq('id', existing.id)
    if (error) return fail(error.message)
    return ok({ answerId: existing.id as string })
  }

  const { data, error } = await supabase
    .from('game_answers')
    .insert({
      session_id: input.sessionId,
      couple_id: coupleId,
      question_id: input.questionId,
      user_id: userId,
      about_user_id: input.aboutUserId ?? null,
      ...payload,
    })
    .select('id')
    .single()

  if (error) return fail(error.message)
  return ok({ answerId: data.id as string })
}

export interface SecretReveal {
  ready: boolean
  answers: { userId: string; value: string }[]
  match: boolean | null
}

/**
 * Modo "Resposta Secreta": só devolve as respostas quando as duas pessoas
 * responderam. Antes disso a própria RLS já esconde a resposta do outro.
 */
export async function revealSecret(sessionId: string, questionId: string): Promise<Result<SecretReveal>> {
  const { supabase, coupleId } = await actionContext()

  const [{ data: answers }, { data: members }] = await Promise.all([
    supabase.from('game_answers').select('user_id, answer').eq('session_id', sessionId).eq('question_id', questionId),
    supabase.from('couple_members').select('user_id').eq('couple_id', coupleId),
  ])

  const list = (answers ?? []) as Pick<GameAnswer, 'user_id' | 'answer'>[]
  const ready = list.length >= (members ?? []).length && list.length >= 2

  if (!ready) return ok({ ready: false, answers: [], match: null })

  const values = list.map((row) => ({ userId: row.user_id, value: String(row.answer?.value ?? '') }))
  const normalized = values.map((v) => v.value.trim().toLowerCase())
  const match = normalized.every((value) => value === normalized[0])

  return ok({ ready: true, answers: values, match })
}

/**
 * Fecha a sessão, grava o placar e atualiza XP, pontos e sequência.
 *
 * `localScores` cobre os jogos sem banco de perguntas (roleta, adivinhe a foto,
 * adivinhe a memória), em que a pontuação é apurada na tela.
 */
export async function finishSession(
  sessionId: string,
  localScores: Record<string, number> = {},
): Promise<Result<{ scores: Record<string, number> }>> {
  const { supabase, coupleId } = await actionContext()

  const { data: answers } = await supabase
    .from('game_answers')
    .select('user_id, points')
    .eq('session_id', sessionId)

  const scores: Record<string, number> = {}
  let total = 0
  for (const row of (answers ?? []) as { user_id: string; points: number }[]) {
    scores[row.user_id] = (scores[row.user_id] ?? 0) + row.points
    total += row.points
  }

  if ((answers ?? []).length === 0) {
    for (const [userId, value] of Object.entries(localScores)) {
      const points = Math.max(0, Math.min(value, 500))
      scores[userId] = points
      total += points
    }
  }

  const { error } = await supabase
    .from('game_sessions')
    .update({ status: 'finalizada', ended_at: new Date().toISOString(), scores })
    .eq('id', sessionId)

  if (error) return fail(error.message)

  await supabase.rpc('register_game_progress', {
    target_couple: coupleId,
    gained_points: total,
    gained_xp: Math.round(total * 1.5) + 20,
    answered: (answers ?? []).length,
    finished_game: true,
  })

  revalidatePath('/jogos')
  return ok({ scores })
}

export async function abandonSession(sessionId: string): Promise<Result> {
  const { supabase } = await actionContext()
  const { error } = await supabase
    .from('game_sessions')
    .update({ status: 'abandonada', ended_at: new Date().toISOString() })
    .eq('id', sessionId)
  if (error) return fail(error.message)
  revalidatePath('/jogos')
  return ok()
}

/* ------------------------------------------- perguntas próprias do casal --- */

export async function saveQuestion(input: {
  id?: string
  gameSlug: string
  content: string
  options?: string[]
  category?: string
  intensity?: 'leve' | 'intermediario' | 'ousado'
  isIntimate?: boolean
  consentCategory?: string
}): Promise<Result<{ id: string }>> {
  const parsed = gameQuestionSchema.safeParse({
    content: input.content,
    options: input.options ?? [],
    category: input.category ?? '',
    intensity: input.intensity ?? 'leve',
    is_intimate: input.isIntimate ?? false,
    consent_category: input.consentCategory ?? '',
  })
  if (!parsed.success) return fail(firstIssue(parsed.error))

  const game = await getGame(input.gameSlug)
  if (!game) return fail('Jogo não encontrado.')

  const { supabase, coupleId, userId } = await actionContext()
  const row = {
    game_id: game.id,
    couple_id: coupleId,
    content: parsed.data.content,
    options: parsed.data.options,
    category: parsed.data.category || null,
    intensity: parsed.data.intensity,
    is_intimate: game.is_intimate || parsed.data.is_intimate,
    consent_category: parsed.data.consent_category || null,
    created_by: userId,
  }

  const { data, error } = input.id
    ? await supabase.from('game_questions').update(row).eq('id', input.id).select('id').single()
    : await supabase.from('game_questions').insert(row).select('id').single()

  if (error) return fail(error.message)
  revalidatePath('/admin/jogos')
  return ok({ id: data.id as string })
}

export async function setQuestionActive(id: string, active: boolean): Promise<Result> {
  const { supabase } = await actionContext()
  const { error } = await supabase.from('game_questions').update({ is_active: active }).eq('id', id)
  if (error) return fail('Só dá para desativar perguntas criadas por vocês.')
  revalidatePath('/admin/jogos')
  return ok()
}

export async function deleteQuestion(id: string): Promise<Result> {
  const { supabase } = await actionContext()
  const { error } = await supabase.from('game_questions').delete().eq('id', id)
  if (error) return fail(error.message)
  revalidatePath('/admin/jogos')
  return ok()
}
