import type { DateCategory, IntensityLevel, TimelineCategory } from '@/types/db'

export const SITE = {
  name: 'Nosso Universo',
  description: 'Um espaço privado para guardar a nossa história.',
} as const

/** Páginas que podem ser escondidas pelo painel administrativo. */
export interface NavItem {
  href: string
  label: string
  icon: string
  key: string
  group: 'principal' | 'memoria' | 'planos' | 'diversao' | 'conta'
}

export const NAV_ITEMS: NavItem[] = [
  { key: 'home', href: '/', label: 'Início', icon: 'home', group: 'principal' },
  { key: 'historia', href: '/historia', label: 'Nossa História', icon: 'route', group: 'memoria' },
  { key: 'galeria', href: '/galeria', label: 'Galeria', icon: 'images', group: 'memoria' },
  { key: 'sobre-ela', href: '/sobre-ela', label: 'Sobre Ela', icon: 'flower', group: 'memoria' },
  { key: 'cartas', href: '/cartas', label: 'Cartas', icon: 'mail', group: 'memoria' },
  { key: 'capsulas', href: '/capsulas', label: 'Cápsulas', icon: 'hourglass', group: 'memoria' },
  { key: 'planos', href: '/planos', label: 'Nossos Planos', icon: 'star', group: 'planos' },
  { key: 'calendario', href: '/calendario', label: 'Calendário', icon: 'calendar', group: 'planos' },
  { key: 'mapa', href: '/mapa', label: 'Mapa', icon: 'map', group: 'planos' },
  { key: 'playlist', href: '/playlist', label: 'Playlist', icon: 'music', group: 'planos' },
  { key: 'jogos', href: '/jogos', label: 'Jogos', icon: 'gamepad', group: 'diversao' },
  { key: 'retrospectiva', href: '/retrospectiva', label: 'Retrospectiva', icon: 'sparkles', group: 'diversao' },
  { key: 'intimo', href: '/intimo', label: 'Área Íntima', icon: 'lock', group: 'diversao' },
  { key: 'perfil', href: '/perfil', label: 'Nosso Perfil', icon: 'heart', group: 'conta' },
  { key: 'configuracoes', href: '/configuracoes', label: 'Configurações', icon: 'settings', group: 'conta' },
  { key: 'admin', href: '/admin', label: 'Painel', icon: 'sliders', group: 'conta' },
]

/** Atalhos do menu inferior no mobile. */
export const MOBILE_NAV_KEYS = ['home', 'historia', 'galeria', 'jogos', 'cartas'] as const

export const TIMELINE_CATEGORIES: Record<TimelineCategory, { label: string; emoji: string; color: string }> = {
  inicio: { label: 'O começo', emoji: '🌱', color: 'rose' },
  encontro: { label: 'Encontro', emoji: '🍽️', color: 'rose' },
  viagem: { label: 'Viagem', emoji: '✈️', color: 'lilac' },
  aniversario: { label: 'Aniversário', emoji: '🎂', color: 'gold' },
  conquista: { label: 'Conquista', emoji: '🏆', color: 'gold' },
  familia: { label: 'Família', emoji: '🏡', color: 'lilac' },
  engracado: { label: 'Engraçado', emoji: '😂', color: 'rose' },
  superacao: { label: 'Superação', emoji: '💪', color: 'lilac' },
  rotina: { label: 'Nosso dia a dia', emoji: '☕', color: 'rose' },
  outro: { label: 'Momento', emoji: '✨', color: 'rose' },
}

export const DATE_CATEGORIES: Record<DateCategory, { label: string; emoji: string }> = {
  aniversario: { label: 'Aniversário', emoji: '🎂' },
  namoro: { label: 'Namoro', emoji: '💞' },
  viagem: { label: 'Viagem', emoji: '✈️' },
  encontro: { label: 'Encontro', emoji: '🕯️' },
  comemorativa: { label: 'Data comemorativa', emoji: '🎉' },
  evento: { label: 'Evento', emoji: '📌' },
  lembrete: { label: 'Lembrete', emoji: '🔔' },
}

/**
 * Jogos que não sorteiam nada do banco de perguntas: as roletas rodam pelos
 * segmentos do próprio jogo e os dois "adivinhe" usam o acervo do casal.
 * Para esses, banco vazio é o estado normal — não significa nada bloqueado.
 */
const GAMES_SEM_PERGUNTAS = new Set([
  'roleta-do-casal',
  'roleta-de-encontros',
  'adivinhe-a-foto',
  'adivinhe-a-memoria',
])

export function usaBancoDePerguntas(slug: string): boolean {
  return !GAMES_SEM_PERGUNTAS.has(slug)
}

export const INTENSITY: Record<IntensityLevel, { label: string; description: string; rank: number }> = {
  leve: { label: 'Leve', description: 'Carinho, conversa e conexão.', rank: 1 },
  intermediario: { label: 'Intermediário', description: 'Um pouco mais pessoal.', rank: 2 },
  ousado: { label: 'Ousado', description: 'Só com consentimento dos dois.', rank: 3 },
}

export const PALETTES = [
  { value: 'rose', label: 'Rosé clássico', swatch: ['#F8E2E7', '#E8A0AE', '#C6A25A'] },
  { value: 'lilac', label: 'Lilás sereno', swatch: ['#EBE4F9', '#C5B2E2', '#C6A25A'] },
  { value: 'sunset', label: 'Pôr do sol', swatch: ['#FBE2D3', '#EEA888', '#CD9646'] },
  { value: 'midnight', label: 'Noite estrelada', swatch: ['#342A3C', '#D6A3BA', '#D6B36A'] },
] as const

export const FONTS = [
  { value: 'serif', label: 'Clássica', preview: 'font-display' },
  { value: 'sans', label: 'Moderna', preview: 'font-sans' },
] as const

export const ENVELOPE_STYLES = [
  { value: 'rose', label: 'Rosé', from: '#F8E2E7', to: '#E8A0AE' },
  { value: 'lilac', label: 'Lilás', from: '#EBE4F9', to: '#C5B2E2' },
  { value: 'gold', label: 'Dourado', from: '#F6EBD2', to: '#C6A25A' },
  { value: 'cream', label: 'Creme', from: '#FDF8F4', to: '#EFE1D8' },
] as const

/** Sugestões prontas de "Abra quando..." oferecidas ao criar uma carta. */
export const OPEN_WHEN_SUGGESTIONS = [
  'Abra quando estiver com saudade',
  'Abra quando estiver triste',
  'Abra quando estiver muito feliz',
  'Abra quando a gente brigar',
  'Abra quando você não conseguir dormir',
  'Abra quando precisar de coragem',
  'Abra quando duvidar de você mesma',
  'Abra no nosso aniversário',
  'Abra quando eu estiver longe',
  'Abra quando quiser lembrar o quanto eu te amo',
] as const

/** Seções padrão criadas na primeira visita a "Sobre Ela". */
export const DEFAULT_PROFILE_SECTIONS = [
  { title: 'Comidas favoritas', icon: '🍰' },
  { title: 'Restaurantes', icon: '🍝' },
  { title: 'Músicas e artistas', icon: '🎧' },
  { title: 'Filmes e séries', icon: '🎬' },
  { title: 'Hobbies', icon: '🎨' },
  { title: 'Cores favoritas', icon: '🎨' },
  { title: 'Perfumes e flores', icon: '🌸' },
  { title: 'Roupas e tamanhos', icon: '👗' },
  { title: 'Sonhos', icon: '⭐' },
  { title: 'Lugares que quer conhecer', icon: '🗺️' },
  { title: 'Presentes desejados', icon: '🎁' },
  { title: 'Coisas que não gosta', icon: '🚫' },
  { title: 'Manias', icon: '🌀' },
  { title: 'Frases dela', icon: '💬' },
  { title: 'Curiosidades', icon: '✨' },
] as const

export const UPLOAD_LIMITS = {
  image: 25 * 1024 * 1024,
  video: 200 * 1024 * 1024,
  audio: 50 * 1024 * 1024,
} as const

export const ACCEPTED_MIME: Record<'image' | 'video' | 'audio', string[]> = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'],
  video: ['video/mp4', 'video/quicktime', 'video/webm'],
  audio: ['audio/mpeg', 'audio/mp4', 'audio/webm', 'audio/ogg'],
}

/** Validade das signed URLs de mídia (segundos). */
export const SIGNED_URL_TTL = 60 * 30
