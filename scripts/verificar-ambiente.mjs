/**
 * Confere se o .env.local está correto e se o Supabase responde.
 *
 * Este script NUNCA imprime o valor de uma chave — só diz se ela existe, se tem
 * o formato esperado e se o servidor aceitou. Pode rodar à vontade.
 *
 *   node scripts/verificar-ambiente.mjs
 */

import { readFileSync } from 'node:fs'


const ok = (msg) => console.log(`  ok   ${msg}`)
const erro = (msg) => console.log(`  ERRO ${msg}`)
const aviso = (msg) => console.log(`  ~    ${msg}`)

let falhas = 0

/* ------------------------------------------------------- ler o .env.local -- */

let env
try {
  env = Object.fromEntries(
    readFileSync('.env.local', 'utf8')
      .split(/\r?\n/)
      .filter((linha) => linha.trim() && !linha.trim().startsWith('#'))
      .map((linha) => {
        const corte = linha.indexOf('=')
        return [linha.slice(0, corte).trim(), linha.slice(corte + 1).trim()]
      }),
  )
} catch {
  erro('não encontrei o .env.local na raiz do projeto')
  process.exit(1)
}

console.log('\nConferindo o .env.local\n')

/* ------------------------------------------------------ formato das chaves - */

const url = env.NEXT_PUBLIC_SUPABASE_URL
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const service = env.SUPABASE_SERVICE_ROLE_KEY
const cron = env.CRON_SECRET

const aindaPlaceholder = (valor) =>
  !valor || valor === 'ey...' || valor.includes('xxxxxxxxxxxx') || valor.startsWith('troque-por')

if (aindaPlaceholder(url)) {
  erro('NEXT_PUBLIC_SUPABASE_URL ainda está com o valor de exemplo')
  falhas++
} else if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url)) {
  erro('NEXT_PUBLIC_SUPABASE_URL não parece uma URL de projeto Supabase')
  falhas++
} else {
  ok(`URL do projeto: ${url.replace(/https:\/\/([a-z0-9-]{4}).*/, 'https://$1***.supabase.co')}`)
}

for (const [nome, valor] of [
  ['NEXT_PUBLIC_SUPABASE_ANON_KEY', anon],
  ['SUPABASE_SERVICE_ROLE_KEY', service],
]) {
  if (aindaPlaceholder(valor)) {
    erro(`${nome} ainda está com o valor de exemplo`)
    falhas++
  } else if (valor.length < 40) {
    erro(`${nome} parece curta demais (${valor.length} caracteres)`)
    falhas++
  } else {
    ok(`${nome} preenchida (${valor.length} caracteres)`)
  }
}

if (anon && service && anon === service) {
  erro('a anon key e a service_role estão iguais — confira qual você colou onde')
  falhas++
}

if (!cron || cron.length < 20) {
  aviso('CRON_SECRET curta ou ausente (só faz falta no deploy)')
} else {
  ok(`CRON_SECRET preenchida (${cron.length} caracteres)`)
}

if (falhas > 0) {
  console.log(`\n${falhas} problema(s) antes de testar a conexão.\n`)
  process.exit(1)
}

/* -------------------------------------------------------- testar conexão --- */

console.log('\nTestando a conexão com o Supabase\n')

const base = url.replace(/\/$/, '')

async function checar(rotulo, caminho, chave, opcoes = {}) {
  try {
    const resposta = await fetch(`${base}${caminho}`, {
      headers: { apikey: chave, Authorization: `Bearer ${chave}`, ...opcoes.headers },
    })
    if (resposta.ok) {
      ok(`${rotulo} (HTTP ${resposta.status})`)
      return resposta
    }
    erro(`${rotulo} — HTTP ${resposta.status}`)
    falhas++
    return null
  } catch (causa) {
    erro(`${rotulo} — ${causa.message}`)
    falhas++
    return null
  }
}

await checar('a anon key foi aceita', '/rest/v1/', anon)

const jogos = await checar(
  'a service_role foi aceita',
  '/rest/v1/games?select=slug&limit=1',
  service,
)

/* ------------------------------------------------- migrations aplicadas? --- */

if (jogos) {
  console.log('\nConferindo as migrations\n')

  const contar = async (tabela) => {
    const resposta = await fetch(`${base}/rest/v1/${tabela}?select=*`, {
      headers: {
        apikey: service,
        Authorization: `Bearer ${service}`,
        Prefer: 'count=exact',
        Range: '0-0',
      },
    })
    if (!resposta.ok) return null
    const intervalo = resposta.headers.get('content-range')
    return intervalo ? Number(intervalo.split('/')[1]) : null
  }

  const esperado = [
    ['games', 18, 'catálogo de jogos (0005)'],
    ['achievements', 12, 'conquistas (0005)'],
    ['consent_categories', 7, 'categorias de consentimento (0005)'],
    ['game_questions', 100, 'banco de perguntas (0006)'],
  ]

  for (const [tabela, minimo, descricao] of esperado) {
    const total = await contar(tabela)
    if (total === null) {
      erro(`não consegui ler ${tabela} — a migration correspondente rodou?`)
      falhas++
    } else if (total < minimo) {
      aviso(`${descricao}: ${total} registros (esperava ao menos ${minimo})`)
    } else {
      ok(`${descricao}: ${total} registros`)
    }
  }
}

console.log(
  falhas === 0
    ? `
Tudo certo. Pode rodar: npm run dev
`
    : `
${falhas} problema(s) encontrado(s).
`,
)

process.exit(falhas === 0 ? 0 : 1)
