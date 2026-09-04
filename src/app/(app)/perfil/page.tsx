import { requireCouple } from '@/services/session'
import { getStats, levelFromXp } from '@/services/games'
import { createClient } from '@/lib/supabase/server'
import { CoupleProfile } from '@/features/profile/couple-profile'
import { SectionHeading } from '@/components/ui/misc'
import { PageTransition } from '@/components/motion/reveal'

export const metadata = { title: 'Nosso Perfil · Nosso Universo' }

export default async function ProfilePage() {
  const { couple, me, partner, isOwner } = await requireCouple()
  const supabase = await createClient()

  const [stats, invites] = await Promise.all([
    getStats(couple.id),
    supabase
      .from('couple_invites')
      .select('code, expires_at, accepted_at')
      .eq('couple_id', couple.id)
      .is('accepted_at', null)
      .order('expires_at', { ascending: false })
      .limit(1),
  ])

  const level = levelFromXp(stats.xp)
  const pendingInvite = (invites.data ?? [])[0] as { code: string; expires_at: string } | undefined

  return (
    <PageTransition className="space-y-8">
      <SectionHeading eyebrow="Quem somos" title="Nosso perfil" />

      <CoupleProfile
        couple={{
          name: couple.name,
          tagline: couple.tagline,
          startedAt: couple.started_at,
        }}
        me={{
          name: me.display_name,
          birthdate: me.birthdate,
          pronouns: me.pronouns,
        }}
        partnerName={partner?.display_name ?? null}
        isOwner={isOwner}
        pendingInviteCode={pendingInvite?.code ?? null}
        stats={{
          level: level.level,
          xp: stats.xp,
          points: stats.points,
          streak: stats.streak_days,
          games: stats.games_played,
        }}
      />
    </PageTransition>
  )
}
