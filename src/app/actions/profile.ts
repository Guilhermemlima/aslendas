'use server'

import { revalidatePath } from 'next/cache'
import { actionContext, clean, fail, firstIssue, ok, type Result } from '@/app/actions/_helpers'
import { profileItemSchema, profileSectionSchema, settingsSchema } from '@/lib/validation'
import { DEFAULT_PROFILE_SECTIONS } from '@/lib/constants'
import type { SettingsInput } from '@/lib/validation'

/* ------------------------------------------------------- seções "Sobre" ---- */

export async function ensureDefaultSections(subjectUserId: string): Promise<Result> {
  const { supabase, coupleId } = await actionContext()

  const { count } = await supabase
    .from('profile_sections')
    .select('id', { count: 'exact', head: true })
    .eq('couple_id', coupleId)
    .eq('subject_user_id', subjectUserId)

  if ((count ?? 0) > 0) return ok()

  const { error } = await supabase.from('profile_sections').insert(
    DEFAULT_PROFILE_SECTIONS.map((section, index) => ({
      couple_id: coupleId,
      subject_user_id: subjectUserId,
      title: section.title,
      icon: section.icon,
      sort_order: index,
    })),
  )
  if (error) return fail(error.message)

  revalidatePath('/sobre-ela')
  return ok()
}

export async function saveProfileSection(input: {
  id?: string
  subjectUserId: string
  title: string
  icon?: string
}): Promise<Result<{ id: string }>> {
  const parsed = profileSectionSchema.safeParse({ title: input.title, icon: input.icon ?? '' })
  if (!parsed.success) return fail(firstIssue(parsed.error))

  const { supabase, coupleId } = await actionContext()
  const row = clean({
    couple_id: coupleId,
    subject_user_id: input.subjectUserId,
    title: parsed.data.title,
    icon: parsed.data.icon || null,
  })

  const { data, error } = input.id
    ? await supabase.from('profile_sections').update(row).eq('id', input.id).select('id').single()
    : await supabase.from('profile_sections').insert(row).select('id').single()

  if (error) return fail(error.message)
  revalidatePath('/sobre-ela')
  return ok({ id: data.id as string })
}

export async function deleteProfileSection(id: string): Promise<Result> {
  const { supabase } = await actionContext()
  const { error } = await supabase.from('profile_sections').delete().eq('id', id)
  if (error) return fail(error.message)
  revalidatePath('/sobre-ela')
  return ok()
}

export async function saveProfileItem(input: {
  id?: string
  sectionId: string
  label: string
  value?: string
  note?: string
  is_favorite?: boolean
}): Promise<Result<{ id: string }>> {
  const parsed = profileItemSchema.safeParse({
    label: input.label,
    value: input.value ?? '',
    note: input.note ?? '',
    is_favorite: input.is_favorite ?? false,
  })
  if (!parsed.success) return fail(firstIssue(parsed.error))

  const { supabase, coupleId } = await actionContext()
  const row = {
    ...clean({
      couple_id: coupleId,
      section_id: input.sectionId,
      label: parsed.data.label,
      value: parsed.data.value || null,
      note: parsed.data.note || null,
    }),
    is_favorite: parsed.data.is_favorite,
  }

  const { data, error } = input.id
    ? await supabase.from('profile_items').update(row).eq('id', input.id).select('id').single()
    : await supabase.from('profile_items').insert(row).select('id').single()

  if (error) return fail(error.message)
  revalidatePath('/sobre-ela')
  return ok({ id: data.id as string })
}

export async function deleteProfileItem(id: string): Promise<Result> {
  const { supabase } = await actionContext()
  const { error } = await supabase.from('profile_items').delete().eq('id', id)
  if (error) return fail(error.message)
  revalidatePath('/sobre-ela')
  return ok()
}

export async function reorderProfileSections(orderedIds: string[]): Promise<Result> {
  const { supabase, coupleId } = await actionContext()
  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from('profile_sections').update({ sort_order: index }).eq('id', id).eq('couple_id', coupleId),
    ),
  )
  const failed = results.find((result) => result.error)
  if (failed?.error) return fail(failed.error.message)
  revalidatePath('/sobre-ela')
  return ok()
}

/* ----------------------------------------------------------- personalização */

export async function saveSettings(input: SettingsInput): Promise<Result> {
  const parsed = settingsSchema.safeParse(input)
  if (!parsed.success) return fail(firstIssue(parsed.error))

  const { supabase, coupleId } = await actionContext()
  const { error } = await supabase.from('couple_settings').upsert({
    couple_id: coupleId,
    palette: parsed.data.palette,
    font: parsed.data.font,
    animations: parsed.data.animations,
    particles: parsed.data.particles,
    home_quote: parsed.data.home_quote || null,
    hidden_pages: parsed.data.hidden_pages,
    updated_at: new Date().toISOString(),
  })

  if (error) return fail(error.message)
  revalidatePath('/', 'layout')
  return ok()
}

export async function updateCouple(input: {
  name?: string
  tagline?: string
  started_at?: string
  cover_media_id?: string | null
}): Promise<Result> {
  const { supabase, coupleId } = await actionContext()

  const patch = clean({
    name: input.name,
    tagline: input.tagline,
    started_at: input.started_at,
  })
  const row: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(patch)) {
    if (value !== null) row[key] = value
  }
  if (input.cover_media_id !== undefined) row.cover_media_id = input.cover_media_id

  if (Object.keys(row).length === 0) return ok()

  const { error } = await supabase.from('couples').update(row).eq('id', coupleId)
  if (error) return fail(error.message)

  revalidatePath('/', 'layout')
  return ok()
}

export async function updateProfile(input: {
  display_name?: string
  birthdate?: string | null
  pronouns?: string | null
  avatar_url?: string | null
}): Promise<Result> {
  const { supabase, userId } = await actionContext()

  const row: Record<string, unknown> = {}
  if (input.display_name) row.display_name = input.display_name.trim().slice(0, 60)
  if (input.birthdate !== undefined) row.birthdate = input.birthdate || null
  if (input.pronouns !== undefined) row.pronouns = input.pronouns || null
  if (input.avatar_url !== undefined) row.avatar_url = input.avatar_url

  if (Object.keys(row).length === 0) return ok()

  const { error } = await supabase.from('profiles').update(row).eq('id', userId)
  if (error) return fail(error.message)

  revalidatePath('/', 'layout')
  return ok()
}
