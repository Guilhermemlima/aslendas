'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Play, Plus, Shuffle, Star, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import { Badge, EmptyState } from '@/components/ui/misc'
import { Confetti } from '@/components/motion/confetti'
import { Reveal } from '@/components/motion/reveal'
import { useToast } from '@/components/ui/toast'
import {
  deleteWatchItem,
  rateWatchItem,
  saveWatchItem,
  setWatchProgress,
  setWatchStatus,
} from '@/app/actions/watchlist'
import { formatShortDate } from '@/lib/date'
import { cn, pickRandom } from '@/lib/utils'
import type { WatchKind, WatchStatus } from '@/types/db'

export interface WatchItemView {
  id: string
  title: string
  kind: WatchKind
  status: WatchStatus
  platform: string | null
  genre: string | null
  year: number | null
  note: string | null
  season: number | null
  episode: number | null
  watchedOn: string | null
  ratings: { userId: string; rating: number; comment: string | null }[]
}

const TIPOS: { value: WatchKind; label: string; emoji: string }[] = [
  { value: 'filme', label: 'Filme', emoji: '🎬' },
  { value: 'serie', label: 'Série', emoji: '📺' },
  { value: 'documentario', label: 'Documentário', emoji: '🎥' },
  { value: 'anime', label: 'Anime', emoji: '🌸' },
  { value: 'outro', label: 'Outro', emoji: '🍿' },
]

const ABAS: { value: WatchStatus; label: string }[] = [
  { value: 'quero', label: 'Quero assistir' },
  { value: 'assistindo', label: 'Assistindo' },
  { value: 'assistido', label: 'Já vimos' },
]

export function WatchlistBoard({
  items,
  meId,
  meName,
  partnerName,
}: {
  items: WatchItemView[]
  meId: string
  meName: string
  partnerName: string | null
}) {
  const router = useRouter()
  const { notify } = useToast()
  const [pending, startTransition] = useTransition()
  const [aba, setAba] = useState<WatchStatus>('quero')
  const [tipoFiltro, setTipoFiltro] = useState<WatchKind | 'todos'>('todos')
  const [composerOpen, setComposerOpen] = useState(false)
  const [sorteado, setSorteado] = useState<WatchItemView | null>(null)
  const [celebrate, setCelebrate] = useState(false)

  const filtrados = useMemo(
    () =>
      items.filter(
        (item) => item.status === aba && (tipoFiltro === 'todos' || item.kind === tipoFiltro),
      ),
    [items, aba, tipoFiltro],
  )

  const candidatosSorteio = useMemo(
    () =>
      items.filter(
        (item) => item.status === 'quero' && (tipoFiltro === 'todos' || item.kind === tipoFiltro),
      ),
    [items, tipoFiltro],
  )

  const assistidos = items.filter((i) => i.status === 'assistido').length

  function agir(acao: () => Promise<{ ok: boolean; error?: string }>, mensagem?: string) {
    startTransition(async () => {
      const r = await acao()
      if (r.ok) {
        if (mensagem) notify(mensagem)
        router.refresh()
      } else {
        notify(r.error ?? 'Não consegui salvar.', 'error')
      }
    })
  }

  return (
    <div className="space-y-5">
      <Confetti active={celebrate} onDone={() => setCelebrate(false)} />

      {/* --------------------------------------------------------- topo ---- */}
      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="label mb-1">Já vimos juntos</p>
            <p className="font-display text-3xl text-ink">{assistidos}</p>
            <p className="text-xs text-ink-faint">
              {items.filter((i) => i.status === 'quero').length} esperando na fila
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={candidatosSorteio.length === 0}
              onClick={() => setSorteado(pickRandom(candidatosSorteio) ?? null)}
            >
              <Shuffle className="h-4 w-4" /> O que a gente vê hoje?
            </Button>
            <Button onClick={() => setComposerOpen(true)}>
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* -------------------------------------------------------- filtros -- */}
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-1 rounded-full bg-rose-50 p-1">
          {ABAS.map((opcao) => (
            <button
              key={opcao.value}
              type="button"
              onClick={() => setAba(opcao.value)}
              className={cn(
                'focus-ring rounded-full py-2 text-sm font-medium transition-colors',
                aba === opcao.value ? 'bg-surface text-rose-700 shadow-soft' : 'text-ink-soft',
              )}
            >
              {opcao.label}
            </button>
          ))}
        </div>

        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <Chip ativo={tipoFiltro === 'todos'} onClick={() => setTipoFiltro('todos')}>
            Tudo
          </Chip>
          {TIPOS.map((tipo) => (
            <Chip
              key={tipo.value}
              ativo={tipoFiltro === tipo.value}
              onClick={() => setTipoFiltro(tipo.value)}
            >
              <span className="font-emoji">{tipo.emoji}</span> {tipo.label}
            </Chip>
          ))}
        </div>
      </div>

      {/* ---------------------------------------------------------- lista -- */}
      {filtrados.length === 0 ? (
        <EmptyState
          emoji="🍿"
          title={aba === 'quero' ? 'A fila está vazia' : 'Nada por aqui ainda'}
          description={
            aba === 'quero'
              ? 'Anote aquele filme que vocês vivem adiando.'
              : 'Marque algo como assistindo ou já visto para aparecer aqui.'
          }
          action={aba === 'quero' ? <Button onClick={() => setComposerOpen(true)}>Adicionar</Button> : undefined}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {filtrados.map((item, index) => (
              <motion.div key={item.id} layout exit={{ opacity: 0, scale: 0.96 }}>
                <Reveal delay={Math.min(index * 0.03, 0.25)}>
                  <ItemCard
                    item={item}
                    meId={meId}
                    meName={meName}
                    partnerName={partnerName}
                    pending={pending}
                    onAgir={agir}
                    onConcluir={() => {
                      agir(() => setWatchStatus(item.id, 'assistido'), 'Marcado como visto.')
                      setCelebrate(true)
                    }}
                  />
                </Reveal>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* -------------------------------------------------------- sorteio -- */}
      <Modal open={Boolean(sorteado)} onClose={() => setSorteado(null)} title="A escolha da noite" size="sm">
        {sorteado && (
          <div className="space-y-4 text-center">
            <span className="font-emoji text-5xl">
              {TIPOS.find((t) => t.value === sorteado.kind)?.emoji}
            </span>
            <p className="font-display text-3xl leading-tight text-ink">{sorteado.title}</p>
            <p className="text-sm text-ink-soft">
              {[sorteado.platform, sorteado.genre, sorteado.year].filter(Boolean).join(' · ') ||
                'Sem detalhes anotados'}
            </p>
            {sorteado.note && <p className="text-sm text-ink-soft">{sorteado.note}</p>}

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setSorteado(pickRandom(candidatosSorteio) ?? null)}
              >
                <Shuffle className="h-4 w-4" /> Sortear outro
              </Button>
              <Button
                className="flex-1"
                loading={pending}
                onClick={() => {
                  agir(() => setWatchStatus(sorteado.id, 'assistindo'), 'Bom filme 🍿')
                  setSorteado(null)
                }}
              >
                <Play className="h-4 w-4" /> É esse
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ------------------------------------------------------- composer -- */}
      <Modal open={composerOpen} onClose={() => setComposerOpen(false)} title="Adicionar à lista" size="sm">
        <form
          className="space-y-4"
          action={(formData) => {
            startTransition(async () => {
              const r = await saveWatchItem({
                title: String(formData.get('title') ?? ''),
                kind: (formData.get('kind') as WatchKind) ?? 'filme',
                platform: String(formData.get('platform') ?? ''),
                genre: String(formData.get('genre') ?? ''),
                year: String(formData.get('year') ?? ''),
                note: String(formData.get('note') ?? ''),
              })
              if (r.ok) {
                notify('Adicionado à fila.')
                setComposerOpen(false)
                router.refresh()
              } else {
                notify(r.error ?? 'Não consegui salvar.', 'error')
              }
            })
          }}
        >
          <Field label="Nome" required>
            {(id) => <Input id={id} name="title" required placeholder="Cidade de Deus" />}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo">
              {(id) => (
                <Select id={id} name="kind" defaultValue="filme">
                  {TIPOS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.emoji} {t.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Ano">
              {(id) => <Input id={id} name="year" type="number" min={1888} max={2200} placeholder="2002" />}
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Onde assistir">
              {(id) => <Input id={id} name="platform" placeholder="Netflix" maxLength={60} />}
            </Field>
            <Field label="Gênero">
              {(id) => <Input id={id} name="genre" placeholder="Drama" maxLength={60} />}
            </Field>
          </div>
          <Field label="Por que queremos ver?">
            {(id) => <Textarea id={id} name="note" className="min-h-[5rem]" />}
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={pending}>
            Adicionar
          </Button>
        </form>
      </Modal>
    </div>
  )
}

function ItemCard({
  item,
  meId,
  meName,
  partnerName,
  pending,
  onAgir,
  onConcluir,
}: {
  item: WatchItemView
  meId: string
  meName: string
  partnerName: string | null
  pending: boolean
  onAgir: (acao: () => Promise<{ ok: boolean; error?: string }>, mensagem?: string) => void
  onConcluir: () => void
}) {
  const tipo = TIPOS.find((t) => t.value === item.kind)
  const minhaNota = item.ratings.find((r) => r.userId === meId)
  const notaDele = item.ratings.find((r) => r.userId !== meId)

  return (
    <Card hover className="h-full">
      <CardBody className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-display text-lg leading-snug text-ink">
              <span className="font-emoji">{tipo?.emoji}</span> {item.title}
            </h3>
            <p className="text-xs text-ink-faint">
              {[item.platform, item.genre, item.year].filter(Boolean).join(' · ') || tipo?.label}
            </p>
          </div>
          <button
            type="button"
            aria-label="Remover"
            disabled={pending}
            onClick={() => onAgir(() => deleteWatchItem(item.id), 'Removido.')}
            className="focus-ring shrink-0 rounded-full p-1.5 text-ink-faint hover:text-red-500"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {item.note && <p className="line-clamp-2 text-sm text-ink-soft">{item.note}</p>}

        {/* Progresso só faz sentido em série ou anime. */}
        {(item.kind === 'serie' || item.kind === 'anime') && item.status !== 'quero' && (
          <div className="flex items-center gap-2 rounded-2xl bg-rose-50/70 px-3 py-2">
            <span className="text-xs text-ink-soft">
              T{item.season ?? 1} · E{item.episode ?? 1}
            </span>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                onAgir(() =>
                  setWatchProgress({
                    id: item.id,
                    season: item.season ?? 1,
                    episode: (item.episode ?? 0) + 1,
                  }),
                )
              }
              className="focus-ring ml-auto rounded-full bg-surface px-3 py-1 text-xs font-medium text-rose-700 shadow-soft"
            >
              +1 episódio
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                onAgir(() =>
                  setWatchProgress({
                    id: item.id,
                    season: (item.season ?? 1) + 1,
                    episode: 1,
                  }),
                )
              }
              className="focus-ring rounded-full bg-surface px-3 py-1 text-xs font-medium text-ink-soft shadow-soft"
            >
              +1 temporada
            </button>
          </div>
        )}

        {item.status === 'assistido' && (
          <div className="space-y-2 rounded-2xl bg-rose-50/70 px-3 py-2.5">
            {item.watchedOn && (
              <p className="text-xs text-ink-faint">
                visto em {formatShortDate(`${item.watchedOn}T12:00:00`)}
              </p>
            )}
            <Estrelas
              rotulo={meName}
              nota={minhaNota?.rating ?? 0}
              editavel
              onEscolher={(nota) => onAgir(() => rateWatchItem({ itemId: item.id, rating: nota }))}
            />
            <Estrelas rotulo={partnerName ?? 'Sua pessoa'} nota={notaDele?.rating ?? 0} />
          </div>
        )}

        <div className="flex flex-wrap gap-1">
          {item.status === 'quero' && (
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => onAgir(() => setWatchStatus(item.id, 'assistindo'), 'Bom filme 🍿')}
            >
              <Play className="h-3.5 w-3.5" /> Começamos
            </Button>
          )}
          {item.status !== 'assistido' && (
            <Button size="sm" variant="secondary" disabled={pending} onClick={onConcluir}>
              <Check className="h-3.5 w-3.5" /> Já vimos
            </Button>
          )}
          {item.status === 'assistido' && (
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => onAgir(() => setWatchStatus(item.id, 'quero'), 'De volta para a fila.')}
            >
              Ver de novo
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
  )
}

function Estrelas({
  rotulo,
  nota,
  editavel,
  onEscolher,
}: {
  rotulo: string
  nota: number
  editavel?: boolean
  onEscolher?: (nota: number) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 truncate text-xs text-ink-soft">{rotulo}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            disabled={!editavel}
            aria-label={`${n} de 5`}
            onClick={() => onEscolher?.(n)}
            className={cn('focus-ring rounded p-0.5', editavel && 'hover:scale-110')}
          >
            <Star
              className={cn(
                'h-4 w-4',
                n <= nota ? 'fill-gold text-gold' : 'text-line',
              )}
            />
          </button>
        ))}
      </div>
      {nota === 0 && !editavel && <span className="text-xs text-ink-faint">sem nota</span>}
    </div>
  )
}

function Chip({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'focus-ring shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition-colors',
        ativo
          ? 'border-rose-300 bg-rose-100 font-medium text-rose-700'
          : 'border-line bg-surface/60 text-ink-soft hover:border-rose-300',
      )}
    >
      {children}
    </button>
  )
}
