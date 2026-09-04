'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { MapPin, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Field, Input, Textarea } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import { Badge, EmptyState } from '@/components/ui/misc'
import { useToast } from '@/components/ui/toast'
import { deleteLocation, saveLocation } from '@/app/actions/planning'
import { formatShortDate } from '@/lib/date'

export interface PlaceView {
  id: string
  name: string
  city: string | null
  country: string | null
  latitude: number | null
  longitude: number | null
  visitedOn: string | null
  story: string | null
}

/**
 * Mapa afetivo: projeção equiretangular simples sobre um painel estilizado.
 * Não é cartografia — é um lugar bonito para ver onde vocês já estiveram.
 * Lugares sem coordenada continuam aparecendo na lista abaixo.
 */
export function CoupleMap({ places }: { places: PlaceView[] }) {
  const router = useRouter()
  const { notify } = useToast()
  const [pending, startTransition] = useTransition()
  const [composerOpen, setComposerOpen] = useState(false)
  const [selected, setSelected] = useState<PlaceView | null>(null)

  const plotted = useMemo(
    () => places.filter((place) => place.latitude !== null && place.longitude !== null),
    [places],
  )

  const countries = useMemo(() => {
    const set = new Set(places.map((place) => place.country).filter(Boolean) as string[])
    return [...set].sort()
  }, [places])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Badge tone="rose">{places.length} lugares</Badge>
          {countries.length > 0 && <Badge tone="lilac">{countries.length} países</Badge>}
        </div>
        <Button onClick={() => setComposerOpen(true)}>
          <Plus className="h-4 w-4" /> Adicionar lugar
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="relative aspect-[2/1] w-full bg-gradient-to-br from-lilac-100 via-cream to-rose-100">
          {/* meridianos e paralelos decorativos */}
          <svg className="absolute inset-0 h-full w-full opacity-30" aria-hidden>
            {Array.from({ length: 11 }, (_, index) => (
              <line
                key={`v-${index}`}
                x1={`${index * 10}%`}
                y1="0"
                x2={`${index * 10}%`}
                y2="100%"
                stroke="rgb(var(--c-rose-300))"
                strokeWidth="0.5"
              />
            ))}
            {Array.from({ length: 7 }, (_, index) => (
              <line
                key={`h-${index}`}
                x1="0"
                y1={`${index * 16.6}%`}
                x2="100%"
                y2={`${index * 16.6}%`}
                stroke="rgb(var(--c-rose-300))"
                strokeWidth="0.5"
              />
            ))}
          </svg>

          {plotted.map((place, index) => {
            const left = ((place.longitude! + 180) / 360) * 100
            const top = ((90 - place.latitude!) / 180) * 100
            return (
              <motion.button
                key={place.id}
                type="button"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.06, type: 'spring', stiffness: 300, damping: 18 }}
                whileHover={{ scale: 1.25 }}
                onClick={() => setSelected(place)}
                style={{ left: `${left}%`, top: `${top}%` }}
                className="focus-ring absolute -translate-x-1/2 -translate-y-full"
                aria-label={place.name}
              >
                <MapPin className="h-6 w-6 fill-rose-300 text-rose-700 drop-shadow" />
              </motion.button>
            )
          })}

          {plotted.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-ink-soft">
              Adicione latitude e longitude a um lugar para ele aparecer aqui no mapa.
            </div>
          )}
        </div>
      </Card>

      {places.length === 0 ? (
        <EmptyState
          emoji="🗺️"
          title="Nenhum lugar guardado"
          description="Comece pelo lugar do primeiro encontro."
          action={<Button onClick={() => setComposerOpen(true)}>Adicionar lugar</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {places.map((place) => (
            <Card key={place.id} hover className="group">
              <CardBody className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <button type="button" onClick={() => setSelected(place)} className="focus-ring text-left">
                    <h3 className="font-display text-lg text-ink">{place.name}</h3>
                    <p className="text-xs text-ink-faint">
                      {[place.city, place.country].filter(Boolean).join(', ') || 'Sem localização'}
                    </p>
                  </button>
                  <button
                    type="button"
                    aria-label="Remover lugar"
                    onClick={() =>
                      startTransition(async () => {
                        await deleteLocation(place.id)
                        router.refresh()
                      })
                    }
                    className="focus-ring shrink-0 rounded-full p-1 text-ink-faint opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {place.visitedOn && <Badge tone="gold">{formatShortDate(`${place.visitedOn}T12:00:00`)}</Badge>}
                {place.story && <p className="line-clamp-2 text-sm text-ink-soft">{place.story}</p>}
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.name} size="sm">
        {selected && (
          <div className="space-y-3">
            <p className="text-sm text-ink-faint">
              {[selected.city, selected.country].filter(Boolean).join(', ')}
              {selected.visitedOn ? ` · ${formatShortDate(`${selected.visitedOn}T12:00:00`)}` : ''}
            </p>
            {selected.story && (
              <p className="whitespace-pre-wrap leading-relaxed text-ink-soft">{selected.story}</p>
            )}
          </div>
        )}
      </Modal>

      <Modal open={composerOpen} onClose={() => setComposerOpen(false)} title="Novo lugar" size="sm">
        <form
          className="space-y-4"
          action={(formData) => {
            const lat = formData.get('latitude')
            const lng = formData.get('longitude')
            startTransition(async () => {
              const result = await saveLocation({
                name: String(formData.get('name') ?? ''),
                city: String(formData.get('city') ?? ''),
                country: String(formData.get('country') ?? ''),
                latitude: lat ? Number(lat) : null,
                longitude: lng ? Number(lng) : null,
                visited_on: String(formData.get('visited_on') ?? ''),
                story: String(formData.get('story') ?? ''),
              })
              if (result.ok) {
                notify('Lugar guardado.')
                setComposerOpen(false)
                router.refresh()
              } else {
                notify(result.error ?? 'Não consegui salvar.', 'error')
              }
            })
          }}
        >
          <Field label="Nome do lugar" required>
            {(id) => <Input id={id} name="name" required placeholder="Praia do Rosa" />}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cidade">{(id) => <Input id={id} name="city" />}</Field>
            <Field label="País">{(id) => <Input id={id} name="country" />}</Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude" hint="-28.13">
              {(id) => <Input id={id} name="latitude" type="number" step="any" min={-90} max={90} />}
            </Field>
            <Field label="Longitude" hint="-48.64">
              {(id) => <Input id={id} name="longitude" type="number" step="any" min={-180} max={180} />}
            </Field>
          </div>
          <Field label="Quando fomos">{(id) => <Input id={id} name="visited_on" type="date" />}</Field>
          <Field label="A história desse lugar">
            {(id) => <Textarea id={id} name="story" className="min-h-[6rem]" />}
          </Field>
          <Button type="submit" className="w-full" loading={pending}>
            Salvar lugar
          </Button>
        </form>
      </Modal>
    </div>
  )
}
