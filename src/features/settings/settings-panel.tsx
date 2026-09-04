'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardBody } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Field, Input, Switch } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'
import { saveSettings } from '@/app/actions/profile'
import { FONTS, NAV_ITEMS, PALETTES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { SettingsInput } from '@/lib/validation'

/** As mudanças de paleta aplicam na hora no <html>, antes mesmo de salvar. */
export function SettingsPanel({ initial }: { initial: SettingsInput }) {
  const router = useRouter()
  const { notify } = useToast()
  const [pending, startTransition] = useTransition()
  const [values, setValues] = useState<SettingsInput>(initial)

  function patch(next: Partial<SettingsInput>) {
    const merged = { ...values, ...next }
    setValues(merged)

    if (next.palette) document.documentElement.dataset.palette = next.palette
    if (next.animations !== undefined) {
      document.documentElement.dataset.animations = next.animations ? 'on' : 'off'
    }
  }

  function save() {
    startTransition(async () => {
      const result = await saveSettings(values)
      if (result.ok) {
        notify('Configurações salvas.')
        router.refresh()
      } else {
        notify(result.error ?? 'Não consegui salvar.', 'error')
      }
    })
  }

  const hideable = NAV_ITEMS.filter((item) => !['home', 'admin', 'configuracoes'].includes(item.key))

  return (
    <div className="space-y-5">
      <Card>
        <CardBody className="space-y-4 p-5">
          <p className="label">Paleta</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {PALETTES.map((palette) => (
              <button
                key={palette.value}
                type="button"
                onClick={() => patch({ palette: palette.value })}
                className={cn(
                  'focus-ring flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors',
                  values.palette === palette.value
                    ? 'border-rose-300 bg-rose-50'
                    : 'border-line hover:border-rose-300',
                )}
              >
                <span className="flex gap-1">
                  {palette.swatch.map((color) => (
                    <span
                      key={color}
                      className="h-6 w-6 rounded-full border border-white/70 shadow-soft"
                      style={{ background: color }}
                    />
                  ))}
                </span>
                <span className="text-sm font-medium text-ink">{palette.label}</span>
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-4 p-5">
          <p className="label">Tipografia</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {FONTS.map((font) => (
              <button
                key={font.value}
                type="button"
                onClick={() => patch({ font: font.value })}
                className={cn(
                  'focus-ring rounded-2xl border px-4 py-4 text-left transition-colors',
                  values.font === font.value ? 'border-rose-300 bg-rose-50' : 'border-line hover:border-rose-300',
                )}
              >
                <span className={cn('block text-2xl text-ink', font.preview)}>Nosso Universo</span>
                <span className="mt-1 block text-xs text-ink-faint">{font.label}</span>
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-2 p-5">
          <p className="label mb-2">Movimento</p>
          <Switch
            label="Animações"
            description="Transições, entradas suaves e microinterações."
            checked={values.animations}
            onChange={(value) => patch({ animations: value })}
          />
          <Switch
            label="Partículas de fundo"
            description="Estrelinhas discretas atrás do conteúdo."
            checked={values.particles}
            onChange={(value) => patch({ particles: value })}
          />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-4 p-5">
          <Field label="Frase da Home" hint="Aparece logo abaixo da foto principal.">
            {(id) => (
              <Input
                id={id}
                value={values.home_quote}
                maxLength={240}
                onChange={(event) => patch({ home_quote: event.target.value })}
                placeholder="O nosso lugar favorito é junto."
              />
            )}
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-2 p-5">
          <p className="label mb-2">Páginas visíveis</p>
          <p className="mb-3 text-sm text-ink-soft">
            Desligue o que vocês não usam. As páginas continuam existindo — só saem do menu.
          </p>
          {hideable.map((item) => (
            <Switch
              key={item.key}
              label={item.label}
              checked={!values.hidden_pages.includes(item.key)}
              onChange={(visible) =>
                patch({
                  hidden_pages: visible
                    ? values.hidden_pages.filter((key) => key !== item.key)
                    : [...values.hidden_pages, item.key],
                })
              }
            />
          ))}
        </CardBody>
      </Card>

      <div className="sticky bottom-24 z-10 lg:bottom-6">
        <Button size="lg" className="w-full shadow-lift" loading={pending} onClick={save}>
          Salvar configurações
        </Button>
      </div>
    </div>
  )
}
