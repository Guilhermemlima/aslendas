'use client'

import { useActionState, useState } from 'react'
import { acceptInvite, createCouple, type ActionState } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { cn } from '@/lib/utils'

const initial: ActionState = {}

export function OnboardingForms() {
  const [tab, setTab] = useState<'criar' | 'entrar'>('criar')

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-1 rounded-full bg-rose-50 p-1">
        {(['criar', 'entrar'] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={cn(
              'focus-ring rounded-full py-2 text-sm font-medium transition-colors',
              tab === value ? 'bg-surface text-rose-700 shadow-soft' : 'text-ink-soft',
            )}
          >
            {value === 'criar' ? 'Criar o casal' : 'Tenho um convite'}
          </button>
        ))}
      </div>

      {tab === 'criar' ? <CreateCoupleForm /> : <AcceptInviteForm />}
    </div>
  )
}

function CreateCoupleForm() {
  const [state, action, pending] = useActionState(createCouple, initial)

  return (
    <form action={action} className="space-y-4">
      <Field label="Nome do casal" hint="Aparece no topo de todas as páginas.">
        {(id) => <Input id={id} name="name" required maxLength={80} placeholder="Ana & João" />}
      </Field>

      <Field label="Frase de vocês" hint="Opcional. Aparece na Home.">
        {(id) => <Input id={id} name="tagline" maxLength={160} placeholder="O nosso lugar favorito é junto." />}
      </Field>

      <Field label="Quando tudo começou">
        {(id) => <Input id={id} name="started_at" type="date" required />}
      </Field>

      {state.error && (
        <p className="rounded-2xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{state.error}</p>
      )}

      <Button type="submit" size="lg" loading={pending} className="w-full">
        Criar nosso universo
      </Button>
    </form>
  )
}

function AcceptInviteForm() {
  const [state, action, pending] = useActionState(acceptInvite, initial)

  return (
    <form action={action} className="space-y-4">
      <Field label="Código do convite" hint="A pessoa que criou o casal gera esse código no perfil.">
        {(id) => (
          <Input
            id={id}
            name="code"
            required
            maxLength={12}
            placeholder="A1B2C3D4E5"
            className="text-center font-mono text-lg tracking-[0.3em] uppercase"
          />
        )}
      </Field>

      {state.error && (
        <p className="rounded-2xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{state.error}</p>
      )}

      <Button type="submit" size="lg" loading={pending} className="w-full">
        Entrar no universo
      </Button>
    </form>
  )
}
