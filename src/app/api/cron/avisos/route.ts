import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { nextOccurrence } from '@/lib/date'
import type { ImportantDate, Surprise, TimeCapsule } from '@/types/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Cron diário (Vercel Cron -> /api/cron/avisos).
 *
 * Cria notificações para datas que estão chegando, cápsulas que abriram e
 * surpresas que chegaram a hora. Usa service role porque roda sem sessão —
 * por isso o segredo do header é obrigatório e nada aqui devolve conteúdo.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const provided = request.headers.get('authorization')?.replace('Bearer ', '')

  if (!secret || provided !== secret) {
    return NextResponse.json({ error: 'não autorizado' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const now = new Date()
  const created: string[] = []

  /* ------------------------------------------------ datas se aproximando -- */
  const { data: dates } = await supabase.from('important_dates').select('*')

  for (const date of (dates ?? []) as ImportantDate[]) {
    const base = new Date(`${date.date}T12:00:00`)
    const target = date.recurrence === 'anual' ? nextOccurrence(base, now) : base
    const daysAway = Math.round((target.getTime() - now.getTime()) / 86_400_000)

    if (!date.notify_days_before.includes(daysAway)) continue

    const key = `data:${date.id}:${target.toISOString().slice(0, 10)}:${daysAway}`
    if (await alreadyNotified(supabase, date.couple_id, key)) continue

    await supabase.from('notifications').insert({
      couple_id: date.couple_id,
      kind: 'data',
      title: daysAway === 0 ? `Hoje: ${date.title}` : `Faltam ${daysAway} dias para ${date.title}`,
      body: date.description,
      link: '/calendario',
    })
    created.push(key)
  }

  /* ---------------------------------------------------- cápsulas abertas -- */
  const { data: capsules } = await supabase
    .from('time_capsules')
    .select('*')
    .lte('unlock_at', now.toISOString())
    .is('opened_at', null)

  for (const capsule of (capsules ?? []) as TimeCapsule[]) {
    const key = `capsula:${capsule.id}`
    if (await alreadyNotified(supabase, capsule.couple_id, key)) continue

    await supabase.from('notifications').insert({
      couple_id: capsule.couple_id,
      kind: 'capsula',
      title: 'Uma cápsula do tempo está pronta para abrir',
      body: capsule.title,
      link: '/capsulas',
    })
    created.push(key)
  }

  /* --------------------------------------------------- surpresas na hora -- */
  const { data: surprises } = await supabase
    .from('surprises')
    .select('*')
    .lte('reveal_at', now.toISOString())
    .is('revealed_at', null)
    .eq('is_active', true)

  for (const surprise of (surprises ?? []) as Surprise[]) {
    const key = `surpresa:${surprise.id}`
    if (await alreadyNotified(supabase, surprise.couple_id, key)) continue

    // O título nunca entra na notificação: a surpresa é vista no app.
    await supabase.from('notifications').insert({
      couple_id: surprise.couple_id,
      user_id: surprise.target_user_id,
      kind: 'surpresa',
      title: 'Tem algo esperando por você',
      body: 'Abra o Nosso Universo quando puder.',
      link: '/',
    })
    created.push(key)
  }

  return NextResponse.json({ ok: true, created: created.length })
}

/**
 * Deduplicação simples: o `key` vai no log de segurança e é consultado antes de
 * criar a notificação, evitando avisos repetidos se o cron rodar duas vezes.
 */
async function alreadyNotified(
  supabase: ReturnType<typeof createAdminClient>,
  coupleId: string,
  key: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('security_logs')
    .select('id')
    .eq('couple_id', coupleId)
    .eq('action', 'notificacao_enviada')
    .contains('meta', { key })
    .maybeSingle()

  if (data) return true

  await supabase.from('security_logs').insert({
    couple_id: coupleId,
    action: 'notificacao_enviada',
    meta: { key },
  })
  return false
}
