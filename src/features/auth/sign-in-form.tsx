'use client'

import { useActionState } from 'react'
import { signIn, type ActionState } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'

const initial: ActionState = {}

export function SignInForm({ redirectTo }: { redirectTo?: string }) {
  const [state, action, pending] = useActionState(signIn, initial)

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="redirect" value={redirectTo ?? '/'} />

      <Field label="E-mail">
        {(id) => (
          <Input
            id={id}
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="voce@email.com"
          />
        )}
      </Field>

      <Field label="Senha">
        {(id) => (
          <Input
            id={id}
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
          />
        )}
      </Field>

      {state.error && (
        <p className="rounded-2xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{state.error}</p>
      )}

      <Button type="submit" size="lg" loading={pending} className="w-full">
        Entrar
      </Button>
    </form>
  )
}
