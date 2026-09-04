'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Heart, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Field, Input, Textarea } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { Reveal } from '@/components/motion/reveal'
import {
  deleteProfileItem,
  deleteProfileSection,
  ensureDefaultSections,
  saveProfileItem,
  saveProfileSection,
} from '@/app/actions/profile'
import { cn } from '@/lib/utils'

export interface ProfileItemView {
  id: string
  label: string
  value: string | null
  note: string | null
  isFavorite: boolean
}

export interface ProfileSectionView {
  id: string
  title: string
  icon: string | null
  items: ProfileItemView[]
}

export function PartnerProfile({
  subjectId,
  subjectName,
  sections,
}: {
  subjectId: string
  subjectName: string
  sections: ProfileSectionView[]
}) {
  const router = useRouter()
  const { notify } = useToast()
  const [pending, startTransition] = useTransition()
  const [itemModal, setItemModal] = useState<{ sectionId: string; item?: ProfileItemView } | null>(null)
  const [sectionModal, setSectionModal] = useState<{ open: boolean; section?: ProfileSectionView }>({
    open: false,
  })

  function run(action: () => Promise<{ ok: boolean; error?: string }>, message: string) {
    startTransition(async () => {
      const result = await action()
      if (result.ok) {
        notify(message)
        router.refresh()
      } else {
        notify(result.error ?? 'Algo deu errado.', 'error')
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setSectionModal({ open: true })}>
          <Plus className="h-4 w-4" /> Nova seção
        </Button>
        {sections.length === 0 && (
          <Button
            size="sm"
            variant="outline"
            loading={pending}
            onClick={() => run(() => ensureDefaultSections(subjectId), 'Seções criadas.')}
          >
            <Sparkles className="h-4 w-4" /> Criar seções padrão
          </Button>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {sections.map((section, index) => (
          <Reveal key={section.id} delay={index * 0.04}>
            <Card className="h-full" hover>
              <CardBody className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="flex items-center gap-2 font-display text-lg text-ink">
                    <span aria-hidden>{section.icon ?? '✨'}</span>
                    {section.title}
                  </h3>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      aria-label="Editar seção"
                      onClick={() => setSectionModal({ open: true, section })}
                      className="focus-ring rounded-full p-1.5 text-ink-faint hover:bg-rose-50 hover:text-ink"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Apagar seção"
                      onClick={() => run(() => deleteProfileSection(section.id), 'Seção removida.')}
                      className="focus-ring rounded-full p-1.5 text-ink-faint hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <ul className="space-y-2">
                  {section.items.length === 0 && (
                    <li className="text-sm text-ink-faint">Nada anotado ainda.</li>
                  )}
                  {section.items.map((item) => (
                    <motion.li
                      key={item.id}
                      layout
                      className="group flex items-start gap-2 rounded-2xl bg-rose-50/60 px-3 py-2"
                    >
                      <Heart
                        className={cn(
                          'mt-0.5 h-3.5 w-3.5 shrink-0',
                          item.isFavorite ? 'fill-rose-400 text-rose-400' : 'text-rose-200',
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink">{item.label}</p>
                        {item.value && <p className="text-sm text-ink-soft">{item.value}</p>}
                        {item.note && <p className="mt-0.5 text-xs text-ink-faint">{item.note}</p>}
                      </div>
                      <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          aria-label="Editar"
                          onClick={() => setItemModal({ sectionId: section.id, item })}
                          className="focus-ring rounded-full p-1 text-ink-faint hover:text-ink"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          aria-label="Remover"
                          onClick={() => run(() => deleteProfileItem(item.id), 'Item removido.')}
                          className="focus-ring rounded-full p-1 text-ink-faint hover:text-red-500"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </motion.li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => setItemModal({ sectionId: section.id })}
                  className="focus-ring inline-flex items-center gap-1.5 text-sm font-medium text-rose-700 hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" /> Adicionar
                </button>
              </CardBody>
            </Card>
          </Reveal>
        ))}
      </div>

      {/* ------------------------------------------------------ modais ----- */}
      <Modal
        open={Boolean(itemModal)}
        onClose={() => setItemModal(null)}
        title={itemModal?.item ? 'Editar item' : 'Adicionar item'}
        size="sm"
      >
        <form
          className="space-y-4"
          action={(formData) => {
            if (!itemModal) return
            run(
              () =>
                saveProfileItem({
                  id: itemModal.item?.id,
                  sectionId: itemModal.sectionId,
                  label: String(formData.get('label') ?? ''),
                  value: String(formData.get('value') ?? ''),
                  note: String(formData.get('note') ?? ''),
                  is_favorite: formData.get('favorite') === 'on',
                }),
              'Anotado.',
            )
            setItemModal(null)
          }}
        >
          <Field label="Nome" required>
            {(id) => (
              <Input id={id} name="label" required defaultValue={itemModal?.item?.label} placeholder="Brigadeiro" />
            )}
          </Field>
          <Field label="Detalhe">
            {(id) => (
              <Input id={id} name="value" defaultValue={itemModal?.item?.value ?? ''} placeholder="Da confeitaria da esquina" />
            )}
          </Field>
          <Field label="Observação">
            {(id) => (
              <Textarea
                id={id}
                name="note"
                defaultValue={itemModal?.item?.note ?? ''}
                className="min-h-[5rem]"
                placeholder="Ela sempre pede quando está cansada."
              />
            )}
          </Field>
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" name="favorite" defaultChecked={itemModal?.item?.isFavorite} />
            Marcar como favorito
          </label>
          <Button type="submit" className="w-full" loading={pending}>
            Salvar
          </Button>
        </form>
      </Modal>

      <Modal
        open={sectionModal.open}
        onClose={() => setSectionModal({ open: false })}
        title={sectionModal.section ? 'Editar seção' : 'Nova seção'}
        description={`As seções organizam o que vocês guardam sobre ${subjectName}.`}
        size="sm"
      >
        <form
          className="space-y-4"
          action={(formData) => {
            run(
              () =>
                saveProfileSection({
                  id: sectionModal.section?.id,
                  subjectUserId: subjectId,
                  title: String(formData.get('title') ?? ''),
                  icon: String(formData.get('icon') ?? ''),
                }),
              'Seção salva.',
            )
            setSectionModal({ open: false })
          }}
        >
          <Field label="Título" required>
            {(id) => (
              <Input id={id} name="title" required defaultValue={sectionModal.section?.title} placeholder="Perfumes" />
            )}
          </Field>
          <Field label="Emoji" hint="Opcional. Aparece ao lado do título.">
            {(id) => (
              <Input id={id} name="icon" maxLength={4} defaultValue={sectionModal.section?.icon ?? ''} placeholder="🌸" />
            )}
          </Field>
          <Button type="submit" className="w-full" loading={pending}>
            Salvar
          </Button>
        </form>
      </Modal>
    </div>
  )
}
