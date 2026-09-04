import { Particles } from '@/components/motion/particles'
import { PageTransition } from '@/components/motion/reveal'

export function AuthCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center px-4 py-10">
      <Particles count={30} />
      <PageTransition className="w-full max-w-md">
        <div className="glass rounded-3xl p-7 shadow-lift sm:p-9">
          <div className="mb-7 text-center">
            {eyebrow && <p className="label">{eyebrow}</p>}
            <h1 className="mt-2 font-display text-4xl leading-tight text-ink">{title}</h1>
            <div className="gold-line my-4" />
            {description && (
              <p className="text-balance text-sm leading-relaxed text-ink-soft">{description}</p>
            )}
          </div>
          {children}
        </div>
      </PageTransition>
    </div>
  )
}
