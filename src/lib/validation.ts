import { z } from 'zod'

/**
 * Fonte única de verdade para validação. Os mesmos schemas rodam no formulário
 * (react-hook-form) e nas Server Actions, antes de qualquer escrita no banco.
 */

const text = (max: number) => z.string().trim().max(max)
const requiredText = (max: number, field = 'Campo') =>
  z.string().trim().min(1, `${field} é obrigatório`).max(max)

export const emailSchema = z.string().trim().toLowerCase().email('E-mail inválido')

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, 'A senha precisa ter ao menos 8 caracteres'),
})

export const signUpSchema = signInSchema.extend({
  displayName: requiredText(60, 'Nome'),
})

export const coupleSchema = z.object({
  name: requiredText(80, 'Nome do casal'),
  tagline: text(160).optional().or(z.literal('')),
  started_at: z.string().min(1, 'Informe a data em que tudo começou'),
  timezone: z.string().default('America/Sao_Paulo'),
})

export const memorySchema = z.object({
  title: requiredText(140, 'Título'),
  description: text(8000).optional().or(z.literal('')),
  happened_on: z.string().optional().or(z.literal('')),
  emoji: text(8).optional().or(z.literal('')),
  tags: z.array(z.string().trim().max(40)).max(20).default([]),
  is_favorite: z.boolean().default(false),
  location_id: z.string().uuid().nullable().optional(),
  song_id: z.string().uuid().nullable().optional(),
  cover_media_id: z.string().uuid().nullable().optional(),
})

export const timelineEventSchema = z.object({
  title: requiredText(140, 'Título'),
  description: text(8000).optional().or(z.literal('')),
  event_date: z.string().min(1, 'Informe a data do acontecimento'),
  event_time: z.string().optional().or(z.literal('')),
  category: z.enum([
    'inicio', 'encontro', 'viagem', 'aniversario', 'conquista',
    'familia', 'engracado', 'superacao', 'rotina', 'outro',
  ]),
  emoji: text(8).optional().or(z.literal('')),
  tags: z.array(z.string().trim().max(40)).max(20).default([]),
  is_highlight: z.boolean().default(false),
  location_id: z.string().uuid().nullable().optional(),
  song_id: z.string().uuid().nullable().optional(),
})

export const letterSchema = z
  .object({
    title: requiredText(140, 'Título'),
    body: requiredText(20000, 'Texto da carta'),
    letter_type: z.enum(['comum', 'surpresa', 'programada', 'privada', 'abra_quando']),
    open_condition: text(160).optional().or(z.literal('')),
    deliver_at: z.string().optional().or(z.literal('')),
    envelope_style: z.enum(['rose', 'lilac', 'gold', 'cream']).default('rose'),
    song_id: z.string().uuid().nullable().optional(),
  })
  .refine(
    (data) => data.letter_type !== 'programada' || Boolean(data.deliver_at),
    { message: 'Carta programada precisa de uma data de entrega', path: ['deliver_at'] },
  )
  .refine(
    (data) => data.letter_type !== 'abra_quando' || Boolean(data.open_condition),
    { message: 'Descreva quando ela deve ser aberta', path: ['open_condition'] },
  )

export const timeCapsuleSchema = z.object({
  title: requiredText(140, 'Título'),
  message: requiredText(20000, 'Mensagem'),
  unlock_at: z
    .string()
    .min(1, 'Escolha a data de abertura')
    .refine((value) => new Date(value).getTime() > Date.now(), {
      message: 'A cápsula precisa abrir em uma data futura',
    }),
})

export const importantDateSchema = z.object({
  title: requiredText(140, 'Título'),
  description: text(2000).optional().or(z.literal('')),
  date: z.string().min(1, 'Escolha a data'),
  end_date: z.string().optional().or(z.literal('')),
  recurrence: z.enum(['nenhuma', 'anual', 'mensal']).default('nenhuma'),
  category: z.enum(['aniversario', 'namoro', 'viagem', 'encontro', 'comemorativa', 'evento', 'lembrete']),
  color: text(20).optional().or(z.literal('')),
  notify_days_before: z.array(z.number().int().min(0).max(365)).max(5).default([7, 1]),
})

export const bucketItemSchema = z.object({
  title: requiredText(140, 'Título'),
  description: text(4000).optional().or(z.literal('')),
  category: text(40).default('geral'),
  status: z.enum(['quero', 'planejado', 'concluido']).default('quero'),
  priority: z.number().int().min(1).max(3).default(2),
  target_date: z.string().optional().or(z.literal('')),
})

export const locationSchema = z.object({
  name: requiredText(140, 'Nome do lugar'),
  city: text(80).optional().or(z.literal('')),
  country: text(80).optional().or(z.literal('')),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  visited_on: z.string().optional().or(z.literal('')),
  story: text(4000).optional().or(z.literal('')),
})

export const songSchema = z.object({
  title: requiredText(140, 'Nome da música'),
  artist: text(140).optional().or(z.literal('')),
  url: z.string().url('Link inválido').optional().or(z.literal('')),
  reason: text(2000).optional().or(z.literal('')),
})

export const profileSectionSchema = z.object({
  title: requiredText(80, 'Título da seção'),
  icon: text(8).optional().or(z.literal('')),
})

export const profileItemSchema = z.object({
  label: requiredText(120, 'Nome'),
  value: text(500).optional().or(z.literal('')),
  note: text(1000).optional().or(z.literal('')),
  is_favorite: z.boolean().default(false),
})

export const surpriseSchema = z.object({
  title: requiredText(140, 'Título'),
  message: requiredText(8000, 'Mensagem'),
  reveal_at: z
    .string()
    .min(1, 'Escolha quando ela deve aparecer')
    .refine((value) => new Date(value).getTime() > Date.now(), {
      message: 'A surpresa precisa ser agendada para o futuro',
    }),
  animation: z.enum(['confete', 'estrelas', 'petalas', 'brilho']).default('confete'),
})

export const gameQuestionSchema = z.object({
  content: requiredText(500, 'Pergunta'),
  options: z.array(z.string().trim().max(200)).max(6).default([]),
  category: text(40).optional().or(z.literal('')),
  intensity: z.enum(['leve', 'intermediario', 'ousado']).default('leve'),
  is_intimate: z.boolean().default(false),
  consent_category: text(40).optional().or(z.literal('')),
})

export const settingsSchema = z.object({
  palette: z.enum(['rose', 'lilac', 'sunset', 'midnight']).default('rose'),
  font: z.enum(['serif', 'sans']).default('serif'),
  animations: z.boolean().default(true),
  particles: z.boolean().default(true),
  home_quote: text(240).optional().or(z.literal('')),
  hidden_pages: z.array(z.string().max(40)).max(30).default([]),
})

export const pinSchema = z.object({
  pin: z
    .string()
    .regex(/^\d{4,8}$/, 'O PIN precisa ter de 4 a 8 dígitos'),
})

export const intimatePreferencesSchema = z.object({
  max_intensity: z.enum(['leve', 'intermediario', 'ousado']).default('leve'),
  blocked_categories: z.array(z.string().max(40)).max(30).default([]),
})

export type SignInInput = z.infer<typeof signInSchema>
export type SignUpInput = z.infer<typeof signUpSchema>
export type MemoryInput = z.infer<typeof memorySchema>
export type TimelineEventInput = z.infer<typeof timelineEventSchema>
export type LetterInput = z.infer<typeof letterSchema>
export type TimeCapsuleInput = z.infer<typeof timeCapsuleSchema>
export type ImportantDateInput = z.infer<typeof importantDateSchema>
export type BucketItemInput = z.infer<typeof bucketItemSchema>
export type LocationInput = z.infer<typeof locationSchema>
export type SongInput = z.infer<typeof songSchema>
export type SurpriseInput = z.infer<typeof surpriseSchema>
export type SettingsInput = z.infer<typeof settingsSchema>
export type GameQuestionInput = z.infer<typeof gameQuestionSchema>
