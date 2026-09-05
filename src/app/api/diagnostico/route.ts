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
        // Se a service_role estiver configurada, ela diz de qual projeto é —
        // então dá para informar exatamente qual URL usar.
        dica: pistaDaServiceRole(),
        variaveis: relatorio,
      },
      { status: 200 },
    )
  }

  // Testa as duas chaves e guarda a mensagem devolvida pelo Supabase: quando o
  // token é válido mas recusado, é a mensagem que diz o motivo (chave legada
  // desativada, schema não exposto, etc).
  const conexao = {
    anon: await testar(env.url, env.anonKey),
    service: await testar(env.url, process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
  }

  return NextResponse.json({
    ok: conexao.anon.aceita === true,
    variaveis: relatorio,
    conexao,
    // Quando a chave é recusada, comparar os dois tokens mostra na hora se ela
    // é de outro projeto ou se tem o papel errado.
    chaves: compararChaves(env.url),
  })
}

/**
 * Compara anon key e service_role: de que projeto cada uma é e qual papel
 * carregam. Só lê o corpo do JWT (ref e role), nunca a assinatura, e nunca
 * devolve o valor das chaves.
 */
function compararChaves(urlConfigurada: string): Record<string, unknown> {
  const ler = (valor: string | undefined) => {
    if (!valor) return { presente: false }
    const corpo = valor.trim().split('.')[1]
    if (!corpo) return { presente: true, formato: 'não é um JWT' }
    try {
      const payload = JSON.parse(
        Buffer.from(corpo.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'),
      ) as { ref?: string; role?: string; exp?: number }
      return {
        presente: true,
        projeto: payload.ref,
        papel: payload.role,
        expirada: payload.exp ? payload.exp * 1000 < Date.now() : undefined,
      }
    } catch {
      return { presente: true, formato: 'corpo do JWT ilegível' }
    }
  }

  const anon = ler(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const service = ler(process.env.SUPABASE_SERVICE_ROLE_KEY)
  const refDaUrl = urlConfigurada.match(/https:\/\/([a-z0-9-]+)\.supabase\.co/)?.[1]

  const problemas: string[] = []
  if ('papel' in anon && anon.papel !== 'anon') {
    problemas.push(`A chave em NEXT_PUBLIC_SUPABASE_ANON_KEY tem papel "${anon.papel}", não "anon".`)
  }
  if ('projeto' in anon && anon.projeto !== refDaUrl) {
    problemas.push(
      `A anon key é do projeto "${anon.projeto}", mas a URL aponta para "${refDaUrl}". São projetos diferentes.`,
    )
  }
  if ('expirada' in anon && anon.expirada) {
    problemas.push('A anon key está expirada. Gere uma nova no painel do Supabase.')
  }

  return { anon, service, refDaUrl, problemas }
}

/**
 * Bate no endpoint REST com uma chave e devolve status + mensagem de erro.
 * A mensagem do Supabase é o que distingue "chave errada" de "chave certa
 * porém recusada por configuração do projeto".
 */
async function testar(url: string, chave: string | undefined) {
  if (!chave) return { testada: false }
  try {
    const resposta = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: chave, Authorization: `Bearer ${chave}` },
      cache: 'no-store',
    })
    const corpo = resposta.ok ? '' : (await resposta.text()).slice(0, 300)
    return { testada: true, status: resposta.status, aceita: resposta.ok, resposta: corpo || undefined }
  } catch (causa) {
    return { testada: true, alcancou: false, erro: causa instanceof Error ? causa.message : String(causa) }
  }
}

/**
 * Lê o corpo do JWT da service_role para descobrir a que projeto ela pertence.
 *
 * O `ref` do projeto não é segredo — ele aparece na própria URL pública do
 * Supabase. A assinatura do token nunca é tocada e o valor da chave nunca é
 * devolvido; isso só serve para dizer qual URL preencher.
 */
function pistaDaServiceRole(): Record<string, unknown> | undefined {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!key) return undefined

  try {
    const corpo = key.split('.')[1]
    if (!corpo) return undefined

    const payload = JSON.parse(
      Buffer.from(corpo.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'),
    ) as { ref?: string; role?: string }

    if (!payload.ref) return undefined

    return {
      urlDoProjeto: `https://${payload.ref}.supabase.co`,
      papelDaChave: payload.role,
      // Trocar anon e service_role de lugar é o erro mais comum.
      atencao:
        payload.role !== 'service_role'
          ? `A chave em SUPABASE_SERVICE_ROLE_KEY tem papel "${payload.role}". Confira se você não trocou as duas de lugar.`
          : undefined,
    }
  } catch {
    return undefined
  }
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
