import Link from 'next/link'
import { requireCouple } from '@/services/session'
import { getActiveConsents, getIntimateSettings, isIntimateUnlocked } from '@/services/intimate'
import { listGames } from '@/services/games'
import { IntimateGate } from '@/features/intimate/intimate-gate'
import { Card, CardBody } from '@/components/ui/card'
import { Badge, SectionHeading } from '@/components/ui/misc'
import { NavIcon } from '@/components/layout/icon'
import { PageTransition, Reveal } from '@/components/motion/reveal'
import { INTENSITY } from '@/lib/constants'

export default async function IntimatePage() {
  const { couple, me, partner } = await requireCouple()

  const [settings, unlocked, consents, games] = await Promise.all([
    getIntimateSettings(couple.id, me.id),
    isIntimateUnlocked(me.id),
    getActiveConsents(couple.id),
    listGames({ includeIntimate: true }),
  ])

  const adultConfirmed = Boolean(settings?.adult_confirmed_at) && settings?.is_enabled

  // Portão: maioridade + PIN. Nada do conteúdo é carregado antes disso.
  if (!adultConfirmed || !unlocked) {
    return (
      <PageTransition>
        <IntimateGate needsSetup={!adultConfirmed} hasPin={Boolean(settings?.pin_hash)} />
      </PageTransition>
    )
  }

  const intimateGames = games.filter((game) => game.is_intimate)
  const allowed = new Set(consents)
  const blocked = new Set(settings?.blocked_categories ?? [])
  const maxRank = INTENSITY[settings?.max_intensity ?? 'leve'].rank

  return (
    <PageTransition className="space-y-8">
      <SectionHeading
        eyebrow="Só entre vocês dois"
        title="Área íntima"
        description="Conteúdo separado do resto do site, com PIN próprio e consentimento dos dois."
      />

      <Card className="border-lilac-300/50 bg-lilac-100/30">
        <CardBody className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="label mb-1">Suas configurações</p>
            <p className="text-sm text-ink-soft">
              Nível máximo: <strong className="text-ink">{INTENSITY[settings?.max_intensity ?? 'leve'].label}</strong>
              {' · '}
              {allowed.size} {allowed.size === 1 ? 'categoria liberada' : 'categorias liberadas'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/intimo/consentimento"
              className="focus-ring rounded-full bg-surface px-4 py-2 text-sm font-medium text-ink shadow-soft"
            >
              Consentimento
            </Link>
            <Link
              href="/intimo/preferencias"
              className="focus-ring rounded-full bg-surface px-4 py-2 text-sm font-medium text-ink shadow-soft"
            >
              Preferências
            </Link>
          </div>
        </CardBody>
      </Card>

      {allowed.size === 0 && (
        <Card className="border-gold/40 bg-gold/5">
          <CardBody className="space-y-2 p-5">
            <p className="font-display text-lg text-ink">Nada liberado ainda</p>
            <p className="text-sm text-ink-soft">
              Cada categoria só abre depois que as duas pessoas concordarem. Peça a liberação em
              Consentimento — {partner?.display_name ?? 'sua pessoa'} precisa confirmar do lado dela.
            </p>
            <Link
              href="/intimo/consentimento"
              className="inline-block pt-1 text-sm font-medium text-rose-700 hover:underline"
            >
              Abrir consentimento
            </Link>
          </CardBody>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {intimateGames.map((game, index) => {
          const category = String((game.config as { consent_category?: string }).consent_category ?? '')
          const available = allowed.size > 0 && !blocked.has(category)

          return (
            <Reveal key={game.id} delay={index * 0.04}>
              {available ? (
                <Link href={`/intimo/${game.slug}`} className="focus-ring block h-full">
                  <Card hover className="h-full">
                    <CardBody className="space-y-2 p-5">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lilac-100 text-lilac-500">
                        <NavIcon name={game.icon ?? 'heart'} className="h-5 w-5" />
                      </span>
                      <h3 className="mt-1 font-display text-xl text-ink">{game.name}</h3>
                      <p className="text-sm text-ink-soft">{game.tagline}</p>
                      <div className="pt-2">
                        <Badge tone="lilac">até {INTENSITY[settings?.max_intensity ?? 'leve'].label}</Badge>
                      </div>
                    </CardBody>
                  </Card>
                </Link>
              ) : (
                <Card className="h-full opacity-60">
                  <CardBody className="space-y-2 p-5">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-line/60 text-ink-faint">
                      <NavIcon name="lock" className="h-5 w-5" />
                    </span>
                    <h3 className="mt-1 font-display text-xl text-ink">{game.name}</h3>
                    <p className="text-sm text-ink-soft">
                      Precisa do consentimento das duas pessoas para abrir.
                    </p>
                  </CardBody>
                </Card>
              )}
            </Reveal>
          )
        })}
      </div>

      <p className="text-center text-xs text-ink-faint">
        Nível atual permite conteúdo de intensidade {maxRank === 1 ? 'leve' : maxRank === 2 ? 'até intermediária' : 'até ousada'}.
        Você pode mudar isso a qualquer momento, e retirar o consentimento tem efeito imediato.
      </p>
    </PageTransition>
  )
}
