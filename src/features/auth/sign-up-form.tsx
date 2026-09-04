'use client'

import { useActionState } from 'react'
import { signUp, type ActionState } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'

const initial: ActionState = {}

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUp, initial)

  return (
    <form action={action} className="space-y-4">
      <Field label="Como você quer ser chamado">
        {(id) => <Input id={id} name="displayName" required maxLength={60} placeholder="Seu nome" />}
      </Field>

      <Field label="E-mail">
        {(id) => <Input id={id} name="email" type="email" autoComplete="email" required />}
      </Field>

      <Field label="Senha" hint="Mínimo de 8 caracteres.">
        {(id) => (
          <Input id={id} name="password" type="password" autoComplete="new-password" required minLength={8} />
        )}
      </Field>

      {state.error && (
        <p className="rounded-2xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{state.error}</p>
      )}

      <Button type="submit" size="lg" loading={pending} className="w-full">
        Criar conta
      </Button>
    </form>
  )
}
