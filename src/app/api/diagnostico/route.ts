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
  // Cada chave é testada no endpoint que ela realmente pode usar:
  //   * /rest/v1/ (a raiz do PostgREST) aceita SOMENTE a service_role;
  //   * /auth/v1/settings é o que a anon key acessa — é o mesmo caminho que o
  //     app usa no login, então valida exatamente o que interessa.
  const conexao = {
    anon: await testar(env.url, env.anonKey, '/auth/v1/settings'),
    service: await testar(env.url, process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(), '/rest/v1/'),
  }

  return NextResponse.json({
    ok: conexao.anon.aceita === true,
    variaveis: relatorio,
    conexao,
    contas: await contarUsuarios(env.url),
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
 * Conta usuários e quantos estão com o e-mail confirmado.
 *
 * Só números: nenhum e-mail, id ou dado pessoal sai daqui — a rota é aberta.
 * Serve para responder "a conta foi criada?" e "ela está pendente?" sem
 * precisar abrir o painel do Supabase.
 */
async function contarUsuarios(url: string): Promise<Record<string, unknown>> {
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!chave) return { disponivel: false }

  try {
    const resposta = await fetch(`${url}/auth/v1/admin/users?per_page=200`, {
      headers: { apikey: chave, Authorization: `Bearer ${chave}` },
      cache: 'no-store',
    })
    if (!resposta.ok) return { disponivel: false, status: resposta.status }

    const dados = (await resposta.json()) as {
      users?: { email_confirmed_at?: string | null; created_at?: string }[]
    }
    const usuarios = dados.users ?? []
    const confirmados = usuarios.filter((u) => Boolean(u.email_confirmed_at)).length

    return {
      disponivel: true,
      total: usuarios.length,
      confirmados,
      pendentes: usuarios.length - confirmados,
      ultimoCadastro: usuarios
        .map((u) => u.created_at)
        .filter(Boolean)
        .sort()
        .at(-1),
    }
  } catch {
    return { disponivel: false }
  }
}

/**
 * Bate no endpoint REST com uma chave e devolve status + mensagem de erro.
 * A mensagem do Supabase é o que distingue "chave errada" de "chave certa
 * porém recusada por configuração do projeto".
 */
async function testar(url: string, chave: string | undefined, caminho: string) {
  if (!chave) return { testada: false }
  try {
    const resposta = await fetch(`${url}${caminho}`, {
      headers: { apikey: chave, Authorization: `Bearer ${chave}` },
      cache: 'no-store',
    })

    if (!resposta.ok) {
      return {
        testada: true,
        endpoint: caminho,
        status: resposta.status,
        aceita: false,
        resposta: (await resposta.text()).slice(0, 300),
      }
    }

    // Em /auth/v1/settings a resposta traz a configuração do Auth: dá para
    // avisar de cara se o cadastro está bloqueado ou exigindo confirmação.
    let auth: Record<string, unknown> | undefined
    if (caminho.startsWith('/auth/v1/settings')) {
      const dados = (await resposta.json()) as {
        disable_signup?: boolean
        mailer_autoconfirm?: boolean
        external?: { email?: boolean }
      }
      auth = {
        cadastroLiberado: dados.disable_signup === false,
        loginPorEmailAtivo: dados.external?.email === true,
        confirmacaoDeEmailExigida: dados.mailer_autoconfirm === false,
      }
    }

    return { testada: true, endpoint: caminho, status: resposta.status, aceita: true, auth }
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
