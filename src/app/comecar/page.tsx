import { redirect } from 'next/navigation'
import { AuthCard } from '@/features/auth/auth-card'
import { OnboardingForms } from '@/features/auth/onboarding-forms'
import { getCoupleContext, requireUserId } from '@/services/session'

export const metadata = { title: 'Começar · Nosso Universo' }

export default async function OnboardingPage() {
  await requireUserId()
  const context = await getCoupleContext()
  if (context) redirect('/')

  return (
    <AuthCard
      eyebrow="Quase lá"
      title="Vamos criar o universo de vocês"
      description="Crie o espaço do casal ou entre no que a sua pessoa já criou."
    >
      <OnboardingForms />
    </AuthCard>
  )
}
