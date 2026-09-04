import { requireCouple } from '@/services/session'
import { createClient } from '@/lib/supabase/server'
import { Wrapped } from '@/features/retrospective/wrapped'
import { PageTransition } from '@/components/motion/reveal'

export const metadata = { title: 'Retrospectiva · Nosso Universo' }

export interface YearSummary {
  year: number
  photos: number
  videos: number
  memories: number
  events: number
  letters: number
  games: number
  places: number
  dreams_done: number
  capsules_opened: number
  top_tags: { tag: string; total: number }[]
}

export default async function RetrospectivePage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string }>
}) {
  const params = await searchParams
  const { couple } = await requireCouple()

  const year = Number(params.ano) || new Date().getFullYear()
  const supabase = await createClient()

  // A agregação roda no Postgres — uma chamada em vez de dez consultas.
  const { data } = await supabase.rpc('year_in_review', {
    target_couple: couple.id,
    target_year: year,
  })

  const summary = (data ?? {}) as Partial<YearSummary>
  const startYear = new Date(`${couple.started_at}T12:00:00`).getFullYear()
  const years = Array.from(
    { length: Math.max(1, new Date().getFullYear() - startYear + 1) },
    (_, index) => startYear + index,
  ).reverse()

  return (
    <PageTransition>
      <Wrapped
        coupleName={couple.name}
        years={years}
        summary={{
          year,
          photos: summary.photos ?? 0,
          videos: summary.videos ?? 0,
          memories: summary.memories ?? 0,
          events: summary.events ?? 0,
          letters: summary.letters ?? 0,
          games: summary.games ?? 0,
          places: summary.places ?? 0,
          dreams_done: summary.dreams_done ?? 0,
          capsules_opened: summary.capsules_opened ?? 0,
          top_tags: summary.top_tags ?? [],
        }}
      />
    </PageTransition>
  )
}
