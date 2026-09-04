'use client'

import { useCallback, useRef, useState } from 'react'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { createUploadTicket, registerMedia } from '@/app/actions/media'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

export interface UploadedItem {
  id: string
  previewUrl: string
  name: string
}

/**
 * Upload direto do browser para o Supabase Storage usando URL assinada.
 * O servidor só gera o ticket e registra os metadados — o arquivo não trafega
 * pelo Next, o que mantém uploads grandes viáveis na Vercel.
 */
export function Uploader({
  bucket = 'couple-media',
  albumId,
  isIntimate,
  onUploaded,
  label = 'Adicionar fotos, vídeos ou áudio',
  className,
}: {
  bucket?: 'couple-media' | 'letters-media' | 'private-media'
  albumId?: string | null
  isIntimate?: boolean
  onUploaded?: (items: UploadedItem[]) => void
  label?: string
  className?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [items, setItems] = useState<UploadedItem[]>([])
  const { notify } = useToast()

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return
      setBusy(true)
      setProgress({ done: 0, total: files.length })

      const supabase = createClient()
      const uploaded: UploadedItem[] = []

      for (const file of Array.from(files)) {
        const ticket = await createUploadTicket({
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          bucket,
        })

        if (!ticket.ok || !ticket.data) {
          notify(ticket.error ?? 'Falha ao preparar o upload.', 'error')
          setProgress((current) => (current ? { ...current, done: current.done + 1 } : null))
          continue
        }

        const { error } = await supabase.storage
          .from(ticket.data.bucket)
          .uploadToSignedUrl(ticket.data.path, ticket.data.token, file)

        if (error) {
          notify(`Não consegui enviar ${file.name}.`, 'error')
          setProgress((current) => (current ? { ...current, done: current.done + 1 } : null))
          continue
        }

        const dimensions = file.type.startsWith('image/') ? await readImageSize(file) : null

        const registered = await registerMedia({
          bucket: ticket.data.bucket,
          path: ticket.data.path,
          mimeType: file.type,
          sizeBytes: file.size,
          albumId: albumId ?? null,
          isIntimate,
          takenAt: new Date(file.lastModified).toISOString(),
          width: dimensions?.width ?? null,
          height: dimensions?.height ?? null,
        })

        if (registered.ok && registered.data) {
          uploaded.push({
            id: registered.data.id,
            previewUrl: URL.createObjectURL(file),
            name: file.name,
          })
        } else {
          notify(registered.error ?? 'Falha ao registrar a mídia.', 'error')
        }

        setProgress((current) => (current ? { ...current, done: current.done + 1 } : null))
      }

      setItems((current) => [...current, ...uploaded])
      onUploaded?.(uploaded)
      setBusy(false)
      setProgress(null)
      if (uploaded.length > 0) notify(`${uploaded.length} arquivo(s) guardado(s).`)
    },
    [albumId, bucket, isIntimate, notify, onUploaded],
  )

  return (
    <div className={cn('space-y-3', className)}>
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          void handleFiles(event.dataTransfer.files)
        }}
        className="focus-ring flex w-full flex-col items-center gap-2 rounded-card border-2 border-dashed border-line bg-surface/50 px-6 py-8 text-center transition-colors hover:border-rose-300 hover:bg-rose-50/50 disabled:opacity-60"
      >
        {busy ? (
          <Loader2 className="h-6 w-6 animate-spin text-rose-500" />
        ) : (
          <ImagePlus className="h-6 w-6 text-rose-300" />
        )}
        <span className="text-sm font-medium text-ink">{label}</span>
        <span className="text-xs text-ink-faint">
          {progress ? `Enviando ${progress.done + 1} de ${progress.total}...` : 'Arraste aqui ou toque para escolher'}
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,video/*,audio/*"
        className="hidden"
        onChange={(event) => {
          void handleFiles(event.target.files)
          event.target.value = ''
        }}
      />

      {items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <div key={item.id} className="relative h-16 w-16 overflow-hidden rounded-xl border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                aria-label={`Remover ${item.name}`}
                onClick={() => setItems((current) => current.filter((i) => i.id !== item.id))}
                className="absolute right-0.5 top-0.5 rounded-full bg-ink/60 p-0.5 text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function readImageSize(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const image = new Image()
    const url = URL.createObjectURL(file)
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight })
      URL.revokeObjectURL(url)
    }
    image.onerror = () => {
      resolve(null)
      URL.revokeObjectURL(url)
    }
    image.src = url
  })
}
