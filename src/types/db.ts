/**
 * Tipos das tabelas do Supabase.
 *
 * Mantidos à mão e espelhando `supabase/migrations`. Ao alterar uma migration,
 * atualize aqui também (ou rode `supabase gen types typescript` e substitua).
 */

export type UUID = string
export type ISODate = string // yyyy-mm-dd
export type ISODateTime = string

export type CoupleRole = 'owner' | 'partner'
export type MediaKind = 'image' | 'video' | 'audio'
export type TimelineCategory =
  | 'inicio' | 'encontro' | 'viagem' | 'aniversario' | 'conquista'
  | 'familia' | 'engracado' | 'superacao' | 'rotina' | 'outro'
export type LetterType = 'comum' | 'surpresa' | 'programada' | 'privada' | 'abra_quando'
export type DateCategory =
  | 'aniversario' | 'namoro' | 'viagem' | 'encontro' | 'comemorativa' | 'evento' | 'lembrete'
export type DateRecurrence = 'nenhuma' | 'anual' | 'mensal'
export type BucketStatus = 'quero' | 'planejado' | 'concluido'
export type GameCategory = 'classico' | 'conexao' | 'sorte' | 'memoria' | 'intimo'
export type GameMode = 'juntos' | 'individual' | 'secreto'
export type SessionStatus = 'ativa' | 'finalizada' | 'abandonada'
export type IntensityLevel = 'leve' | 'intermediario' | 'ousado'
export type ConsentStatus = 'pendente' | 'aprovado' | 'recusado' | 'revogado'
export type NotificationKind =
  | 'data' | 'carta' | 'capsula' | 'surpresa' | 'jogo' | 'consentimento' | 'conquista' | 'sistema'

export interface Profile {
  id: UUID
  display_name: string
  avatar_url: string | null
  birthdate: ISODate | null
  pronouns: string | null
  adult_confirmed_at: ISODateTime | null
  created_at: ISODateTime
  updated_at: ISODateTime
}

export interface Couple {
  id: UUID
  name: string
  tagline: string | null
  started_at: ISODate
  timezone: string
  cover_media_id: UUID | null
  created_by: UUID
  created_at: ISODateTime
  updated_at: ISODateTime
}

export interface CoupleMember {
  couple_id: UUID
  user_id: UUID
  role: CoupleRole
  nickname: string | null
  joined_at: ISODateTime
}

export interface CoupleSettings {
  couple_id: UUID
  palette: string
  font: string
  animations: boolean
  particles: boolean
  ambient_song_id: UUID | null
  hidden_pages: string[]
  home_quote: string | null
  intimate_enabled: boolean
  updated_at: ISODateTime
}

export interface Album {
  id: UUID
  couple_id: UUID
  title: string
  description: string | null
  cover_media_id: UUID | null
  sort_order: number
  created_by: UUID
  created_at: ISODateTime
}

export interface Media {
  id: UUID
  couple_id: UUID
  album_id: UUID | null
  bucket: string
  path: string
  kind: MediaKind
  mime_type: string
  size_bytes: number
  width: number | null
  height: number | null
  duration_seconds: number | null
  caption: string | null
  taken_at: ISODateTime | null
  tags: string[]
  is_favorite: boolean
  is_intimate: boolean
  created_by: UUID
  created_at: ISODateTime
}

export interface Location {
  id: UUID
  couple_id: UUID
  name: string
  city: string | null
  country: string | null
  latitude: number | null
  longitude: number | null
  visited_on: ISODate | null
  story: string | null
  cover_media_id: UUID | null
  created_by: UUID
  created_at: ISODateTime
}

export interface Song {
  id: UUID
  couple_id: UUID
  title: string
  artist: string | null
  url: string | null
  provider: string | null
  reason: string | null
  sort_order: number
  created_by: UUID
  created_at: ISODateTime
}

export interface Memory {
  id: UUID
  couple_id: UUID
  title: string
  description: string | null
  happened_on: ISODate | null
  location_id: UUID | null
  song_id: UUID | null
  cover_media_id: UUID | null
  emoji: string | null
  tags: string[]
  is_favorite: boolean
  is_intimate: boolean
  created_by: UUID
  created_at: ISODateTime
  updated_at: ISODateTime
}

export interface TimelineEvent {
  id: UUID
  couple_id: UUID
  title: string
  description: string | null
  event_date: ISODate
  event_time: string | null
  category: TimelineCategory
  emoji: string | null
  tags: string[]
  is_highlight: boolean
  location_id: UUID | null
  song_id: UUID | null
  memory_id: UUID | null
  sort_order: number
  created_by: UUID
  created_at: ISODateTime
  updated_at: ISODateTime
}

export interface Letter {
  id: UUID
  couple_id: UUID
  author_id: UUID
  recipient_id: UUID | null
  title: string
  body: string
  letter_type: LetterType
  open_condition: string | null
  deliver_at: ISODateTime | null
  song_id: UUID | null
  envelope_style: string
  opened_at: ISODateTime | null
  opened_by: UUID | null
  is_archived: boolean
  created_at: ISODateTime
  updated_at: ISODateTime
}

export interface TimeCapsule {
  id: UUID
  couple_id: UUID
  title: string
  unlock_at: ISODateTime
  created_by: UUID
  opened_at: ISODateTime | null
  opened_by: UUID | null
  created_at: ISODateTime
}

export interface TimeCapsuleContent {
  capsule_id: UUID
  couple_id: UUID
  message: string
}

export interface ImportantDate {
  id: UUID
  couple_id: UUID
  title: string
  description: string | null
  date: ISODate
  end_date: ISODate | null
  recurrence: DateRecurrence
  category: DateCategory
  color: string | null
  notify_days_before: number[]
  created_by: UUID
  created_at: ISODateTime
}

export interface BucketListItem {
  id: UUID
  couple_id: UUID
  title: string
  description: string | null
  category: string
  status: BucketStatus
  priority: number
  target_date: ISODate | null
  completed_at: ISODateTime | null
  completed_media_id: UUID | null
  sort_order: number
  created_by: UUID
  created_at: ISODateTime
}

export interface ProfileSection {
  id: UUID
  couple_id: UUID
  subject_user_id: UUID
  title: string
  icon: string | null
  sort_order: number
  created_at: ISODateTime
}

export interface ProfileItem {
  id: UUID
  couple_id: UUID
  section_id: UUID
  label: string
  value: string | null
  note: string | null
  media_id: UUID | null
  is_favorite: boolean
  sort_order: number
  created_at: ISODateTime
}

export interface Game {
  id: UUID
  slug: string
  name: string
  tagline: string | null
  description: string | null
  icon: string | null
  category: GameCategory
  modes: GameMode[]
  is_intimate: boolean
  is_active: boolean
  sort_order: number
  config: Record<string, unknown>
}

export interface GameQuestion {
  id: UUID
  game_id: UUID
  couple_id: UUID | null
  content: string
  options: string[]
  answer_key: string | null
  category: string | null
  intensity: IntensityLevel
  consent_category: string | null
  is_intimate: boolean
  tags: string[]
  is_active: boolean
  media_id: UUID | null
  memory_id: UUID | null
  created_by: UUID | null
  created_at: ISODateTime
}

export interface GameSession {
  id: UUID
  couple_id: UUID
  game_id: UUID
  mode: GameMode
  status: SessionStatus
  settings: Record<string, unknown>
  scores: Record<string, number>
  question_ids: UUID[]
  current_index: number
  started_at: ISODateTime
  ended_at: ISODateTime | null
  created_by: UUID
}

export interface GameAnswer {
  id: UUID
  session_id: UUID
  couple_id: UUID
  question_id: UUID
  user_id: UUID
  about_user_id: UUID | null
  answer: { value?: string; index?: number; text?: string }
  is_correct: boolean | null
  points: number
  answered_at: ISODateTime
}

export interface Achievement {
  id: UUID
  code: string
  name: string
  description: string
  icon: string
  xp: number
  criteria: { metric: string; target: number }
  sort_order: number
}

export interface UserAchievement {
  id: UUID
  couple_id: UUID
  user_id: UUID | null
  achievement_id: UUID
  unlocked_at: ISODateTime
}

export interface CoupleStats {
  couple_id: UUID
  xp: number
  points: number
  streak_days: number
  last_played_on: ISODate | null
  games_played: number
  questions_answered: number
  updated_at: ISODateTime
}

export interface ConsentCategory {
  code: string
  name: string
  description: string
  intensity: IntensityLevel
  sort_order: number
}

export interface IntimateSettings {
  couple_id: UUID
  user_id: UUID
  pin_hash: string | null
  adult_confirmed_at: ISODateTime | null
  max_intensity: IntensityLevel
  blocked_categories: string[]
  is_enabled: boolean
  updated_at: ISODateTime
}

export interface ConsentGrant {
  id: UUID
  couple_id: UUID
  user_id: UUID
  category_code: string
  granted_at: ISODateTime
  revoked_at: ISODateTime | null
}

export interface ConsentRequest {
  id: UUID
  couple_id: UUID
  category_code: string
  requested_by: UUID
  message: string | null
  status: ConsentStatus
  responded_by: UUID | null
  responded_at: ISODateTime | null
  created_at: ISODateTime
}

export interface Surprise {
  id: UUID
  couple_id: UUID
  title: string
  message: string
  reveal_at: ISODateTime
  target_user_id: UUID | null
  animation: string
  song_id: UUID | null
  revealed_at: ISODateTime | null
  is_active: boolean
  created_by: UUID
  created_at: ISODateTime
}

export interface Notification {
  id: UUID
  couple_id: UUID
  user_id: UUID | null
  kind: NotificationKind
  title: string
  body: string | null
  link: string | null
  is_intimate: boolean
  read_at: ISODateTime | null
  created_at: ISODateTime
}
