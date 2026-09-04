import { requireCouple } from '@/services/session'
import { listProfileSections } from '@/services/content'
import { PartnerProfile } from '@/features/partner/partner-profile'
import { EmptyState, SectionHeading } from '@/components/ui/misc'
import { PageTransition } from '@/components/motion/reveal'

export const metadata = { title: 'Sobre Ela · Nosso Universo' }

export default async function AboutHerPage() {
  const { couple, partner, me } = await requireCouple()

  // Sem parceira cadastrada ainda, a página mostra o perfil de quem está logado.
  const subject = partner ?? me
  const sections = await listProfileSections(couple.id, subject.id)

  return (
    <PageTransition className="space-y-8">
      <SectionHeading
        eyebrow="Tudo o que eu não quero esquecer"
        title={`Sobre ${subject.display_name}`}
        description="Gostos, sonhos, manias e aquelas coisas que só quem presta atenção sabe."
      />

      {!partner && (
        <div className="card border-gold/40 bg-gold/5 p-4 text-sm text-ink-soft">
          Sua pessoa ainda não entrou no universo. Gere um convite no{' '}
          <a href="/perfil" className="font-medium text-rose-700 hover:underline">
            perfil do casal
          </a>{' '}
          — enquanto isso, você pode preencher esta página com o seu próprio perfil.
        </div>
      )}

      {sections.length === 0 && (
        <EmptyState
          emoji="🌸"
          title="Comece o caderninho"
          description="Crie as seções padrão (comidas, filmes, sonhos, presentes...) e vá preenchendo com calma — o botão está logo abaixo."
        />
      )}

      <PartnerProfile
        subjectId={subject.id}
        subjectName={subject.display_name}
        sections={sections.map((section) => ({
          id: section.id,
          title: section.title,
          icon: section.icon,
          items: section.items.map((item) => ({
            id: item.id,
            label: item.label,
            value: item.value,
            note: item.note,
            isFavorite: item.is_favorite,
          })),
        }))}
      />
    </PageTransition>
  )
}
