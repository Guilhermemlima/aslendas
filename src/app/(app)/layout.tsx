import { AppShell } from '@/components/layout/app-shell'
import { createClient } from '@/lib/supabase/server'
import { requireCouple } from '@/services/session'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { couple, me, partner, settings } = await requireCouple()

  const supabase = await createClient()
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('couple_id', couple.id)
    .is('read_at', null)
    .eq('is_intimate', false)

  return (
    <AppShell
      user={{
        coupleName: couple.name,
        meName: me.display_name,
        partnerName: partner?.display_name ?? null,
        avatarUrl: me.avatar_url,
      }}
      hiddenPages={settings.hidden_pages}
      particlesEnabled={settings.particles}
      unreadCount={count ?? 0}
    >
      {children}
    </AppShell>
  )
}
