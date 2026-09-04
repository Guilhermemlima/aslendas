'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { formatDate } from '@/lib/date'

export interface GuessMemory {
  id: string
  title: string
  description: string | null
  happenedOn: string | null
  coverUrl: string | null
}

/**
 * Mostra pistas de uma memória (trecho da descrição, depois a foto)
 * e só no fim revela o título e a data.
 */
export function MemoryGuess({
  memory,
  onResult,
}: {
  memory: GuessMemory
  onResult: (correct: boolean) => void
}) {
  const [clue, setClue] = useState(0)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    setClue(0)
    setRevealed(false)
  }, [memory.id])

  const snippet = memory.description?.slice(0, clue === 0 ? 80 : 240) ?? 'Sem descrição guardada.'

  return (
    <Card>
      <CardBody className="space-y-5 p-6">
        <div>
          <p className="label mb-1">Adivinhe a memória</p>
          <p className="text-sm text-ink-soft">Que dia foi esse?</p>
        </div>

        <blockquote className="rounded-2xl border-l-2 border-rose-300 bg-rose-50/60 px-4 py-3 font-hand text-lg leading-relaxed text-ink-soft">
          {snippet}
          {memory.description && memory.description.length > snippet.length ? '...' : ''}
        </blockquote>

        {clue >= 1 && memory.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={memory.coverUrl}
            alt=""
            className="aspect-[4/3] w-full rounded-2xl object-cover"
            style={{ filter: revealed ? 'none' : 'blur(6px)' }}
          />
        )}

        {!revealed ? (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" disabled={clue >= 2} onClick={() => setClue((c) => c + 1)}>
              Mais uma pista
            </Button>
            <Button className="flex-1" onClick={() => setRevealed(true)}>
              Revelar
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl bg-gold/10 px-4 py-3 text-center">
              <p className="font-display text-xl text-ink">{memory.title}</p>
              {memory.happenedOn && (
                <p className="text-sm text-ink-soft">{formatDate(`${memory.happenedOn}T12:00:00`)}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => onResult(false)}>
                Não lembrei
              </Button>
              <Button onClick={() => onResult(true)}>Lembrei!</Button>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  )
}
