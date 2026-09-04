'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { Heart, LayoutGrid, Rows3, Search, Shuffle, Sparkles, Upload } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/field'
import { EmptyState } from '@/components/ui/misc'
import { Polaroid } from '@/components/motion/polaroid'
import { Uploader } from '@/features/media/uploader'
import { updateMedia } from '@/app/actions/media'
import { useToast } from '@/components/ui/toast'
import { formatDate } from '@/lib/date'
import { cn, pickRandom } from '@/lib/utils'
import type { MediaKind } from '@/types/db'

export interface GalleryItem {
  id: string
  url: string | null
  kind: MediaKind
  caption: string | null
  takenAt: string
  isFavorite: boolean
  tags: string[]
  albumId: string | null
}

export function Gallery({
  items,
  albums,
  years,
  tags,
  thisDay,
  openRandomOnLoad,
  activeFilters,
}: {
  items: GalleryItem[]
  albums: { id: string; title: string }[]
  years: number[]
  tags: string[]
  thisDay: { id: string; url: string | null; caption: string | null; year: number }[]
  openRandomOnLoad?: boolean
  activeFilters: { album: string | null; year: number | null; tag: string | null; favorites: boolean }
}) {
  const router = useRouter()
  const { notify } = useToast()
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'grid' | 'polaroid'>('polaroid')
  const [selected, setSelected] = useState<GalleryItem | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [favorites, setFavorites] = useState(() => new Set(items.filter((i) => i.isFavorite).map((i) => i.id)))

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return items
    return items.filter(
      (item) =>
        item.caption?.toLowerCase().includes(term) ||
        item.tags.some((tag) => tag.toLowerCase().includes(term)),
    )
  }, [items, search])

  // "Reviver um momento" chega pela Home com ?aleatoria=1.
  useEffect(() => {
    if (!openRandomOnLoad || items.length === 0) return
    setSelected(pickRandom(items) ?? null)
  }, [openRandomOnLoad, items])

  function setFilter(key: string, value: string | null) {
    const params = new URLSearchParams(window.location.search)
    if (value === null) params.delete(key)
    else params.set(key, value)
    router.push(`/galeria?${params.toString()}`)
  }

  async function toggleFavorite(item: GalleryItem) {
    const next = !favorites.has(item.id)
    setFavorites((current) => {
      const copy = new Set(current)
      if (next) copy.add(item.id)
      else copy.delete(item.id)
      return copy
    })
    const result = await updateMedia(item.id, { is_favorite: next })
    if (!result.ok) notify(result.error ?? 'Não consegui salvar.', 'error')
  }

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------- comandos -- */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por legenda ou tag"
            className="pl-10"
          />
        </div>

        <Button
          variant={activeFilters.favorites ? 'primary' : 'outline'}
          size="md"
          onClick={() => setFilter('favoritos', activeFilters.favorites ? null : '1')}
        >
          <Heart className="h-4 w-4" /> Favoritos
        </Button>

        <Button
          variant="outline"
          size="md"
          onClick={() => setSelected(pickRandom(filtered) ?? null)}
          disabled={filtered.length === 0}
        >
          <Shuffle className="h-4 w-4" /> Aleatória
        </Button>

        <Button
          variant="ghost"
          size="icon"
          aria-label="Alternar visualização"
          onClick={() => setView(view === 'grid' ? 'polaroid' : 'grid')}
        >
          {view === 'grid' ? <Rows3 className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
        </Button>

        <Button size="md" onClick={() => setUploadOpen(true)}>
          <Upload className="h-4 w-4" /> Enviar
        </Button>
      </div>

      {/* -------------------------------------------------------- filtros -- */}
      {(albums.length > 0 || years.length > 0 || tags.length > 0) && (
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          <Chip active={!activeFilters.album && !activeFilters.year && !activeFilters.tag} onClick={() => router.push('/galeria')}>
            Tudo
          </Chip>
          {years.map((year) => (
            <Chip
              key={year}
              active={activeFilters.year === year}
              onClick={() => setFilter('ano', activeFilters.year === year ? null : String(year))}
            >
              {year}
            </Chip>
          ))}
          {albums.map((album) => (
            <Chip
              key={album.id}
              active={activeFilters.album === album.id}
              onClick={() => setFilter('album', activeFilters.album === album.id ? null : album.id)}
            >
              {album.title}
            </Chip>
          ))}
          {tags.slice(0, 12).map((tag) => (
            <Chip
              key={tag}
              active={activeFilters.tag === tag}
              onClick={() => setFilter('tag', activeFilters.tag === tag ? null : tag)}
            >
              #{tag}
            </Chip>
          ))}
        </div>
      )}

      {/* ------------------------------------------------------ neste dia -- */}
      {thisDay.length > 0 && (
        <div className="card p-5">
          <p className="label mb-3 inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Neste dia, em outros anos
          </p>
          <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
            {thisDay.map((item, index) => (
              <div key={item.id} className="w-32 shrink-0">
                <Polaroid src={item.url} caption={String(item.year)} rotate={index % 2 ? 2 : -2} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------- grade --- */}
      {filtered.length === 0 ? (
        <EmptyState
          emoji="📷"
          title="Nenhuma mídia por aqui"
          description="Envie as primeiras fotos e vídeos para começar a galeria de vocês."
          action={<Button onClick={() => setUploadOpen(true)}>Enviar arquivos</Button>}
        />
      ) : (
        <div
          className={cn(
            'grid gap-4',
            view === 'polaroid'
              ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
              : 'grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5',
          )}
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((item, index) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.3, delay: Math.min(index * 0.015, 0.3) }}
              >
                {view === 'polaroid' ? (
                  <Polaroid
                    src={item.kind === 'image' ? item.url : null}
                    caption={item.caption ?? formatDate(item.takenAt, 'MMM yyyy')}
                    rotate={index % 3 === 0 ? -2.5 : index % 3 === 1 ? 1.5 : -0.5}
                    onClick={() => setSelected(item)}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelected(item)}
                    className="focus-ring group relative aspect-square w-full overflow-hidden rounded-xl bg-rose-100"
                  >
                    {item.kind === 'image' && item.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.url}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-2xl">
                        {item.kind === 'video' ? '🎬' : '🎵'}
                      </span>
                    )}
                    {favorites.has(item.id) && (
                      <Heart className="absolute right-2 top-2 h-4 w-4 fill-rose-500 text-rose-500" />
                    )}
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ------------------------------------------------------- lightbox -- */}
      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl bg-ink/5">
              {selected.kind === 'image' && selected.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selected.url} alt="" className="max-h-[65dvh] w-full object-contain" />
              ) : selected.kind === 'video' ? (
                <video src={selected.url ?? undefined} controls className="max-h-[65dvh] w-full" />
              ) : (
                <audio src={selected.url ?? undefined} controls className="w-full p-6" />
              )}
            </div>

            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-display text-xl text-ink">{selected.caption ?? 'Sem legenda'}</p>
                <p className="text-xs text-ink-faint">{formatDate(selected.takenAt)}</p>
                {selected.tags.length > 0 && (
                  <p className="mt-1 text-xs text-rose-700">{selected.tags.map((t) => `#${t}`).join(' ')}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Favoritar"
                onClick={() => void toggleFavorite(selected)}
              >
                <Heart
                  className={cn(
                    'h-5 w-5',
                    favorites.has(selected.id) ? 'fill-rose-500 text-rose-500' : 'text-ink-faint',
                  )}
                />
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="Enviar para a galeria" size="md">
        <Uploader onUploaded={() => router.refresh()} />
      </Modal>
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'focus-ring shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition-colors',
        active
          ? 'border-rose-300 bg-rose-100 font-medium text-rose-700'
          : 'border-line bg-surface/60 text-ink-soft hover:border-rose-300',
      )}
    >
      {children}
    </button>
  )
}
