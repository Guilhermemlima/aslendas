'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { Bell, Menu, X } from 'lucide-react'
import { MOBILE_NAV_KEYS, NAV_ITEMS, type NavItem } from '@/lib/constants'
import { NavIcon } from '@/components/layout/icon'
import { Particles } from '@/components/motion/particles'
import { cn, initials } from '@/lib/utils'

export interface ShellUser {
  coupleName: string
  meName: string
  partnerName: string | null
  avatarUrl: string | null
}

const GROUP_LABELS: Record<NavItem['group'], string> = {
  principal: '',
  memoria: 'Nossas memórias',
  planos: 'Nossos planos',
  diversao: 'Diversão',
  conta: 'Configurações',
}

export function AppShell({
  user,
  hiddenPages,
  particlesEnabled,
  unreadCount,
  children,
}: {
  user: ShellUser
  hiddenPages: string[]
  particlesEnabled: boolean
  unreadCount: number
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  // "admin" e "configuracoes" nunca somem — é por elas que se reexibe uma página.
  const items = NAV_ITEMS.filter(
    (item) => !hiddenPages.includes(item.key) || item.key === 'admin' || item.key === 'configuracoes',
  )
  const mobileItems = MOBILE_NAV_KEYS.map((key) => items.find((item) => item.key === key)).filter(
    Boolean,
  ) as NavItem[]

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))

  return (
    <div className="min-h-dvh">
      <Particles enabled={particlesEnabled} />

      {/* ------------------------------------------------------- desktop --- */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line/60 bg-surface/70 backdrop-blur-xl lg:flex">
        <Link href="/" className="focus-ring block px-6 py-6">
          <p className="label">Nosso Universo</p>
          <p className="mt-1 font-display text-xl leading-tight text-ink">{user.coupleName}</p>
        </Link>
        <div className="gold-line" />
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {(['principal', 'memoria', 'planos', 'diversao', 'conta'] as const).map((group) => {
            const groupItems = items.filter((item) => item.group === group)
            if (groupItems.length === 0) return null
            return (
              <div key={group} className="pb-2">
                {GROUP_LABELS[group] && <p className="label px-3 pb-1.5 pt-3">{GROUP_LABELS[group]}</p>}
                {groupItems.map((item) => (
                  <SideLink key={item.key} item={item} active={isActive(item.href)} />
                ))}
              </div>
            )
          })}
        </nav>
        <div className="border-t border-line/60 p-4">
          <Link
            href="/perfil"
            className="focus-ring flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-rose-50"
          >
            <Avatar name={user.meName} url={user.avatarUrl} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-ink">{user.meName}</span>
              <span className="block truncate text-xs text-ink-faint">
                {user.partnerName ? `com ${user.partnerName}` : 'Convide sua pessoa'}
              </span>
            </span>
          </Link>
        </div>
      </aside>

      {/* --------------------------------------------------------- mobile --- */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-line/60 bg-surface/80 px-4 py-3 backdrop-blur-xl lg:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menu"
          className="focus-ring rounded-full p-2 text-ink-soft"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/" className="focus-ring min-w-0 flex-1 text-center">
          <span className="block truncate font-display text-lg text-ink">{user.coupleName}</span>
        </Link>
        <Link href="/notificacoes" className="focus-ring relative rounded-full p-2 text-ink-soft">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500" />
          )}
        </Link>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <motion.nav
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="glass absolute inset-y-0 left-0 w-[17rem] overflow-y-auto p-4"
          >
            <div className="flex items-center justify-between px-2 pb-3">
              <p className="font-display text-lg text-ink">Menu</p>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Fechar menu"
                className="focus-ring rounded-full p-2 text-ink-soft"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {items.map((item) => (
              <SideLink
                key={item.key}
                item={item}
                active={isActive(item.href)}
                onClick={() => setMenuOpen(false)}
              />
            ))}
          </motion.nav>
        </div>
      )}

      {/* -------------------------------------------------------- conteúdo -- */}
      <main className="pb-safe lg:pb-16 lg:pl-64">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</div>
      </main>

      {/* ------------------------------------------------ menu inferior ----- */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line/60 bg-surface/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <div className="flex items-stretch justify-around">
          {mobileItems.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.key}
                href={item.href}
                className="focus-ring relative flex flex-1 flex-col items-center gap-1 py-2.5"
              >
                {active && (
                  <motion.span
                    layoutId="tab-indicator"
                    className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-rose-500"
                  />
                )}
                <NavIcon
                  name={item.icon}
                  className={cn('h-5 w-5 transition-colors', active ? 'text-rose-500' : 'text-ink-faint')}
                />
                <span className={cn('text-[0.65rem]', active ? 'text-rose-700' : 'text-ink-faint')}>
                  {item.label.split(' ')[0]}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

function SideLink({ item, active, onClick }: { item: NavItem; active: boolean; onClick?: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'focus-ring flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-colors',
        active ? 'bg-rose-100 font-medium text-rose-700' : 'text-ink-soft hover:bg-rose-50 hover:text-ink',
      )}
    >
      <NavIcon name={item.icon} className="h-[1.05rem] w-[1.05rem]" />
      {item.label}
    </Link>
  )
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className="h-9 w-9 rounded-full object-cover" />
  }
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-100 text-xs font-medium text-rose-700">
      {initials(name)}
    </span>
  )
}
