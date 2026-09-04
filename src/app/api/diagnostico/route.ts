import { NextResponse } from 'next/server'
import { readSupabaseEnv } from '@/lib/env'

export const dynamic = 'force-dynamic'

/**
 * Diagnóstico de configuração, seguro para abrir no navegador.
 *
 * Reporta apenas metadados: se a variável existe, quantos caracteres tem, se o
 * formato bate e se o Supabase respondeu. NUNCA devolve o valor de uma chave —
 * por isso pode ser aberto sem sessão, que é justamente quando é útil (o app
 * inteiro pode estar fora do ar por causa de configuração).
 */
export async function GET() {
  const env = readSupabaseEnv()

  const relatorio: Record<string, unknown> = {
    NEXT_PUBLIC_SUPABASE_URL: descrever(process.env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: descrever(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    SUPABASE_SERVICE_ROLE_KEY: descrever(process.env.SUPABASE_SERVICE_ROLE_KEY),
    CRON_SECRET: descrever(process.env.CRON_SECRET),
    NEXT_PUBLIC_SITE_URL: descrever(process.env.NEXT_PUBLIC_SITE_URL),
  }

  if (!env) {
    return NextResponse.json(
      {
        ok: false,
        causa: 'Variáveis do Supabase ausentes no build.',
        acao: 'Vercel → Settings → Environment Variables e depois Redeploy sem cache.',
        variaveis: relatorio,
      },
      { status: 200 },
    )
  }

  // Confere se a URL é alcançável e se a anon key é aceita.
  let conexao: Record<string, unknown>
  try {
    const resposta = await fetch(`${env.url}/rest/v1/`, {
      headers: { apikey: env.anonKey, Authorization: `Bearer ${env.anonKey}` },
      cache: 'no-store',
    })
    conexao = { alcancou: true, status: resposta.status, anonKeyAceita: resposta.ok }
  } catch (causa) {
    conexao = {
      alcancou: false,
      erro: causa instanceof Error ? causa.message : String(causa),
    }
  }

  return NextResponse.json({
    ok: conexao.anonKeyAceita === true,
    variaveis: relatorio,
    conexao,
  })
}

/** Metadados suficientes para diagnosticar, sem revelar o segredo. */
function descrever(valor: string | undefined) {
  if (valor === undefined) return { definida: false }

  const limpo = valor.trim()
  return {
    definida: true,
    caracteres: valor.length,
    vazia: limpo.length === 0,
    espacoOuQuebraDeLinha: limpo.length !== valor.length,
    // Só o começo, o bastante para conferir se você colou a chave certa no lugar certo.
    comeca: limpo.slice(0, 8),
    pareceUrlSupabase: /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(limpo.replace(/\/+$/, '')),
  }
}
