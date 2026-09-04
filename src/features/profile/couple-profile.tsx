'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Download, LogOut, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'
import { createInvite, signOut } from '@/app/actions/auth'
import { updateCouple, updateProfile } from '@/app/actions/profile'
import { relationshipTime } from '@/lib/date'

export function CoupleProfile({
  couple,
  me,
  partnerName,
  isOwner,
  pendingInviteCode,
  stats,
}: {
  couple: { name: string; tagline: string | null; startedAt: string }
  me: { name: string; birthdate: string | null; pronouns: string | null }
  partnerName: string | null
  isOwner: boolean
  pendingInviteCode: string | null
  stats: { level: number; xp: number; points: number; streak: number; games: number }
}) {
  const router = useRouter()
  const { notify } = useToast()
  const [pending, startTransition] = useTransition()
  const [invite, setInvite] = useState(pendingInviteCode)

  const time = relationshipTime(`${couple.startedAt}T00:00:00`)

  function generateInvite() {
    startTransition(async () => {
      const result = await createInvite()
      if (result.code) {
        setInvite(result.code)
        notify('Convite gerado.')
      } else {
        notify(result.error ?? 'Não consegui gerar o convite.', 'error')
      }
    })
  }

  return (
    <div className="space-y-5">
      {/* --------------------------------------------------------- resumo -- */}
      <Card className="overflow-hidden">
        <div className="h-1.5 bg-gradient-gold" />
        <CardBody className="grid gap-4 p-5 sm:grid-cols-4">
          <Stat label="Dias juntos" value={time.totalDays.toLocaleString('pt-BR')} />
          <Stat label="Nível" value={String(stats.level)} />
          <Stat label="Pontos" value={stats.points.toLocaleString('pt-BR')} />
          <Stat label="Sequência" value={`${stats.streak}d`} />
        </CardBody>
      </Card>

      {/* --------------------------------------------------------- casal --- */}
      <Card>
        <CardBody className="p-5">
          <p className="label mb-4">O casal</p>
          <form
            className="space-y-4"
            action={(formData) => {
              startTransition(async () => {
                const result = await updateCouple({
                  name: String(formData.get('name') ?? ''),
                  tagline: String(formData.get('tagline') ?? ''),
                  started_at: String(formData.get('started_at') ?? ''),
                })
                if (result.ok) {
                  notify('Perfil do casal atualizado.')
                  router.refresh()
                } else {
                  notify(result.error ?? 'Não consegui salvar.', 'error')
                }
              })
            }}
          >
            <Field label="Nome do casal">
              {(id) => <Input id={id} name="name" defaultValue={couple.name} maxLength={80} />}
            </Field>
            <Field label="Frase de vocês">
              {(id) => <Input id={id} name="tagline" defaultValue={couple.tagline ?? ''} maxLength={160} />}
            </Field>
            <Field label="Início do namoro">
              {(id) => <Input id={id} name="started_at" type="date" defaultValue={couple.startedAt} />}
            </Field>
            <Button type="submit" size="sm" loading={pending}>
              Salvar
            </Button>
          </form>
        </CardBody>
      </Card>

      {/* ------------------------------------------------------ meu perfil -- */}
      <Card>
        <CardBody className="p-5">
          <p className="label mb-4">Meu perfil</p>
          <form
            className="space-y-4"
            action={(formData) => {
              startTransition(async () => {
                const result = await updateProfile({
                  display_name: String(formData.get('display_name') ?? ''),
                  birthdate: String(formData.get('birthdate') ?? '') || null,
                  pronouns: String(formData.get('pronouns') ?? '') || null,
                })
                if (result.ok) {
                  notify('Perfil atualizado.')
                  router.refresh()
                } else {
                  notify(result.error ?? 'Não consegui salvar.', 'error')
                }
              })
            }}
          >
            <Field label="Como quero ser chamado">
              {(id) => <Input id={id} name="display_name" defaultValue={me.name} maxLength={60} />}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Aniversário">
                {(id) => <Input id={id} name="birthdate" type="date" defaultValue={me.birthdate ?? ''} />}
              </Field>
              <Field label="Pronomes" hint="Opcional.">
                {(id) => <Input id={id} name="pronouns" defaultValue={me.pronouns ?? ''} maxLength={30} />}
              </Field>
            </div>
            <Button type="submit" size="sm" loading={pending}>
              Salvar
            </Button>
          </form>
        </CardBody>
      </Card>

      {/* --------------------------------------------------------- convite -- */}
      {!partnerName && isOwner && (
        <Card className="border-rose-300/50">
          <CardBody className="space-y-3 p-5">
            <p className="label">Convidar a outra pessoa</p>
            <p className="text-sm text-ink-soft">
              Gere um código e envie para ela. Depois de criar a conta, é só usar o código em
              &ldquo;Tenho um convite&rdquo;.
            </p>

            {invite ? (
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-2xl bg-rose-50 px-4 py-3 text-center font-mono text-lg tracking-[0.3em] text-rose-700">
                  {invite}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Copiar código"
                  onClick={() => {
                    void navigator.clipboard.writeText(invite)
                    notify('Código copiado.')
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button loading={pending} onClick={generateInvite}>
                <UserPlus className="h-4 w-4" /> Gerar convite
              </Button>
            )}
          </CardBody>
        </Card>
      )}

      {/* ---------------------------------------------------------- conta --- */}
      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <p className="label mb-1">Backup</p>
            <p className="text-sm text-ink-soft">Baixe tudo o que está guardado aqui em JSON.</p>
          </div>
          <div className="flex gap-2">
            <a
              href="/api/backup"
              className="focus-ring inline-flex h-11 items-center gap-2 rounded-full border border-line bg-surface/70 px-5 text-sm font-medium text-ink hover:border-rose-300"
            >
              <Download className="h-4 w-4" /> Exportar dados
            </a>
            <form action={signOut}>
              <Button type="submit" variant="ghost">
                <LogOut className="h-4 w-4" /> Sair
              </Button>
            </form>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="label mb-1">{label}</p>
      <p className="font-display text-2xl text-ink">{value}</p>
    </div>
  )
}
