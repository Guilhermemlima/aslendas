'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { coupleSchema, signInSchema, signUpSchema } from '@/lib/validation'
import { logSecurityEvent } from '@/services/session'

export interface ActionState {
  error?: string
  success?: string
}

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) {
    await logSecurityEvent('login_falhou', { email: parsed.data.email, motivo: error.code })
    return { error: mensagemDeLogin(error.code, error.message) }
  }

  await logSecurityEvent('login')
  const redirectTo = String(formData.get('redirect') || '/')
  redirect(redirectTo.startsWith('/') ? redirectTo : '/')
}

/**
 * Traduz o erro do Supabase.
 *
 * Colapsar tudo em "e-mail ou senha incorretos" esconde o caso mais comum de
 * primeiro acesso: a conta existe, mas ficou pendente de confirmação porque foi
 * criada enquanto "Confirm email" estava ligado. Desligar a opção depois não
 * confirma quem já havia se cadastrado.
 */
function mensagemDeLogin(codigo: string | undefined, mensagem: string): string {
  if (codigo === 'email_not_confirmed' || /not confirmed/i.test(mensagem)) {
    return (
      'Esta conta existe, mas está pendente de confirmação de e-mail. ' +
      'No Supabase, vá em Authentication → Users, abra o usuário e confirme manualmente ' +
      '(ou apague e cadastre de novo, agora com a confirmação desligada).'
    )
  }
  if (codigo === 'invalid_credentials' || /invalid login/i.test(mensagem)) {
    return 'E-mail ou senha incorretos. Se você ainda não tem conta, use "Criar minha conta".'
  }
  if (codigo === 'over_request_rate_limit' || /rate limit/i.test(mensagem)) {
    return 'Muitas tentativas seguidas. Espere um minuto e tente de novo.'
  }
  if (codigo === 'user_banned') return 'Esta conta está bloqueada no Supabase.'

  return `Não consegui entrar: ${mensagem}`
}

export async function signUp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signUpSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    displayName: formData.get('displayName'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName },
      emailRedirectTo: `${(process.env.NEXT_PUBLIC_SITE_URL ?? '').trim()}/auth/callback`,
    },
  })

  if (error) {
    if (error.message.includes('already')) {
      return { error: 'Este e-mail já tem conta. Use "Entrar" em vez de criar.' }
    }
    return { error: `Não consegui criar a conta: ${error.message}` }
  }

  redirect('/comecar')
}

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await logSecurityEvent('logout')
  await supabase.auth.signOut()
  redirect('/entrar')
}

/** Cria o casal e vira owner. Toda a lógica sensível vive na função do Postgres. */
export async function createCouple(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = coupleSchema.safeParse({
    name: formData.get('name'),
    tagline: formData.get('tagline') ?? '',
    started_at: formData.get('started_at'),
    timezone: formData.get('timezone') || 'America/Sao_Paulo',
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc('create_couple', {
    couple_name: parsed.data.name,
    started: parsed.data.started_at,
    tz: parsed.data.timezone,
  })

  if (error) return { error: error.message }

  if (parsed.data.tagline) {
    const { data: membership } = await supabase.from('couple_members').select('couple_id').maybeSingle()
    if (membership) {
      await supabase
        .from('couples')
        .update({ tagline: parsed.data.tagline })
        .eq('id', membership.couple_id)
    }
  }

  await logSecurityEvent('casal_criado')
  revalidatePath('/', 'layout')
  redirect('/')
}

export async function acceptInvite(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const code = String(formData.get('code') ?? '').trim()
  if (code.length < 6) return { error: 'Informe o código do convite.' }

  const supabase = await createClient()
  const { error } = await supabase.rpc('accept_invite', { invite_code: code })
  if (error) return { error: error.message }

  await logSecurityEvent('convite_aceito')
  revalidatePath('/', 'layout')
  redirect('/')
}

export async function createInvite(): Promise<{ code?: string; error?: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('create_invite')
  if (error) return { error: error.message }
  return { code: data as string }
}
