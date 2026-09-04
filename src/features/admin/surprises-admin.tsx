'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import { Badge, EmptyState } from '@/components/ui/misc'
import { Countdown } from '@/components/motion/countdown'
import { Uploader, type UploadedItem } from '@/features/media/uploader'
import { useToast } from '@/components/ui/toast'
import { deleteSurprise, saveSurprise, setSurpriseActive } from '@/app/actions/surprises'
import { formatDateTime } from '@/lib/date'

export interface AdminSurprise {
  id: string
  title: string
  message: string
  revealAt: string
  animation: string
  isActive: boolean
  revealedAt: string | null
  targetUserId: string | null
  mediaIds: string[]
}

export function SurprisesAdmin({
  surprises,
  partnerId,
  partnerName,
}: {
  surprises: AdminSurprise[]
  partnerId: string | null
  partnerName: string | null
}) {
  const router = useRouter()
  const { notify } = useToast()
  const [pending, startTransition] = useTransition()
  const [composerOpen, setComposerOpen] = useState(false)
  const [newMedia, setNewMedia] = useState<UploadedItem[]>([])

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setNewMedia([])
            setComposerOpen(true)
          }}
        >
          <Plus className="h-4 w-4" /> Nova surpresa
        </Button>
      </div>

      {surprises.length === 0 ? (
        <EmptyState
          emoji="🎁"
          title="Nenhuma surpresa preparada"
          description="Escreva algo hoje e escolha a data. Aparece sozinho, em tela cheia, na hora certa."
          action={<Button onClick={() => setComposerOpen(true)}>Preparar surpresa</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {surprises.map((surprise) => {
            const revealed = new Date(surprise.revealAt) <= new Date()

            return (
              <Card key={surprise.id} className="overflow-hidden">
                <div className="h-1 bg-gradient-gold" />
                <CardBody className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-display text-lg text-ink">{surprise.title}</h3>
                      <p className="text-xs text-ink-faint">{formatDateTime(surprise.revealAt)}</p>
                    </div>
                    <Badge tone={surprise.revealedAt ? 'neutral' : revealed ? 'rose' : 'gold'}>
                      {surprise.revealedAt ? 'já vista' : revealed ? 'liberada' : 'agendada'}
                    </Badge>
                  </div>

                  <p className="line-clamp-2 text-sm text-ink-soft">{surprise.message}</p>

                  {!revealed && <Countdown target={surprise.revealAt} compact />}

                  <div className="flex flex-wrap gap-1 pt-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        startTransition(async () => {
                          await setSurpriseActive(surprise.id, !surprise.isActive)
                          router.refresh()
                        })
                      }
                    >
                      {surprise.isActive ? (
                        <>
                          <EyeOff className="h-3.5 w-3.5" /> Pausar
                        </>
                      ) : (
                        <>
                          <Eye className="h-3.5 w-3.5" /> Reativar
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        startTransition(async () => {
                          await deleteSurprise(surprise.id)
                          notify('Surpresa apagada.')
                          router.refresh()
                        })
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}

      <Modal
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        title="Preparar surpresa"
        description={`Até a data marcada, ${partnerName ?? 'a outra pessoa'} não consegue nem ver que isso existe.`}
        size="md"
      >
        <form
          className="space-y-4"
          action={(formData) => {
            startTransition(async () => {
              const result = await saveSurprise({
                title: String(formData.get('title') ?? ''),
                message: String(formData.get('message') ?? ''),
                reveal_at: String(formData.get('reveal_at') ?? ''),
                animation: (formData.get('animation') as 'confete') ?? 'confete',
                targetUserId: partnerId,
                mediaIds: newMedia.map((item) => item.id),
              })

              if (result.ok) {
                notify('Surpresa agendada.')
                setComposerOpen(false)
                router.refresh()
              } else {
                notify(result.error ?? 'Não consegui salvar.', 'error')
              }
            })
          }}
        >
          <Field label="Título" required>
            {(id) => <Input id={id} name="title" required placeholder="Feliz aniversário, amor" />}
          </Field>

          <Field label="Quando deve aparecer" required>
            {(id) => <Input id={id} name="reveal_at" type="datetime-local" required />}
          </Field>

          <Field label="Mensagem" required>
            {(id) => (
              <Textarea id={id} name="message" required className="min-h-[10rem] font-hand text-lg" />
            )}
          </Field>

          <Field label="Animação">
            {(id) => (
              <Select id={id} name="animation" defaultValue="confete">
                <option value="confete">Confete</option>
                <option value="petalas">Pétalas</option>
                <option value="estrelas">Estrelas</option>
                <option value="brilho">Brilho</option>
              </Select>
            )}
          </Field>

          <Field label="Foto ou vídeo">
            {() => <Uploader onUploaded={(items) => setNewMedia((current) => [...current, ...items])} />}
          </Field>

          <Button type="submit" size="lg" className="w-full" loading={pending}>
            Agendar surpresa
          </Button>
        </form>
      </Modal>
    </div>
  )
}
