'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'
import { confirmAdultAndSetPin, unlockWithPin } from '@/app/actions/intimate'

/**
 * Portão da área íntima. Três passos, nesta ordem:
 *   1. confirmar maioridade;
 *   2. criar um PIN separado da senha da conta;
 *   3. digitar o PIN a cada sessão (válido por 30 minutos).
 */
export function IntimateGate({ needsSetup, hasPin }: { needsSetup: boolean; hasPin: boolean }) {
  const router = useRouter()
  const { notify } = useToast()
  const [pending, startTransition] = useTransition()
  const [adultChecked, setAdultChecked] = useState(false)
  const [consentChecked, setConsentChecked] = useState(false)
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')

  const setupReady = adultChecked && consentChecked && pin.length >= 4 && pin === confirmPin

  function handleSetup() {
    if (!setupReady) return
    startTransition(async () => {
      const result = await confirmAdultAndSetPin({ pin })
      if (result.ok) {
        notify('Área íntima ativada.')
        router.refresh()
      } else {
        notify(result.error ?? 'Não consegui ativar.', 'error')
      }
    })
  }

  function handleUnlock() {
    startTransition(async () => {
      const result = await unlockWithPin({ pin })
      if (result.ok) {
        router.refresh()
      } else {
        notify(result.error ?? 'PIN incorreto.', 'error')
        setPin('')
      }
    })
  }

  return (
    <div className="mx-auto max-w-md space-y-6 py-8">
      <div className="text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-lilac-100 text-lilac-500">
          <Lock className="h-6 w-6" />
        </span>
        <h1 className="font-display text-3xl text-ink">Área privada</h1>
        <p className="mt-2 text-sm text-ink-soft">
          {needsSetup
            ? 'Esta parte é separada do resto do site e exige confirmação de maioridade.'
            : 'Digite seu PIN para continuar.'}
        </p>
      </div>

      <Card>
        <CardBody className="space-y-5 p-6">
          {needsSetup ? (
            <>
              <label className="flex items-start gap-3 rounded-2xl bg-rose-50/70 p-4 text-sm">
                <input
                  type="checkbox"
                  checked={adultChecked}
                  onChange={(event) => setAdultChecked(event.target.checked)}
                  className="mt-0.5"
                />
                <span className="text-ink-soft">
                  Confirmo que tenho <strong className="text-ink">18 anos ou mais</strong>.
                </span>
              </label>

              <label className="flex items-start gap-3 rounded-2xl bg-lilac-100/50 p-4 text-sm">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(event) => setConsentChecked(event.target.checked)}
                  className="mt-0.5"
                />
                <span className="text-ink-soft">
                  Entendo que cada categoria de conteúdo só é liberada quando{' '}
                  <strong className="text-ink">as duas pessoas concordam</strong>, e que posso
                  retirar o consentimento quando quiser.
                </span>
              </label>

              <Field label="Criar PIN" hint="De 4 a 8 dígitos. Diferente da senha da conta.">
                {(id) => (
                  <Input
                    id={id}
                    inputMode="numeric"
                    maxLength={8}
                    value={pin}
                    onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))}
                    className="text-center text-xl tracking-[0.5em]"
                  />
                )}
              </Field>

              <Field label="Repetir PIN" error={confirmPin && pin !== confirmPin ? 'Os PINs não coincidem' : undefined}>
                {(id) => (
                  <Input
                    id={id}
                    inputMode="numeric"
                    maxLength={8}
                    value={confirmPin}
                    onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, ''))}
                    className="text-center text-xl tracking-[0.5em]"
                  />
                )}
              </Field>

              <Button size="lg" className="w-full" disabled={!setupReady} loading={pending} onClick={handleSetup}>
                <ShieldCheck className="h-4 w-4" /> Ativar área íntima
              </Button>
            </>
          ) : (
            <>
              <Field label={hasPin ? 'Seu PIN' : 'PIN'}>
                {(id) => (
                  <Input
                    id={id}
                    type="password"
                    inputMode="numeric"
                    maxLength={8}
                    autoFocus
                    value={pin}
                    onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))}
                    onKeyDown={(event) => event.key === 'Enter' && handleUnlock()}
                    className="text-center text-2xl tracking-[0.5em]"
                  />
                )}
              </Field>

              <Button size="lg" className="w-full" loading={pending} disabled={pin.length < 4} onClick={handleUnlock}>
                Desbloquear
              </Button>
            </>
          )}
        </CardBody>
      </Card>

      <p className="text-center text-xs text-ink-faint">
        Nada desta área aparece em notificações, prévias de link ou em outras páginas do site.
      </p>
    </div>
  )
}
