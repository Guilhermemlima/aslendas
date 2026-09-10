import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { FinancialContribution, FinancialGoal, UUID } from '@/types/db'

export interface GoalWithProgress extends FinancialGoal {
  savedCents: number
  contributionCount: number
  firstContributionOn: string | null
  lastContributionOn: string | null
}

/**
 * Metas com o total já guardado.
 *
 * Os aportes vêm em uma consulta só e são somados aqui, em vez de uma consulta
 * por meta — o caminho até o banco é o gargalo, não a soma.
 */
export async function listGoals(coupleId: UUID): Promise<GoalWithProgress[]> {
  const supabase = await createClient()

  const [{ data: goals }, { data: contributions }] = await Promise.all([
    supabase
      .from('financial_goals')
      .select('*')
      .eq('couple_id', coupleId)
      .order('status')
      .order('target_date', { nullsFirst: false }),
    supabase
      .from('financial_contributions')
      .select('goal_id, amount_cents, contributed_on')
      .eq('couple_id', coupleId),
  ])

  const porMeta = new Map<UUID, { total: number; qtd: number; datas: string[] }>()
  for (const c of (contributions ?? []) as Pick<
    FinancialContribution,
    'goal_id' | 'amount_cents' | 'contributed_on'
  >[]) {
    const atual = porMeta.get(c.goal_id) ?? { total: 0, qtd: 0, datas: [] }
    atual.total += c.amount_cents
    atual.qtd += 1
    atual.datas.push(c.contributed_on)
    porMeta.set(c.goal_id, atual)
  }

  return ((goals ?? []) as FinancialGoal[]).map((goal) => {
    const agregado = porMeta.get(goal.id)
    const datas = (agregado?.datas ?? []).sort()
    return {
      ...goal,
      savedCents: agregado?.total ?? 0,
      contributionCount: agregado?.qtd ?? 0,
      firstContributionOn: datas[0] ?? null,
      lastContributionOn: datas.at(-1) ?? null,
    }
  })
}

export async function listContributions(goalId: UUID): Promise<FinancialContribution[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('financial_contributions')
    .select('*')
    .eq('goal_id', goalId)
    .order('contributed_on', { ascending: false })
    .limit(200)
  return (data ?? []) as FinancialContribution[]
}
