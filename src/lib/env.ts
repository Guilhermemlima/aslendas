/**
 * Leitura das variáveis de ambiente do Supabase.
 *
 * Sem isso, `createServerClient(undefined!, undefined!)` estoura lá dentro da
 * biblioteca com "supabaseUrl is required" — mensagem que não diz onde
 * configurar. Aqui a falha vira um texto que aponta o caminho.
 */

export interface SupabaseEnv {
  url: string
  anonKey: string
}

export function readSupabaseEnv(): SupabaseEnv | null {
  // Colar valores no painel da Vercel costuma trazer espaço ou quebra de linha
  // junto. Uma URL com "\n" no fim faz toda chamada ao Supabase estourar, com
  // uma mensagem que não ajuda em nada — então normalizamos aqui.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, '')
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!url || !anonKey) return null
  return { url, anonKey }
}

export function missingSupabaseEnv(): string[] {
  return [
    !process.env.NEXT_PUBLIC_SUPABASE_URL && 'NEXT_PUBLIC_SUPABASE_URL',
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ].filter(Boolean) as string[]
}

export function requireSupabaseEnv(): SupabaseEnv {
  const env = readSupabaseEnv()
  if (env) return env

  throw new Error(
    `Configuração incompleta: ${missingSupabaseEnv().join(' e ')} não ${
      missingSupabaseEnv().length > 1 ? 'estão definidas' : 'está definida'
    }. ` +
      'Na Vercel: Settings → Environment Variables (e faça um Redeploy depois de salvar, ' +
      'porque variáveis NEXT_PUBLIC_ só entram no bundle em build novo). ' +
      'Local: preencha o .env.local e rode `npm run verificar`.',
  )
}
