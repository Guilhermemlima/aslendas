import Link from 'next/link'
import { requireCouple } from '@/services/session'
import { createClient } from '@/lib/supabase/server'
import { listGames } from '@/services/games'
import { QuestionsAdmin } from '@/features/admin/questions-admin'
import { SectionHeading } from '@/components/ui/misc'
import { PageTransition } from '@/components/motion/reveal'
import type { GameQuestion } from '@/types/db'

export const metadata = { title: 'Perguntas · Painel' }

export default async function GameQuestionsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ jogo?: string }>
}) {
  const params = await searchParams
  const { couple } = await requireCouple()

  const games = await listGames({ includeIntimate: true })
  const selected = games.find((game) => game.slug === params.jogo) ?? games[0]

  const supabase = await createClient()
  const { data } = await supabase
    .from('game_questions')
    .select('*')
    .eq('game_id', selected?.id ?? '')
    .or(`couple_id.is.null,couple_id.eq.${couple.id}`)
    .order('couple_id', { nullsFirst: false })
    .order('created_at')

  const questions = (data ?? []) as GameQuestion[]

  return (
    <PageTransition className="space-y-8">
      <Link href="/admin" className="inline-block text-sm text-ink-soft hover:text-rose-700">
        ← Voltar ao painel
      </Link>

      <SectionHeading
        eyebrow="Painel"
        title="Perguntas dos jogos"
        description="Crie perguntas sobre a história de vocês e desative as que não combinam."
      />

      <QuestionsAdmin
        games={games.map((game) => ({
          slug: game.slug,
          name: game.name,
          isIntimate: game.is_intimate,
        }))}
        selectedSlug={selected?.slug ?? ''}
        questions={questions.map((question) => ({
          id: question.id,
          content: question.content,
          options: question.options,
          category: question.category,
          intensity: question.intensity,
          isActive: question.is_active,
          isGlobal: question.couple_id === null,
        }))}
      />
    </PageTransition>
  )
}
