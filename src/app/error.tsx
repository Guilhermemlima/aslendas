'use client'

import { useEffect } from 'react'

/**
 * Tela de erro do app. Quando o problema é de configuração, mostra o que
 * está faltando em vez do "Application error" genérico do Next.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[nosso-universo]', error)
  }, [error])

  const configuracao = error.message.startsWith('Configuração incompleta')

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="card w-full max-w-lg space-y-4 p-7 text-center">
        <span className="text-4xl" aria-hidden>
          {configuracao ? '🔧' : '💔'}
        </span>

        <h1 className="font-display text-2xl text-ink">
          {configuracao ? 'Falta configurar o Supabase' : 'Algo deu errado aqui'}
        </h1>

        {configuracao ? (
          <p className="text-left text-sm leading-relaxed text-ink-soft">{error.message}</p>
        ) : (
          <p className="text-sm leading-relaxed text-ink-soft">
            Foi um erro do nosso lado, não seu. Tente de novo — se insistir, o log do servidor tem
            o detalhe.
          </p>
        )}

        {error.digest && (
          <p className="text-xs text-ink-faint">
            Código para procurar no log: <code className="font-mono">{error.digest}</code>
          </p>
        )}

        <button
          type="button"
          onClick={reset}
          className="focus-ring inline-flex h-11 items-center justify-center rounded-full bg-rose-500 px-6 text-sm font-medium text-white transition-colors hover:bg-rose-700"
        >
          Tentar de novo
        </button>
      </div>
    </div>
  )
}
