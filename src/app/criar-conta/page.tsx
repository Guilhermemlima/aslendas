import Link from 'next/link'
import { AuthCard } from '@/features/auth/auth-card'
import { SignUpForm } from '@/features/auth/sign-up-form'

export const metadata = { title: 'Criar conta · Nosso Universo' }

export default function SignUpPage() {
  return (
    <AuthCard
      eyebrow="Primeira vez por aqui"
      title="Criar minha conta"
      description="Depois de criar a conta você monta o casal ou entra com o código de convite."
    >
      <SignUpForm />
      <p className="mt-6 text-center text-sm text-ink-soft">
        Já tem conta?{' '}
        <Link href="/entrar" className="font-medium text-rose-700 underline-offset-4 hover:underline">
          Entrar
        </Link>
      </p>
    </AuthCard>
  )
}
