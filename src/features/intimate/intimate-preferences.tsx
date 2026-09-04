'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Field, Input, Switch } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'
import {
  changePin,
  disableIntimateArea,
  lockIntimateArea,
  saveIntimatePreferences,
} from '@/app/actions/intimate'
import { INTENSITY } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { IntensityLevel } from '@/types/db'

export function IntimatePreferences({
  maxIntensity,
  blocked,
  categories,
}: {
  maxIntensity: IntensityLevel
  blocked: string[]
  categories: { code: string; name: string; intensity: IntensityLevel }[]
}) {
  const router = useRouter()
  const { notify } = useToast()
  const [pending, startTransition] = useTransition()
  const [level, setLevel] = useState<IntensityLevel>(maxIntensity)
  const [blockedSet, setBlockedSet] = useState(new Set(blocked))

  function save(nextLevel: IntensityLevel, nextBlocked: Set<string>) {
    startTransition(async () => {
      const result = await saveIntimatePreferences({
        max_intensity: nextLevel,
        blocked_categories: [...nextBlocked],
      })
      if (result.ok) notify('Preferências salvas.')
      else notify(result.error ?? 'Não consegui salvar.', 'error')
    })
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardBody className="space-y-4 p-5">
          <div>
            <p className="label mb-1">Nível máximo de intensidade</p>
            <p className="text-sm text-ink-soft">
              Perguntas acima deste nível simplesmente não aparecem para você.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {(Object.keys(INTENSITY) as IntensityLevel[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setLevel(value)
                  save(value, blockedSet)
                }}
                className={cn(
                  'focus-ring rounded-2xl border px-4 py-3 text-left transition-colors',
                  level === value
                    ? 'border-rose-300 bg-rose-50'
                    : 'border-line hover:border-rose-300',
                )}
              >
                <span className="block text-sm font-medium text-ink">{INTENSITY[value].label}</span>
                <span className="block text-xs text-ink-faint">{INTENSITY[value].description}</span>
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-3 p-5">
          <div>
            <p className="label mb-1">Bloquear categorias</p>
            <p className="text-sm text-ink-soft">
              Mesmo que os dois tenham concordado, o que você bloquear aqui não aparece para você.
            </p>
          </div>

          {categories.map((category) => (
            <Switch
              key={category.code}
              label={category.name}
              description={INTENSITY[category.intensity].label}
              checked={!blockedSet.has(category.code)}
              onChange={(enabled) => {
                const next = new Set(blockedSet)
                if (enabled) next.delete(category.code)
                else next.add(category.code)
                setBlockedSet(next)
                save(level, next)
              }}
            />
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-4 p-5">
          <p className="label">Segurança</p>

          <form
            className="grid gap-3 sm:grid-cols-2"
            action={(formData) => {
              startTransition(async () => {
                const result = await changePin({
                  currentPin: String(formData.get('currentPin') ?? ''),
                  newPin: String(formData.get('newPin') ?? ''),
                })
                if (result.ok) notify('PIN alterado.')
                else notify(result.error ?? 'Não consegui alterar.', 'error')
              })
            }}
          >
            <Field label="PIN atual">
              {(id) => <Input id={id} name="currentPin" type="password" inputMode="numeric" maxLength={8} />}
            </Field>
            <Field label="Novo PIN">
              {(id) => <Input id={id} name="newPin" type="password" inputMode="numeric" maxLength={8} />}
            </Field>
            <Button type="submit" variant="outline" size="sm" loading={pending} className="sm:col-span-2 sm:w-fit">
              Alterar PIN
            </Button>
          </form>

          <div className="gold-line" />

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                startTransition(async () => {
                  await lockIntimateArea()
                  router.push('/intimo')
                })
              }
            >
              <Lock className="h-3.5 w-3.5" /> Bloquear agora
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                startTransition(async () => {
                  await disableIntimateArea()
                  notify('Área íntima desativada para você.')
                  router.push('/intimo')
                })
              }
            >
              <LogOut className="h-3.5 w-3.5" /> Desativar a área íntima
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
