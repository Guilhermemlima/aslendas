import Link from 'next/link'
import { requireCouple } from '@/services/session'
import { createClient } from '@/lib/supabase/server'
import { Card, CardBody } from '@/components/ui/card'
import { SectionHeading } from '@/components/ui/misc'
import { PageTransition, Reveal } from '@/components/motion/reveal'

export const metadata = { title: 'Painel · Nosso Universo' }

const SECTIONS = [
  { href: '/admin/timeline', emoji: '🧭', title: 'Linha do tempo', description: 'Criar, editar e reordenar os momentos.', table: 'timeline_events' },
  { href: '/admin/memorias', emoji: '💭', title: 'Memórias', description: 'Textos, fotos, músicas e localização.', table: 'memories' },
  { href: '/admin/midia', emoji: '🖼️', title: 'Mídia e álbuns', description: 'Enviar arquivos e organizar em álbuns.', table: 'media' },
  { href: '/admin/surpresas', emoji: '🎁', title: 'Surpresas', description: 'Programar algo escondido para uma data.', table: 'surprises' },
  { href: '/admin/jogos', emoji: '🎲', title: 'Perguntas dos jogos', description: 'Criar perguntas próprias e desativar as que não combinam.', table: 'game_questions' },
  { href: '/calendario', emoji: '📅', title: 'Datas', description: 'Aniversários, viagens e lembretes.', table: 'important_dates' },
  { href: '/cartas', emoji: '💌', title: 'Cartas', description: 'Escrever e programar entregas.', table: 'letters' },
  { href: '/capsulas', emoji: '⏳', title: 'Cápsulas', description: 'Mensagens seladas para o futuro.', table: 'time_capsules' },
  { href: '/planos', emoji: '⭐', title: 'Lista de sonhos', description: 'O que ainda falta fazer.', table: 'bucket_list' },
  { href: '/mapa', emoji: '🗺️', title: 'Lugares', description: 'Os lugares por onde vocês passaram.', table: 'locations' },
  { href: '/playlist', emoji: '🎧', title: 'Playlist', description: 'As músicas de vocês.', table: 'songs' },
  { href: '/configuracoes', emoji: '🎨', title: 'Aparência', description: 'Paleta, fontes, animações e páginas visíveis.', table: null },
] as const

export default async function AdminPage() {
  const { couple } = await requireCouple()
  const supabase = await createClient()

  // Contagem por tabela para dar noção do acervo de cada área.
  const tables = [...new Set(SECTIONS.map((section) => section.table).filter(Boolean))] as string[]
  const counts = await Promise.all(
    tables.map(async (table) => {
      const { count } = await supabase
        .from(table)
        .select('id', { count: 'exact', head: true })
        .eq('couple_id', couple.id)
      return [table, count ?? 0] as const
    }),
  )
  const countMap = new Map(counts)

  return (
    <PageTransition className="space-y-8">
      <SectionHeading
        eyebrow="Bastidores"
        title="Painel administrativo"
        description="Tudo o que aparece no site pode ser criado e editado por aqui, sem tocar em código."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((section, index) => (
          <Reveal key={section.href} delay={index * 0.03}>
            <Link href={section.href} className="focus-ring block h-full">
              <Card hover className="h-full">
                <CardBody className="flex h-full flex-col gap-2 p-5">
                  <div className="flex items-start justify-between">
                    <span className="text-2xl" aria-hidden>
                      {section.emoji}
                    </span>
                    {section.table && (
                      <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs text-rose-700">
                        {countMap.get(section.table) ?? 0}
                      </span>
                    )}
                  </div>
                  <h3 className="font-display text-lg text-ink">{section.title}</h3>
                  <p className="text-sm text-ink-soft">{section.description}</p>
                </CardBody>
              </Card>
            </Link>
          </Reveal>
        ))}
      </div>

      <Card className="border-gold/40 bg-gold/5">
        <CardBody className="p-5">
          <p className="label mb-1">Backup</p>
          <p className="text-sm text-ink-soft">
            A exportação completa (JSON com todos os registros + links assinados das mídias) fica em{' '}
            <Link href="/perfil" className="font-medium text-rose-700 hover:underline">
              Nosso perfil
            </Link>
            .
          </p>
        </CardBody>
      </Card>
    </PageTransition>
  )
}
