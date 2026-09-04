'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Hourglass, Lock, Plus, Unlock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Field, Input, Textarea } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import { Badge, EmptyState } from '@/components/ui/misc'
import { Countdown } from '@/components/motion/countdown'
import { Confetti } from '@/components/motion/confetti'
import { Reveal } from '@/components/motion/reveal'
import { useToast } from '@/components/ui/toast'
import { openCapsule, saveCapsule } from '@/app/actions/letters'
import { formatDateTime } from '@/lib/date'
import type { MediaKind } from '@/types/db'

export interface CapsuleView {
  id: string
  title: string
  unlockAt: string
  createdBy: string
  createdAt: string
  openedAt: string | null
  unlocked: boolean
  message: string | null
  media: { id: string; url: string | null; kind: MediaKind }[]
}

export function CapsulesBoard({ capsules, meId }: { capsules: CapsuleView[]; meId: string }) {
  const router = useRouter()
  const { notify } = useToast()
  const [pending, startTransition] = useTransition()
  const [composerOpen, setComposerOpen] = useState(false)
  const [opened, setOpened] = useState<CapsuleView | null>(null)
  const [celebrate, setCelebrate] = useState(false)

  const sealed = capsules.filter((capsule) => !capsule.unlocked)
  const ready = capsules.filter((capsule) => capsule.unlocked)

  function handleOpen(capsule: CapsuleView) {
    startTransition(async () => {
      const result = await openCapsule(capsule.id)
      if (!result.ok) {
        notify(result.error ?? 'Ainda não dá para abrir.', 'error')
        return
      }
      setOpened(capsule)
      setCelebrate(true)
      router.refresh()
    })
  }

  return (
    <div className="space-y-8">
      <Confetti active={celebrate} onDone={() => setCelebrate(false)} pieces={70} />

      <div className="flex justify-end">
        <Button onClick={() => setComposerOpen(true)}>
          <Plus className="h-4 w-4" /> Criar cápsula
        </Button>
      </div>

      {capsules.length === 0 && (
        <EmptyState
          emoji="⏳"
          title="Nenhuma cápsula ainda"
          description="Escreva uma mensagem para vocês lerem daqui a um ano. Ela fica selada até lá."
          action={<Button onClick={() => setComposerOpen(true)}>Criar a primeira</Button>}
        />
      )}

      {sealed.length > 0 && (
        <section>
          <h2 className="label mb-4 inline-flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" /> Seladas
          </h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {sealed.map((capsule, index) => (
              <Reveal key={capsule.id} delay={index * 0.05}>
                <Card className="h-full overflow-hidden">
                  <div className="h-1.5 bg-gradient-to-r from-lilac-300 to-rose-300" />
                  <CardBody className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-display text-xl text-ink">{capsule.title}</h3>
                        <p className="mt-0.5 text-xs text-ink-faint">
                          Abre em {formatDateTime(capsule.unlockAt)}
                        </p>
                      </div>
                      <motion.span
                        animate={{ rotate: [0, 8, -8, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                        className="text-2xl"
                      >
                        <Hourglass className="h-6 w-6 text-lilac-500" />
                      </motion.span>
                    </div>

                    <Countdown target={capsule.unlockAt} onComplete={() => router.refresh()} />

                    <p className="text-xs text-ink-faint">
                      {capsule.createdBy === meId
                        ? 'Você escreveu esta cápsula. O conteúdo continua guardado.'
                        : 'Alguém guardou algo aqui para vocês dois.'}
                    </p>
                  </CardBody>
                </Card>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {ready.length > 0 && (
        <section>
          <h2 className="label mb-4 inline-flex items-center gap-1.5">
            <Unlock className="h-3.5 w-3.5" /> Prontas para abrir
          </h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {ready.map((capsule, index) => (
              <Reveal key={capsule.id} delay={index * 0.05}>
                <Card className="h-full overflow-hidden" hover>
                  <div className="h-1.5 bg-gradient-gold" />
                  <CardBody className="space-y-3 p-5">
                    <div className="flex items-center gap-2">
                      <Badge tone="gold">Liberada</Badge>
                      {capsule.openedAt && <span className="text-xs text-ink-faint">já aberta</span>}
                    </div>
                    <h3 className="font-display text-xl text-ink">{capsule.title}</h3>
                    <p className="text-xs text-ink-faint">Guardada em {formatDateTime(capsule.createdAt)}</p>
                    <Button
                      size="sm"
                      variant={capsule.openedAt ? 'outline' : 'gold'}
                      loading={pending}
                      onClick={() => (capsule.openedAt ? setOpened(capsule) : handleOpen(capsule))}
                    >
                      {capsule.openedAt ? 'Ler de novo' : 'Abrir cápsula'}
                    </Button>
                  </CardBody>
                </Card>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ---------------------------------------------------- leitura ------ */}
      <Modal open={Boolean(opened)} onClose={() => setOpened(null)} title={opened?.title} size="md">
        {opened && (
          <div className="space-y-4">
            <p className="text-xs text-ink-faint">
              Escrita em {formatDateTime(opened.createdAt)} · aberta em {formatDateTime(opened.unlockAt)}
            </p>
            <div className="gold-line" />
            <p className="whitespace-pre-wrap font-hand text-lg leading-relaxed text-ink">
              {opened.message ?? 'Conteúdo indisponível.'}
            </p>
            {opened.media.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {opened.media.map((item) =>
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
          </div>
        )}
      </Modal>

      {/* ---------------------------------------------------- composer ----- */}
      <Modal
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        title="Nova cápsula do tempo"
        description="Depois de criada, nem você consegue mudar o conteúdo antes da data."
        size="md"
      >
        <form
          className="space-y-4"
          action={(formData) => {
            startTransition(async () => {
              const result = await saveCapsule({
                title: String(formData.get('title') ?? ''),
                message: String(formData.get('message') ?? ''),
                unlock_at: String(formData.get('unlock_at') ?? ''),
              })
              if (result.ok) {
                notify('Cápsula selada.')
                setComposerOpen(false)
                router.refresh()
              } else {
                notify(result.error ?? 'Não consegui salvar.', 'error')
              }
            })
          }}
        >
          <Field label="Título" required>
            {(id) => <Input id={id} name="title" required placeholder="Para a gente daqui a um ano" />}
          </Field>
          <Field label="Abrir em" required hint="Escolha uma data futura.">
            {(id) => <Input id={id} name="unlock_at" type="datetime-local" required />}
          </Field>
          <Field label="Mensagem" required>
            {(id) => (
              <Textarea
                id={id}
                name="message"
                required
                className="min-h-[12rem] font-hand text-lg"
                placeholder="O que você quer que a gente lembre nessa data?"
              />
            )}
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={pending}>
            Selar cápsula
          </Button>
        </form>
      </Modal>
    </div>
  )
}
