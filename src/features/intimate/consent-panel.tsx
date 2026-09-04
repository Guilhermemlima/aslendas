'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Clock, ShieldOff, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Badge } from '@/components/ui/misc'
import { useToast } from '@/components/ui/toast'
import { requestConsent, respondConsent, revokeConsent } from '@/app/actions/intimate'
import { INTENSITY } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { IntensityLevel } from '@/types/db'

export interface ConsentItem {
  code: string
  name: string
  description: string
  intensity: IntensityLevel
  active: boolean
  mineGranted: boolean
  partnerGranted: boolean
  pendingRequest: { id: string; requestedBy: string } | null
}

export function ConsentPanel({
  items,
  meId,
  partnerName,
}: {
  items: ConsentItem[]
  meId: string
  partnerName: string | null
}) {
  const router = useRouter()
  const { notify } = useToast()
  const [pending, startTransition] = useTransition()

  function run(action: () => Promise<{ ok: boolean; error?: string }>, message: string) {
    startTransition(async () => {
      const result = await action()
      if (result.ok) {
        notify(message)
        router.refresh()
      } else {
        notify(result.error ?? 'Não consegui registrar.', 'error')
      }
    })
  }

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const awaitingMe = item.pendingRequest && item.pendingRequest.requestedBy !== meId
        const awaitingPartner = item.pendingRequest && item.pendingRequest.requestedBy === meId

        return (
          <Card key={item.code} className={cn(item.active && 'border-rose-300/60')}>
            <CardBody className="space-y-3 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-display text-lg text-ink">{item.name}</h3>
                  <p className="mt-0.5 text-sm text-ink-soft">{item.description}</p>
                </div>
                <Badge tone={item.active ? 'rose' : 'neutral'}>
                  {item.active ? 'liberada' : 'bloqueada'}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-1',
                    item.mineGranted ? 'bg-rose-100 text-rose-700' : 'bg-line/60 text-ink-faint',
                  )}
                >
                  {item.mineGranted ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} você
                </span>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-1',
                    item.partnerGranted ? 'bg-rose-100 text-rose-700' : 'bg-line/60 text-ink-faint',
                  )}
                >
                  {item.partnerGranted ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}{' '}
                  {partnerName ?? 'sua pessoa'}
                </span>
                <Badge tone="lilac">{INTENSITY[item.intensity].label}</Badge>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {awaitingMe && (
                  <>
                    <Button
                      size="sm"
                      loading={pending}
                      onClick={() => run(() => respondConsent(item.pendingRequest!.id, true), 'Categoria liberada.')}
                    >
                      <Check className="h-3.5 w-3.5" /> Eu também concordo
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      loading={pending}
                      onClick={() => run(() => respondConsent(item.pendingRequest!.id, false), 'Pedido recusado.')}
                    >
                      Agora não
                    </Button>
                  </>
                )}

                {awaitingPartner && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-3 py-1.5 text-xs text-gold">
                    <Clock className="h-3.5 w-3.5" /> esperando {partnerName ?? 'a outra pessoa'} responder
                  </span>
                )}

                {!item.pendingRequest && !item.active && (
                  <Button
                    size="sm"
                    variant="outline"
                    loading={pending}
                    onClick={() =>
                      run(() => requestConsent({ categoryCode: item.code }), 'Pedido enviado.')
                    }
                  >
                    Pedir para liberar
                  </Button>
                )}

                {item.mineGranted && (
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={pending}
                    onClick={() => run(() => revokeConsent(item.code), 'Consentimento retirado.')}
                  >
                    <ShieldOff className="h-3.5 w-3.5" /> Retirar meu consentimento
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>
        )
      })}

      <p className="px-1 text-xs leading-relaxed text-ink-faint">
        Retirar o consentimento bloqueia a categoria na hora, para os dois, e cancela qualquer pedido
        em aberto. Ninguém recebe conteúdo de uma categoria só porque uma pessoa ativou.
      </p>
    </div>
  )
}
