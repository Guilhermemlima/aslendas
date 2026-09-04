'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Badge, Progress } from '@/components/ui/misc'
import { Confetti } from '@/components/motion/confetti'
import { useToast } from '@/components/ui/toast'
import { finishSession, revealSecret, startSession, submitAnswer } from '@/app/actions/games'
import { QuestionCard } from '@/features/games/question-card'
import { Wheel } from '@/features/games/wheel'
import { PhotoGuess } from '@/features/games/photo-guess'
import { MemoryGuess } from '@/features/games/memory-guess'
import { cn } from '@/lib/utils'
import type { GameMode, GameQuestion } from '@/types/db'

export interface PlayerPerson {
  id: string
  name: string
}

export interface GameMeta {
  slug: string
  name: string
  tagline: string | null
  description: string | null
  modes: GameMode[]
  config: { segments?: { label: string; icon: string; detail: string }[] }
}

type Phase = 'lobby' | 'playing' | 'result'

/**
 * Motor comum dos jogos.
 *
 * A sessão e as respostas ficam no banco (histórico e pontuação), mas o
 * andamento da rodada é local — o jogo continua fluido mesmo com rede ruim.
 */
export function GamePlayer({
  game,
  me,
  partner,
  questionCount,
  photos,
  memories,
}: {
  game: GameMeta
  me: PlayerPerson
  partner: PlayerPerson | null
  questionCount: number
  photos: { id: string; url: string; caption: string | null; year: number }[]
  memories: { id: string; title: string; description: string | null; happenedOn: string | null; coverUrl: string | null }[]
}) {
  const router = useRouter()
  const { notify } = useToast()
  const [pending, startTransition] = useTransition()

  const [phase, setPhase] = useState<Phase>('lobby')
  const [mode, setMode] = useState<GameMode>(game.modes[0])
  const [rounds, setRounds] = useState(8)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<GameQuestion[]>([])
  const [index, setIndex] = useState(0)
  const [scores, setScores] = useState<Record<string, number>>({})
  const [celebrate, setCelebrate] = useState(false)

  const isWheel = game.slug === 'roleta-do-casal' || game.slug === 'roleta-de-encontros'
  const isPhotoGuess = game.slug === 'adivinhe-a-foto'
  const isMemoryGuess = game.slug === 'adivinhe-a-memoria'
  const usesQuestions = !isWheel && !isPhotoGuess && !isMemoryGuess

  const maxRounds = isPhotoGuess ? photos.length : isMemoryGuess ? memories.length : questionCount

  function begin() {
    // A roleta não vale 8 rodadas: três giros já dão o clima.
    const total = isWheel ? 3 : rounds
    if (isWheel) setRounds(total)

    startTransition(async () => {
      const result = await startSession({ slug: game.slug, mode, rounds: total })
      if (!result.ok || !result.data) {
        notify(result.error ?? 'Não consegui iniciar o jogo.', 'error')
        return
      }
      setSessionId(result.data.session.id)
      setQuestions(result.data.questions)
      setIndex(0)
      setScores({})
      setPhase('playing')
    })
  }

  /** Avança a rodada e fecha a sessão quando acabar. */
  function advance(points: { [userId: string]: number } = {}) {
    const merged = { ...scores }
    for (const [userId, value] of Object.entries(points)) {
      merged[userId] = (merged[userId] ?? 0) + value
    }
    setScores(merged)

    const total = usesQuestions ? questions.length : rounds
    if (index + 1 >= total) {
      startTransition(async () => {
        if (sessionId) await finishSession(sessionId, merged)
        setPhase('result')
        setCelebrate(true)
        router.refresh()
      })
      return
    }
    setIndex((current) => current + 1)
  }

  async function record(questionId: string, value: string, points = 0, aboutUserId?: string | null) {
    // Roleta e jogos de foto não têm pergunta associada; a pontuação entra no
    // fechamento da sessão, sem linha em game_answers.
    if (!sessionId || !questionId) return
    await submitAnswer({ sessionId, questionId, value, points, aboutUserId })
  }

  /* ------------------------------------------------------------- lobby --- */
  if (phase === 'lobby') {
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <div className="text-center">
          <p className="label">{game.tagline}</p>
          <h1 className="title-display mt-1">{game.name}</h1>
          {game.description && <p className="mt-2 text-sm text-ink-soft">{game.description}</p>}
        </div>

        <Card>
          <CardBody className="space-y-5 p-5">
            {game.modes.length > 1 && (
              <div>
                <p className="label mb-2">Como vocês querem jogar?</p>
                <div className="grid gap-2">
                  {game.modes.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setMode(option)}
                      className={cn(
                        'focus-ring rounded-2xl border px-4 py-3 text-left text-sm transition-colors',
                        mode === option
                          ? 'border-rose-300 bg-rose-50 text-ink'
                          : 'border-line text-ink-soft hover:border-rose-300',
                      )}
                    >
                      <span className="block font-medium">{MODE_LABELS[option].title}</span>
                      <span className="block text-xs text-ink-faint">{MODE_LABELS[option].description}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!isWheel && (
              <div>
                <p className="label mb-2">Quantas rodadas?</p>
                <div className="flex gap-2">
                  {[5, 8, 12, 15].map((value) => (
                    <button
                      key={value}
                      type="button"
                      disabled={value > maxRounds}
                      onClick={() => setRounds(value)}
                      className={cn(
                        'focus-ring flex-1 rounded-2xl border py-2.5 text-sm transition-colors disabled:opacity-40',
                        rounds === value
                          ? 'border-rose-300 bg-rose-100 font-medium text-rose-700'
                          : 'border-line text-ink-soft hover:border-rose-300',
                      )}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-ink-faint">{maxRounds} disponíveis no total.</p>
              </div>
            )}

            {mode === 'secreto' && !partner && (
              <p className="rounded-2xl bg-gold/10 px-4 py-3 text-sm text-ink-soft">
                O modo de resposta secreta precisa das duas pessoas no casal. Convide a sua pessoa
                para poder comparar as respostas.
              </p>
            )}

            <Button size="lg" className="w-full" loading={pending} onClick={begin}>
              Começar
            </Button>
          </CardBody>
        </Card>
      </div>
    )
  }

  /* ------------------------------------------------------------ result --- */
  if (phase === 'result') {
    const ranking = Object.entries(scores).sort(([, a], [, b]) => b - a)
    const total = Object.values(scores).reduce((sum, value) => sum + value, 0)

    return (
      <div className="mx-auto max-w-xl space-y-6">
        <Confetti active={celebrate} onDone={() => setCelebrate(false)} />

        <Card className="overflow-hidden">
          <div className="h-1.5 bg-gradient-gold" />
          <CardBody className="space-y-5 p-7 text-center">
            <p className="label">Fim de jogo</p>
            <h2 className="font-display text-3xl text-ink">{game.name}</h2>
            <p className="font-display text-5xl text-rose-500">{total}</p>
            <p className="text-sm text-ink-soft">pontos nesta partida</p>

            {ranking.length > 1 && (
              <div className="space-y-2 pt-2">
                {ranking.map(([userId, value], position) => (
                  <div
                    key={userId}
                    className="flex items-center justify-between rounded-2xl bg-rose-50/70 px-4 py-2.5"
                  >
                    <span className="text-sm font-medium text-ink">
                      {position === 0 && '👑 '}
                      {userId === me.id ? me.name : (partner?.name ?? 'Sua pessoa')}
                    </span>
                    <span className="font-display text-lg text-ink">{value}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setPhase('lobby')}>
                Jogar de novo
              </Button>
              <Button className="flex-1" onClick={() => router.push('/jogos')}>
                Voltar
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    )
  }

  /* ----------------------------------------------------------- playing --- */
  const progress = ((index + 1) / (usesQuestions ? questions.length : rounds)) * 100

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-ink">{game.name}</span>
          <Badge tone="neutral">
            {index + 1} de {usesQuestions ? questions.length : rounds}
          </Badge>
        </div>
        <Progress value={progress / 100} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        >
          {isWheel ? (
            <Wheel
              segments={game.config.segments ?? []}
              onSpun={(label) => {
                void record(questions[0]?.id ?? '', label, 5)
                advance({ [me.id]: 5 })
              }}
            />
          ) : isPhotoGuess ? (
            <PhotoGuess
              photo={photos[index % photos.length]}
              onResult={(correct) => advance({ [me.id]: correct ? 10 : 2 })}
            />
          ) : isMemoryGuess ? (
            <MemoryGuess
              memory={memories[index % memories.length]}
              onResult={(correct) => advance({ [me.id]: correct ? 10 : 2 })}
            />
          ) : (
            <QuestionCard
              key={questions[index]?.id}
              slug={game.slug}
              mode={mode}
              question={questions[index]}
              me={me}
              partner={partner}
              onAnswer={async (value, points, aboutUserId) => {
                await record(questions[index].id, value, points, aboutUserId)
              }}
              onReveal={async () => {
                if (!sessionId) return { ready: false, answers: [], match: null }
                const result = await revealSecret(sessionId, questions[index].id)
                return result.data ?? { ready: false, answers: [], match: null }
              }}
              onNext={(points) => advance(points)}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <button
        type="button"
        onClick={() => advance()}
        className="focus-ring mx-auto block text-sm text-ink-faint hover:text-ink"
      >
        Pular esta
      </button>
    </div>
  )
}

const MODE_LABELS: Record<GameMode, { title: string; description: string }> = {
  juntos: { title: 'Juntos', description: 'Um aparelho só, respondendo em voz alta.' },
  individual: { title: 'Individual', description: 'Cada um joga a própria partida.' },
  secreto: {
    title: 'Resposta secreta',
    description: 'Cada um responde escondido; o resultado só aparece quando os dois responderem.',
  },
}
