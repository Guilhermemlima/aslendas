'use server'

import { revalidatePath } from 'next/cache'
import { actionContext, fail, ok, type Result } from '@/app/actions/_helpers'
import { ACCEPTED_MIME, UPLOAD_LIMITS } from '@/lib/constants'
import { sanitizeText } from '@/lib/utils'
import type { MediaKind } from '@/types/db'

const BUCKETS = ['couple-media', 'letters-media', 'private-media'] as const
type Bucket = (typeof BUCKETS)[number]

function kindOf(mime: string): MediaKind | null {
  if (ACCEPTED_MIME.image.includes(mime)) return 'image'
  if (ACCEPTED_MIME.video.includes(mime)) return 'video'
  if (ACCEPTED_MIME.audio.includes(mime)) return 'audio'
  return null
}

/**
 * Gera o caminho e a URL assinada para o upload direto do browser.
 * O arquivo nunca passa pelo servidor Next — só os metadados passam.
 */
export async function createUploadTicket(input: {
  fileName: string
  mimeType: string
  sizeBytes: number
  bucket?: Bucket
}): Promise<Result<{ path: string; token: string; bucket: Bucket; kind: MediaKind }>> {
  const kind = kindOf(input.mimeType)
  if (!kind) return fail('Formato de arquivo não aceito.')
  if (input.sizeBytes > UPLOAD_LIMITS[kind]) {
    const limitMb = Math.round(UPLOAD_LIMITS[kind] / 1024 / 1024)
    return fail(`Arquivo muito grande. O limite para ${kind} é ${limitMb} MB.`)
  }

  const bucket: Bucket = BUCKETS.includes(input.bucket as Bucket) ? (input.bucket as Bucket) : 'couple-media'
  const { supabase, coupleId } = await actionContext()

  const extension = (input.fileName.split('.').pop() ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '')
  const year = new Date().getFullYear()
  // O primeiro segmento é o couple_id: é ele que as políticas do storage checam.
  const path = `${coupleId}/${year}/${crypto.randomUUID()}.${extension}`

  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path)
  if (error || !data) return fail(error?.message ?? 'Não consegui preparar o upload.')

  return ok({ path, token: data.token, bucket, kind })
}

/** Registra no banco um arquivo que já subiu para o storage. */
export async function registerMedia(input: {
  bucket: Bucket
  path: string
  mimeType: string
  sizeBytes: number
  caption?: string
  takenAt?: string | null
  albumId?: string | null
  width?: number | null
  height?: number | null
  durationSeconds?: number | null
  isIntimate?: boolean
  tags?: string[]
}): Promise<Result<{ id: string }>> {
  const kind = kindOf(input.mimeType)
  if (!kind) return fail('Formato de arquivo não aceito.')

  const { supabase, coupleId, userId } = await actionContext()

  // Confere se o caminho realmente pertence a este casal antes de gravar.
  if (!input.path.startsWith(`${coupleId}/`)) return fail('Caminho de arquivo inválido.')

  const { data, error } = await supabase
    .from('media')
    .insert({
      couple_id: coupleId,
      bucket: input.bucket,
      path: input.path,
      kind,
      mime_type: input.mimeType,
      size_bytes: input.sizeBytes,
      caption: input.caption ? sanitizeText(input.caption, 300) : null,
      taken_at: input.takenAt ?? null,
      album_id: input.albumId ?? null,
      width: input.width ?? null,
      height: input.height ?? null,
      duration_seconds: input.durationSeconds ?? null,
      is_intimate: input.isIntimate ?? false,
      tags: input.tags ?? [],
      created_by: userId,
    })
    .select('id')
    .single()

  if (error) return fail(error.message)

  revalidatePath('/galeria')
  return ok({ id: data.id as string })
}

export async function updateMedia(
  id: string,
  patch: { caption?: string; tags?: string[]; is_favorite?: boolean; album_id?: string | null; taken_at?: string | null },
): Promise<Result> {
  const { supabase } = await actionContext()

  const row: Record<string, unknown> = {}
  if (patch.caption !== undefined) row.caption = sanitizeText(patch.caption, 300) || null
  if (patch.tags !== undefined) row.tags = patch.tags.slice(0, 20)
  if (patch.is_favorite !== undefined) row.is_favorite = patch.is_favorite
  if (patch.album_id !== undefined) row.album_id = patch.album_id
  if (patch.taken_at !== undefined) row.taken_at = patch.taken_at

  if (Object.keys(row).length === 0) return ok()

  const { error } = await supabase.from('media').update(row).eq('id', id)
  if (error) return fail(error.message)

  revalidatePath('/galeria')
  return ok()
}

/** Apaga o arquivo do storage e depois a linha do banco. */
export async function deleteMedia(id: string): Promise<Result> {
  const { supabase } = await actionContext()

  const { data: media } = await supabase.from('media').select('bucket, path').eq('id', id).maybeSingle()
  if (!media) return fail('Mídia não encontrada.')

  await supabase.storage.from(media.bucket as string).remove([media.path as string])
  const { error } = await supabase.from('media').delete().eq('id', id)
  if (error) return fail(error.message)

  revalidatePath('/galeria')
  return ok()
}

export async function saveAlbum(input: { id?: string; title: string; description?: string }): Promise<Result<{ id: string }>> {
  const title = sanitizeText(input.title, 120)
  if (!title) return fail('Dê um nome ao álbum.')

  const { supabase, coupleId, userId } = await actionContext()
  const row = {
    couple_id: coupleId,
    title,
    description: input.description ? sanitizeText(input.description, 500) : null,
    created_by: userId,
  }

  const { data, error } = input.id
    ? await supabase.from('albums').update(row).eq('id', input.id).select('id').single()
    : await supabase.from('albums').insert(row).select('id').single()

  if (error) return fail(error.message)
  revalidatePath('/galeria')
  return ok({ id: data.id as string })
}

export async function deleteAlbum(id: string): Promise<Result> {
  const { supabase } = await actionContext()
  const { error } = await supabase.from('albums').delete().eq('id', id)
  if (error) return fail(error.message)
  revalidatePath('/galeria')
  return ok()
}
