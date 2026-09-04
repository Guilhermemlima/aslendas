import { requireCouple } from '@/services/session'
import { createClient } from '@/lib/supabase/server'
import { Card, CardBody } from '@/components/ui/card'
import { EmptyState, SectionHeading } from '@/components/ui/misc'
import { PageTransition } from '@/components/motion/reveal'
import { relativeToNow } from '@/lib/date'
import type { Notification } from '@/types/db'
import Link from 'next/link'

export const metadata = { title: 'Notificações · Nosso Universo' }

const ICONS: Record<string, string> = {
  data: '📅',
  carta: '💌',
  capsula: '⏳',
  surpresa: '🎁',
  jogo: '🎲',
  consentimento: '🔐',
  conquista: '🏆',
  sistema: '✨',
}

export default async function NotificationsPage() {
  const { couple, userId } = await requireCouple()
  const supabase = await createClient()

  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('couple_id', couple.id)
    .or(`user_id.is.null,user_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(50)

  const notifications = (data ?? []) as Notification[]

  // Marcar como lidas ao abrir a página.
  const unreadIds = notifications.filter((item) => !item.read_at).map((item) => item.id)
  if (unreadIds.length > 0) {
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).in('id', unreadIds)
  }

  return (
    <PageTransition className="space-y-8">
      <SectionHeading eyebrow="O que aconteceu" title="Notificações" />

      {notifications.length === 0 ? (
        <EmptyState emoji="🔔" title="Nada por aqui" description="Datas, cartas e surpresas avisam vocês por aqui." />
      ) : (
        <Card>
          <CardBody className="divide-y divide-line/60 p-0">
            {notifications.map((notification) => {
              const content = (
                <div className="flex items-start gap-3 px-5 py-4">
                  <span className="text-xl" aria-hidden>
                    {ICONS[notification.kind] ?? '✨'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">{notification.title}</p>
                    {notification.body && <p className="text-sm text-ink-soft">{notification.body}</p>}
                    <p className="mt-1 text-xs text-ink-faint">{relativeToNow(notification.created_at)}</p>
                  </div>
                  {!notification.read_at && <span className="mt-1.5 h-2 w-2 rounded-full bg-rose-500" />}
                </div>
              )

              return notification.link ? (
                <Link key={notification.id} href={notification.link} className="focus-ring block hover:bg-rose-50/50">
                  {content}
                </Link>
              ) : (
                <div key={notification.id}>{content}</div>
              )
            })}
          </CardBody>
        </Card>
      )}
    </PageTransition>
  )
}
