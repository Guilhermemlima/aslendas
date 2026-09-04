'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Textarea } from '@/components/ui/field'
import { Badge } from '@/components/ui/misc'
import { cn } from '@/lib/utils'
import type { GameMode, GameQuestion } from '@/types/db'
import type { PlayerPerson } from '@/features/games/game-player'
import type { SecretReveal } from '@/app/actions/games'

/**
 * Um cartão de pergunta. O formato do controle muda conforme o jogo:
 * escolha entre opções, escolha entre as duas pessoas, confissão ou texto livre.
 * No modo "secreto", a resposta fica escondida até os dois responderem.
 */
export function QuestionCard({
  slug,
  mode,
  question,
  me,
  partner,
  onAnswer,
  onReveal,
  onNext,
}: {
  slug: string
  mode: GameMode
  question: GameQuestion
  me: PlayerPerson
  partner: PlayerPerson | null
  onAnswer: (value: string, points: number, aboutUserId?: string | null) => Promise<void>
  onReveal: () => Promise<SecretReveal>
  onNext: (points: Record<string, number>) => void
}) {
  const [answered, setAnswered] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [reveal, setReveal] = useState<SecretReveal | null>(null)
  const [text, setText] = useState('')

  const layout = layoutFor(slug, question)

  async function submit(value: string, points: number) {
    if (!value.trim()) return
    setBusy(true)
    setAnswered(value)
    await onAnswer(value, points, slug === 'quem-conhece-melhor' ? (partner?.id ?? null) : null)
    setBusy(false)
  }

  async function handleReveal() {
    setBusy(true)
    const result = await onReveal()
    setReveal(result)
    setBusy(false)
  }

  const waitingPartner = mode === 'secreto' && answered && !reveal?.ready

  return (
    <Card className="overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-rose-300 to-lilac-300" />
      <CardBody className="space-y-5 p-6">
        <div className="flex flex-wrap items-center gap-2">
          {question.category && <Badge tone="neutral">{question.category}</Badge>}
          {mode === 'secreto' && (
            <Badge tone="lilac">
              <EyeOff className="h-3 w-3" /> resposta secreta
            </Badge>
          )}
        </div>

        <p className="text-balance font-display text-2xl leading-snug text-ink">{question.content}</p>

        {/* -------------------------------------------------- controles --- */}
        {!answered && (
          <div className="space-y-2">
            {layout === 'options' &&
              question.options.map((option, optionIndex) => (
                <motion.button
                  key={option}
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  disabled={busy}
                  onClick={() => void submit(option, 5)}
                  className="focus-ring block w-full rounded-2xl border border-line bg-surface/70 px-4 py-3.5 text-left text-[0.95rem] text-ink transition-colors hover:border-rose-300 hover:bg-rose-50"
                >
                  <span className="mr-2 font-medium text-rose-500">{String.fromCharCode(65 + optionIndex)}.</span>
                  {option}
                </motion.button>
              ))}

            {layout === 'people' && (
              <div className="grid grid-cols-2 gap-2">
                {[me, partner ?? { id: 'parceiro', name: 'Sua pessoa' }].map((person) => (
                  <motion.button
                    key={person.id}
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    disabled={busy}
                    onClick={() => void submit(person.name, 5)}
                    className="focus-ring rounded-2xl border border-line bg-surface/70 px-4 py-5 text-center font-medium text-ink transition-colors hover:border-rose-300 hover:bg-rose-50"
                  >
                    {person.name}
                  </motion.button>
                ))}
              </div>
            )}

            {layout === 'confession' && (
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="lg" disabled={busy} onClick={() => void submit('Eu nunca', 5)}>
                  Eu nunca
                </Button>
                <Button variant="secondary" size="lg" disabled={busy} onClick={() => void submit('Eu já', 5)}>
                  Eu já 🙈
                </Button>
              </div>
            )}

            {layout === 'truth-dare' && (
              <div className="space-y-3">
                <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-ink-soft">
                  {question.category === 'desafio' ? '⚡ Desafio' : '💬 Verdade'}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="lg" disabled={busy} onClick={() => void submit('Passei', 0)}>
                    Passar
                  </Button>
                  <Button size="lg" disabled={busy} onClick={() => void submit('Cumpri', 10)}>
                    Cumpri!
                  </Button>
                </div>
              </div>
            )}

            {layout === 'text' && (
              <div className="space-y-3">
                <Textarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="Escreva a sua resposta..."
                  className="min-h-[6rem]"
                />
                <Button className="w-full" disabled={busy || !text.trim()} onClick={() => void submit(text, 8)}>
                  Responder
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------- resposta --- */}
        {answered && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-rose-50 px-4 py-3">
              <p className="label mb-1">Sua resposta</p>
              <p className="text-[0.95rem] text-ink">{answered}</p>
            </div>

            {mode === 'secreto' && (
              <div className="space-y-3">
                {!reveal?.ready ? (
                  <>
                    <p className="text-center text-sm text-ink-soft">
                      {waitingPartner
                        ? 'Esperando a outra pessoa responder para revelar.'
                        : 'Toque para conferir se já dá para revelar.'}
                    </p>
                    <Button variant="outline" className="w-full" loading={busy} onClick={handleReveal}>
                      <Eye className="h-4 w-4" /> Tentar revelar
                    </Button>
                  </>
                ) : (
                  <div
                    className={cn(
                      'space-y-2 rounded-2xl px-4 py-4',
                      reveal.match ? 'bg-gold/10' : 'bg-lilac-100/60',
                    )}
                  >
                    <p className="text-center font-display text-lg text-ink">
                      {reveal.match ? '💛 Vocês responderam a mesma coisa!' : 'Respostas diferentes'}
                    </p>
                    {reveal.answers.map((answer) => (
                      <div key={answer.userId} className="rounded-xl bg-surface/70 px-3 py-2">
                        <p className="label mb-0.5">
                          {answer.userId === me.id ? me.name : (partner?.name ?? 'Sua pessoa')}
                        </p>
                        <p className="text-sm text-ink">{answer.value}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Button
              size="lg"
              className="w-full"
              onClick={() => onNext({ [me.id]: pointsFor(layout, answered) })}
            >
              Próxima
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  )
}

type Layout = 'options' | 'people' | 'confession' | 'truth-dare' | 'text'

function layoutFor(slug: string, question: GameQuestion): Layout {
  if (slug === 'quem-e-mais-provavel') return 'people'
  if (slug === 'eu-nunca') return 'confession'
  if (slug === 'verdade-ou-desafio') return 'truth-dare'
  if (question.options.length > 0) return 'options'
  return 'text'
}

function pointsFor(layout: Layout, answer: string): number {
  if (layout === 'truth-dare') return answer === 'Cumpri' ? 10 : 0
  if (layout === 'text') return 8
  return 5
}
