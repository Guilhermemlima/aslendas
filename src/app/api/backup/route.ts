import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCoupleContext, logSecurityEvent } from '@/services/session'
import { signMedia } from '@/services/media'
import type { Media } from '@/types/db'

export const dynamic = 'force-dynamic'

/**
 * Backup completo do casal em JSON.
 *
 * Roda com a sessão de quem pediu, então a RLS continua valendo: cada pessoa só
 * exporta o que já podia ver (cápsulas fechadas e surpresas futuras ficam fora).
 * As mídias saem como links assinados de 30 minutos, prontos para download.
 */
const TABLES = [
  'couples',
  'couple_members',
  'couple_settings',
  'profiles',
  'albums',
  'media',
  'locations',
  'songs',
  'memories',
  'memory_media',
  'timeline_events',
  'timeline_event_media',
  'letters',
  'letter_media',
  'time_capsules',
  'time_capsule_contents',
  'important_dates',
  'bucket_list',
  'profile_sections',
  'profile_items',
  'game_sessions',
  'game_answers',
  'couple_stats',
  'user_achievements',
  'surprises',
  'notifications',
] as const

/** Tabelas que não têm couple_id e precisam de outro filtro. */
const WITHOUT_COUPLE_ID = new Set([
  'profiles',
  'memory_media',
  'timeline_event_media',
  'letter_media',
])

export async function GET() {
  const context = await getCoupleContext()
  if (!context) {
    return NextResponse.json({ error: 'não autenticado' }, { status: 401 })
  }

  const supabase = await createClient()
  const data: Record<string, unknown[]> = {}

  for (const table of TABLES) {
    if (table === 'couples') {
      const { data: rows } = await supabase.from(table).select('*').eq('id', context.couple.id)
      data[table] = rows ?? []
      continue
    }
    if (table === 'profiles') {
      const { data: rows } = await supabase
        .from(table)
        .select('*')
        .in('id', context.members.map((member) => member.user_id))
      data[table] = rows ?? []
      continue
    }
    if (WITHOUT_COUPLE_ID.has(table)) {
      // A RLS destas tabelas já limita ao casal; basta ler tudo o que é visível.
      const { data: rows } = await supabase.from(table).select('*')
      data[table] = rows ?? []
      continue
    }

    const { data: rows } = await supabase.from(table).select('*').eq('couple_id', context.couple.id)
    data[table] = rows ?? []
  }

  // Links assinados para baixar os arquivos junto com o JSON.
  const signed = await signMedia((data.media ?? []) as Media[])
  data.media = signed.map((item) => ({ ...item, download_url: item.url }))

  await logSecurityEvent('backup_exportado', { tabelas: TABLES.length })

  const payload = {
    exportedAt: new Date().toISOString(),
    exportedBy: context.me.display_name,
    couple: context.couple.name,
    note: 'Os links de mídia valem 30 minutos. Baixe os arquivos logo após exportar.',
    data,
  }

  const stamp = new Date().toISOString().slice(0, 10)

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="nosso-universo-${stamp}.json"`,
      'Cache-Control': 'no-store',
    },
  })
}
