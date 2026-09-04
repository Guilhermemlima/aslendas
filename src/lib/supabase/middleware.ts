import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { missingSupabaseEnv, readSupabaseEnv } from '@/lib/env'

/** Rotas que podem ser abertas sem sessão. Todo o resto exige login. */
const PUBLIC_PATHS = ['/entrar', '/criar-conta', '/recuperar-senha', '/auth/callback']

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  // Sem as variáveis do Supabase o middleware não tem como validar sessão.
  // Deixar a requisição passar faz a página renderizar o erro de configuração,
  // em vez de devolver 500 em todas as rotas do site. Não abre brecha: sem
  // essas chaves nenhuma consulta ao banco funciona de qualquer forma.
  const env = readSupabaseEnv()
  if (!env) {
    console.error(
      `[nosso-universo] Variáveis ausentes: ${missingSupabaseEnv().join(', ')}. ` +
        'Configure em Settings → Environment Variables e faça um Redeploy.',
    )
    return response
  }

  const supabase = createServerClient(
    env.url,
    env.anonKey,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )

  // getUser() revalida o token no servidor — não confiar apenas no cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/entrar'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  if (user && isPublic && pathname !== '/auth/callback') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}
