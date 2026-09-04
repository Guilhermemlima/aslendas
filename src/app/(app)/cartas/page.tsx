import { requireCouple } from '@/services/session'
import { listLetters, listSongs } from '@/services/content'
import { LettersBoard } from '@/features/letters/letters-board'
import { SectionHeading } from '@/components/ui/misc'
import { PageTransition } from '@/components/motion/reveal'

export const metadata = { title: 'Cartas · Nosso Universo' }

export default async function LettersPage() {
  const { couple, me, partner } = await requireCouple()
  const [letters, songs] = await Promise.all([listLetters(couple.id), listSongs(couple.id)])

  return (
    <PageTransition className="space-y-8">
      <SectionHeading
        eyebrow="Palavras guardadas"
        title="Cartas"
        description="Cartas comuns, programadas e aquelas para abrir quando a vida pedir."
      />

      <LettersBoard
        meId={me.id}
        partnerId={partner?.id ?? null}
        partnerName={partner?.display_name ?? null}
        songs={songs.map((song) => ({ id: song.id, title: song.title, artist: song.artist }))}
        letters={letters.map((letter) => ({
          id: letter.id,
          title: letter.title,
          body: letter.body,
          type: letter.letter_type,
          condition: letter.open_condition,
          deliverAt: letter.deliver_at,
          style: letter.envelope_style,
          authorId: letter.author_id,
          openedAt: letter.opened_at,
          createdAt: letter.created_at,
          media: letter.media.map((item) => ({ id: item.id, url: item.url, kind: item.kind })),
        }))}
      />
    </PageTransition>
  )
}
