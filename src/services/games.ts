import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { INTENSITY } from '@/lib/constants'
import type {
  Achievement,
  CoupleStats,
  Game,
  GameAnswer,
  GameQuestion,
  GameSession,
  IntensityLevel,
  UserAchievement,
  UUID,
} from '@/types/db'
import { getActiveConsents, getIntimateSettings } from '@/services/intimate'

export async function listGames(options: { includeIntimate?: boolean } = {}): Promise<Game[]> {
  const supabase = await createClient()
  let query = supabase.from('games').select('*').eq('is_active', true).order('sort_order')
  if (!options.includeIntimate) query = query.eq('is_intimate', false)
  const { data } = await query
  return (data ?? []) as Game[]
}

export async function getGame(slug: string): Promise<Game | null> {
  const supabase = await createClient()
  const { data } = await supabase.from('games').select('*').eq('slug', slug).maybeSingle()
  return (data as Game) ?? null
}

/**
 * Perguntas disponíveis para um jogo.
 *
 * Para jogos íntimos o filtro é cumulativo e restritivo:
 *   1. a pergunta precisa estar dentro do nível máximo escolhido pela pessoa;
 *   2. a categoria não pode estar bloqueada por nenhuma das duas pessoas;
 *   3. a categoria precisa ter consentimento ativo dos dois lados.
 */
export async function listQuestions(
  game: Game,
  coupleId: UUID,
  userId: UUID,
): Promise<GameQuestion[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('game_questions')
    .select('*')
    .eq('game_id', game.id)
    .eq('is_active', true)
    .or(`couple_id.is.null,couple_id.eq.${coupleId}`)

  let questions = (data ?? []) as GameQuestion[]
  if (!game.is_intimate) return questions.filter((q) => !q.is_intimate)

  const [settings, consents] = await Promise.all([
    getIntimateSettings(coupleId, userId),
    getActiveConsents(coupleId),
  ])

  const maxRank = INTENSITY[settings?.max_intensity ?? 'leve'].rank
  const blocked = new Set(settings?.blocked_categories ?? [])
  const allowed = new Set(consents)

  questions = questions.filter((question) => {
    if (INTENSITY[question.intensity].rank > maxRank) return false
    if (question.consent_category && blocked.has(question.consent_category)) return false
    if (question.consent_category && !allowed.has(question.consent_category)) return false
    return true
  })

  return questions
}

export async function getSession(sessionId: UUID): Promise<GameSession | null> {
  const supabase = await createClient()
  const { data } = await supabase.from('game_sessions').select('*').eq('id', sessionId).maybeSingle()
  return (data as GameSession) ?? null
}

export async function getSessionAnswers(sessionId: UUID): Promise<GameAnswer[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('game_answers')
    .select('*')
    .eq('session_id', sessionId)
    .order('answered_at')
  return (data ?? []) as GameAnswer[]
}

export async function getQuestionsByIds(ids: UUID[]): Promise<GameQuestion[]> {
  if (ids.length === 0) return []
  const supabase = await createClient()
  const { data } = await supabase.from('game_questions').select('*').in('id', ids)
  const list = (data ?? []) as GameQuestion[]
  return ids.map((id) => list.find((q) => q.id === id)).filter(Boolean) as GameQuestion[]
}

export interface SessionHistoryEntry extends GameSession {
  game: Pick<Game, 'slug' | 'name' | 'icon'> | null
  answerCount: number
}

export async function listHistory(coupleId: UUID, limit = 20): Promise<SessionHistoryEntry[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('game_sessions')
    .select('*, games(slug, name, icon)')
    .eq('couple_id', coupleId)
    .order('started_at', { ascending: false })
    .limit(limit)

  const sessions = (data ?? []) as never as (GameSession & {
    games: Pick<Game, 'slug' | 'name' | 'icon'> | null
  })[]
  if (sessions.length === 0) return []

  const { data: counts } = await supabase
    .from('game_answers')
    .select('session_id')
    .in('session_id', sessions.map((s) => s.id))

  const tally = new Map<UUID, number>()
  for (const row of (counts ?? []) as { session_id: UUID }[]) {
    tally.set(row.session_id, (tally.get(row.session_id) ?? 0) + 1)
  }

  return sessions.map((session) => ({
    ...session,
    game: session.games,
    answerCount: tally.get(session.id) ?? 0,
  }))
}

export async function getStats(coupleId: UUID): Promise<CoupleStats> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('couple_stats')
    .select('*')
    .eq('couple_id', coupleId)
    .maybeSingle()

  return (
    (data as CoupleStats) ?? {
      couple_id: coupleId,
      xp: 0,
      points: 0,
      streak_days: 0,
      last_played_on: null,
      games_played: 0,
      questions_answered: 0,
      updated_at: new Date().toISOString(),
    }
  )
}

export interface AchievementView extends Achievement {
  unlocked: boolean
  unlockedAt: string | null
  progress: number
}

/** Progresso das conquistas calculado a partir das métricas reais do casal. */
export async function listAchievements(coupleId: UUID): Promise<AchievementView[]> {
  const supabase = await createClient()

  const [{ data: catalog }, { data: unlocked }, stats, metrics] = await Promise.all([
    supabase.from('achievements').select('*').order('sort_order'),
    supabase.from('user_achievements').select('*').eq('couple_id', coupleId),
    getStats(coupleId),
    collectMetrics(coupleId),
  ])

  const unlockedMap = new Map(
    ((unlocked ?? []) as UserAchievement[]).map((row) => [row.achievement_id, row.unlocked_at]),
  )

  const values: Record<string, number> = {
    ...metrics,
    games_played: stats.games_played,
    questions_answered: stats.questions_answered,
    streak_days: stats.streak_days,
  }

  return ((catalog ?? []) as Achievement[]).map((achievement) => {
    const current = values[achievement.criteria.metric] ?? 0
    const target = achievement.criteria.target || 1
    const unlockedAt = unlockedMap.get(achievement.id) ?? null
    return {
      ...achievement,
      unlocked: Boolean(unlockedAt) || current >= target,
      unlockedAt,
      progress: Math.min(1, current / target),
    }
  })
}

async function collectMetrics(coupleId: UUID): Promise<Record<string, number>> {
  const supabase = await createClient()
  const base = (table: string) =>
    supabase.from(table).select('id', { count: 'exact', head: true }).eq('couple_id', coupleId)

  const [memories, letters, lettersOpened, capsules, capsulesOpened, places, dreamsDone] =
    await Promise.all([
      base('memories'),
      base('letters'),
      base('letters').not('opened_at', 'is', null),
      base('time_capsules'),
      base('time_capsules').not('opened_at', 'is', null),
      base('locations'),
      base('bucket_list').eq('status', 'concluido'),
    ])

  const { data: couple } = await supabase
    .from('couples')
    .select('created_at')
    .eq('id', coupleId)
    .maybeSingle()

  const daysUsing = couple
    ? Math.floor((Date.now() - new Date(couple.created_at as string).getTime()) / 86_400_000)
    : 0

  return {
    memories: memories.count ?? 0,
    letters: letters.count ?? 0,
    letters_opened: lettersOpened.count ?? 0,
    capsules: capsules.count ?? 0,
    capsules_opened: capsulesOpened.count ?? 0,
    places: places.count ?? 0,
    dreams_done: dreamsDone.count ?? 0,
    days_using: daysUsing,
  }
}

/** Nível a partir do XP: cada faixa custa um pouco mais que a anterior. */
export function levelFromXp(xp: number): { level: number; current: number; needed: number } {
  let level = 1
  let remaining = xp
  let cost = 200
  while (remaining >= cost) {
    remaining -= cost
    level++
    cost = Math.round(cost * 1.25)
  }
  return { level, current: remaining, needed: cost }
}

export function intensityAtMost(level: IntensityLevel): IntensityLevel[] {
  const rank = INTENSITY[level].rank
  return (Object.keys(INTENSITY) as IntensityLevel[]).filter((key) => INTENSITY[key].rank <= rank)
}
