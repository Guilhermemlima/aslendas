import Link from 'next/link'
import { AuthCard } from '@/features/auth/auth-card'
import { SignInForm } from '@/features/auth/sign-in-form'

export const metadata = { title: 'Entrar · Nosso Universo' }

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>
}) {
  const { redirect } = await searchParams

  return (
    <AuthCard
      eyebrow="Bem-vindo de volta"
      title="Nosso Universo"
      description="Um lugar só nosso. Entre para continuar de onde paramos."
    >
      <SignInForm redirectTo={redirect} />
      <p className="mt-6 text-center text-sm text-ink-soft">
        Ainda não tem acesso?{' '}
        <Link href="/criar-conta" className="font-medium text-rose-700 underline-offset-4 hover:underline">
          Criar minha conta
        </Link>
      </p>
    </AuthCard>
  )
}
