'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { PenLine, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import { Badge, EmptyState } from '@/components/ui/misc'
import { Envelope } from '@/components/motion/envelope'
import { Reveal } from '@/components/motion/reveal'
import { useToast } from '@/components/ui/toast'
import { deleteLetter, markLetterOpened, saveLetter } from '@/app/actions/letters'
import { ENVELOPE_STYLES, OPEN_WHEN_SUGGESTIONS } from '@/lib/constants'
import { formatDate, formatDateTime } from '@/lib/date'
import { cn } from '@/lib/utils'
import type { LetterType, MediaKind } from '@/types/db'

export interface LetterView {
  id: string
  title: string
  body: string
  type: LetterType
  condition: string | null
  deliverAt: string | null
  style: string
  authorId: string
  openedAt: string | null
  createdAt: string
  media: { id: string; url: string | null; kind: MediaKind }[]
}

const TABS = [
  { value: 'todas', label: 'Todas' },
  { value: 'abra_quando', label: 'Abra quando...' },
  { value: 'programada', label: 'Programadas' },
  { value: 'minhas', label: 'Escritas por mim' },
] as const

export function LettersBoard({
  letters,
  meId,
  partnerId,
  partnerName,
  songs,
}: {
  letters: LetterView[]
  meId: string
  partnerId: string | null
  partnerName: string | null
  songs: { id: string; title: string; artist: string | null }[]
}) {
  const router = useRouter()
  const { notify } = useToast()
  const [pending, startTransition] = useTransition()
  const [tab, setTab] = useState<(typeof TABS)[number]['value']>('todas')
  const [composerOpen, setComposerOpen] = useState(false)
  const [type, setType] = useState<LetterType>('comum')

  const filtered = useMemo(() => {
    if (tab === 'todas') return letters
    if (tab === 'minhas') return letters.filter((letter) => letter.authorId === meId)
    return letters.filter((letter) => letter.type === tab)
  }, [letters, tab, meId])

  function handleOpen(letter: LetterView) {
    if (letter.authorId === meId || letter.openedAt) return
    startTransition(async () => {
      await markLetterOpened(letter.id)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {TABS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setTab(option.value)}
              className={cn(
                'focus-ring shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition-colors',
                tab === option.value
                  ? 'border-rose-300 bg-rose-100 font-medium text-rose-700'
                  : 'border-line bg-surface/60 text-ink-soft hover:border-rose-300',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <Button onClick={() => setComposerOpen(true)}>
          <PenLine className="h-4 w-4" /> Escrever carta
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          emoji="💌"
          title="Nenhuma carta aqui"
          description="Escreva uma carta agora ou programe uma para chegar em uma data especial."
          action={<Button onClick={() => setComposerOpen(true)}>Escrever a primeira</Button>}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {filtered.map((letter, index) => {
            const scheduled = letter.deliverAt ? new Date(letter.deliverAt) > new Date() : false
            const mine = letter.authorId === meId

            return (
              <Reveal key={letter.id} delay={index * 0.05} id={`carta-${letter.id}`}>
                <Envelope
                  title={letter.condition ?? letter.title}
                  subtitle={
                    scheduled
                      ? `Chega em ${formatDateTime(letter.deliverAt!)}`
                      : mine
                        ? 'Escrita por você'
                        : `De ${partnerName ?? 'sua pessoa'}`
                  }
                  style={letter.style}
                  locked={scheduled && !mine}
                  lockedLabel="Ainda guardada"
                  onOpen={() => handleOpen(letter)}
                >
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={letter.type === 'abra_quando' ? 'lilac' : 'rose'}>
                        {LABELS[letter.type]}
                      </Badge>
                      <span className="text-xs text-ink-faint">{formatDate(letter.createdAt)}</span>
                    </div>

                    <h3 className="font-display text-2xl leading-snug text-ink">{letter.title}</h3>
                    <p className="whitespace-pre-wrap font-hand text-lg leading-relaxed text-ink-soft">
                      {letter.body}
                    </p>

                    {letter.media.length > 0 && (
                      <div className="grid grid-cols-2 gap-3">
                        {letter.media.map((item) =>
                          item.kind === 'image' ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={item.id} src={item.url ?? ''} alt="" className="rounded-xl object-cover" />
                          ) : item.kind === 'video' ? (
                            <video key={item.id} src={item.url ?? undefined} controls className="rounded-xl" />
                          ) : (
                            <audio key={item.id} src={item.url ?? undefined} controls className="col-span-2 w-full" />
                          ),
                        )}
                      </div>
                    )}

                    {mine && (
                      <button
                        type="button"
                        onClick={() =>
                          startTransition(async () => {
                            const result = await deleteLetter(letter.id)
                            if (result.ok) {
                              notify('Carta apagada.')
                              router.refresh()
                            }
                          })
                        }
                        className="focus-ring inline-flex items-center gap-1.5 text-xs text-ink-faint hover:text-red-500"
                      >
                        <Trash2 className="h-3 w-3" /> Apagar carta
                      </button>
                    )}
                  </div>
                </Envelope>
              </Reveal>
            )
          })}
        </div>
      )}

      {/* ------------------------------------------------------ composer --- */}
      <Modal
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        title="Escrever uma carta"
        description="Ela pode ser lida agora, guardada para uma data ou aberta quando a vida pedir."
        size="md"
      >
        <form
          className="space-y-4"
          action={(formData) => {
            startTransition(async () => {
              const result = await saveLetter({
                title: String(formData.get('title') ?? ''),
                body: String(formData.get('body') ?? ''),
                letter_type: type,
                open_condition: String(formData.get('open_condition') ?? ''),
                deliver_at: String(formData.get('deliver_at') ?? ''),
                envelope_style: (formData.get('envelope_style') as 'rose') ?? 'rose',
                song_id: (formData.get('song_id') as string) || null,
                recipientId: partnerId,
              })

              if (result.ok) {
                notify('Carta guardada.')
                setComposerOpen(false)
                router.refresh()
              } else {
                notify(result.error ?? 'Não consegui salvar.', 'error')
              }
            })
          }}
        >
          <Field label="Tipo de carta">
            {(id) => (
              <Select id={id} value={type} onChange={(event) => setType(event.target.value as LetterType)}>
                <option value="comum">Carta comum</option>
                <option value="abra_quando">Abra quando...</option>
                <option value="programada">Programada para uma data</option>
                <option value="surpresa">Surpresa</option>
                <option value="privada">Só minha (privada)</option>
              </Select>
            )}
          </Field>

          {type === 'abra_quando' && (
            <Field label="Abra quando..." required hint="Escolha uma sugestão ou escreva a sua.">
              {(id) => (
                <>
                  <Input id={id} name="open_condition" list="sugestoes-abra-quando" required />
                  <datalist id="sugestoes-abra-quando">
                    {OPEN_WHEN_SUGGESTIONS.map((suggestion) => (
                      <option key={suggestion} value={suggestion} />
                    ))}
                  </datalist>
                </>
              )}
            </Field>
          )}

          {type === 'programada' && (
            <Field label="Entregar em" required hint="Antes dessa data a carta fica invisível para a outra pessoa.">
              {(id) => <Input id={id} name="deliver_at" type="datetime-local" required />}
            </Field>
          )}

          <Field label="Título" required>
            {(id) => <Input id={id} name="title" required maxLength={140} placeholder="Para os dias difíceis" />}
          </Field>

          <Field label="Texto" required>
            {(id) => (
              <Textarea
                id={id}
                name="body"
                required
                className="min-h-[12rem] font-hand text-lg"
                placeholder="Escreve do jeito que você falaria..."
              />
            )}
          </Field>

          <Field label="Envelope">
            {(id) => (
              <Select id={id} name="envelope_style" defaultValue="rose">
                {ENVELOPE_STYLES.map((style) => (
                  <option key={style.value} value={style.value}>
                    {style.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          {songs.length > 0 && (
            <Field label="Música da carta">
              {(id) => (
                <Select id={id} name="song_id" defaultValue="">
                  <option value="">Nenhuma</option>
                  {songs.map((song) => (
                    <option key={song.id} value={song.id}>
                      {song.title}
                      {song.artist ? ` — ${song.artist}` : ''}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )}

          <Button type="submit" size="lg" className="w-full" loading={pending}>
            Guardar carta
          </Button>
        </form>
      </Modal>
    </div>
  )
}

const LABELS: Record<LetterType, string> = {
  comum: 'Carta',
  surpresa: 'Surpresa',
  programada: 'Programada',
  privada: 'Privada',
  abra_quando: 'Abra quando...',
}
