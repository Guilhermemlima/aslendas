-- =============================================================================
-- Correção: create_invite() falhava com
--   "function gen_random_bytes(integer) does not exist"
-- =============================================================================
-- gen_random_bytes() vem da extensão pgcrypto, que no Supabase é instalada no
-- schema `extensions`. Como a função declara `set search_path = public`, o nome
-- não era encontrado em tempo de execução — o `create extension` da migration
-- 0001 não resolve isso.
--
-- Em vez de qualificar o schema (que amarra a função a um detalhe de onde a
-- extensão foi instalada), passamos a usar gen_random_uuid(): é nativa do
-- PostgreSQL 13+, não depende de extensão e usa fonte aleatória forte.
--
-- Seguro rodar mais de uma vez.
-- =============================================================================

create or replace function public.create_invite(target_email text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid := public.current_couple_id();
  new_code text;
begin
  if cid is null then
    raise exception 'você ainda não tem um casal';
  end if;
  if (select count(*) from public.couple_members where couple_id = cid) >= 2 then
    raise exception 'este casal já está completo';
  end if;

  -- 10 caracteres hexadecimais tirados de um UUID v4.
  new_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  insert into public.couple_invites (couple_id, code, email, created_by)
  values (cid, new_code, target_email, auth.uid());

  return new_code;
end;
$$;
