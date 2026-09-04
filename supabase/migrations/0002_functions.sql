-- =============================================================================
-- Nosso Universo — Funções, triggers e views
-- =============================================================================

-- ---------------------------------------------------------------- helpers ---
-- SECURITY DEFINER para que as políticas de RLS possam consultar couple_members
-- sem recursão infinita (a função ignora a RLS da própria tabela).
create or replace function public.is_couple_member(target_couple uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.couple_members
    where couple_id = target_couple and user_id = auth.uid()
  );
$$;

create or replace function public.current_couple_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select couple_id from public.couple_members
  where user_id = auth.uid()
  order by joined_at asc
  limit 1;
$$;

create or replace function public.partner_id(target_couple uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select user_id from public.couple_members
  where couple_id = target_couple and user_id <> auth.uid()
  limit 1;
$$;

-- ---------------------------------------------------------------- updated ---
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','couples','memories','timeline_events','letters','couple_settings',
    'intimate_settings','preferences','couple_stats'
  ] loop
    execute format(
      'create trigger trg_%1$s_touch before update on public.%1$s
       for each row execute function public.touch_updated_at()', t);
  end loop;
end;
$$;

-- ------------------------------------------------- criação automática de perfil
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------- criação de um casal ----
-- Cria o casal, adiciona quem chamou como owner e prepara ajustes/estatísticas.
create or replace function public.create_couple(
  couple_name text,
  started date default current_date,
  tz text default 'America/Sao_Paulo'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;

  if public.current_couple_id() is not null then
    raise exception 'este usuário já pertence a um casal';
  end if;

  insert into public.couples (name, started_at, timezone, created_by)
  values (coalesce(nullif(couple_name, ''), 'Nosso Universo'), started, tz, auth.uid())
  returning id into new_id;

  insert into public.couple_members (couple_id, user_id, role)
  values (new_id, auth.uid(), 'owner');

  insert into public.couple_settings (couple_id) values (new_id);
  insert into public.couple_stats (couple_id) values (new_id);

  return new_id;
end;
$$;

-- ------------------------------------------------------ convite do parceiro --
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

  new_code := upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 10));

  insert into public.couple_invites (couple_id, code, email, created_by)
  values (cid, new_code, target_email, auth.uid());

  return new_code;
end;
$$;

create or replace function public.accept_invite(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.couple_invites%rowtype;
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;
  if public.current_couple_id() is not null then
    raise exception 'este usuário já pertence a um casal';
  end if;

  select * into inv from public.couple_invites
  where code = upper(invite_code) and accepted_at is null and expires_at > now();

  if inv.id is null then
    raise exception 'convite inválido ou expirado';
  end if;
  if (select count(*) from public.couple_members where couple_id = inv.couple_id) >= 2 then
    raise exception 'este casal já está completo';
  end if;

  insert into public.couple_members (couple_id, user_id, role)
  values (inv.couple_id, auth.uid(), 'partner');

  update public.couple_invites
  set accepted_at = now(), accepted_by = auth.uid()
  where id = inv.id;

  return inv.couple_id;
end;
$$;

-- ------------------------------------------------------------ área íntima ---
-- Categorias liberadas: exigem grant vigente das DUAS pessoas do casal.
create or replace view public.active_consents as
select
  g.couple_id,
  g.category_code,
  count(*) filter (where g.revoked_at is null) as grants
from public.consent_grants g
group by g.couple_id, g.category_code
having count(*) filter (where g.revoked_at is null) >= 2;

create or replace function public.consent_active(target_couple uuid, code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.active_consents
    where couple_id = target_couple and category_code = code
  );
$$;

-- Aprovar uma solicitação registra o grant de quem aprova e de quem solicitou.
create or replace function public.respond_consent_request(request_id uuid, approve boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  req public.consent_requests%rowtype;
begin
  select * into req from public.consent_requests where id = request_id;
  if req.id is null then
    raise exception 'solicitação não encontrada';
  end if;
  if not public.is_couple_member(req.couple_id) then
    raise exception 'sem permissão';
  end if;
  if req.requested_by = auth.uid() then
    raise exception 'a resposta precisa vir da outra pessoa';
  end if;
  if req.status <> 'pendente' then
    raise exception 'esta solicitação já foi respondida';
  end if;

  update public.consent_requests
  set status = case when approve then 'aprovado'::consent_status else 'recusado'::consent_status end,
      responded_by = auth.uid(),
      responded_at = now()
  where id = request_id;

  if approve then
    insert into public.consent_grants (couple_id, user_id, category_code)
    values (req.couple_id, req.requested_by, req.category_code)
    on conflict (couple_id, user_id, category_code)
      do update set revoked_at = null, granted_at = now();

    insert into public.consent_grants (couple_id, user_id, category_code)
    values (req.couple_id, auth.uid(), req.category_code)
    on conflict (couple_id, user_id, category_code)
      do update set revoked_at = null, granted_at = now();
  end if;
end;
$$;

-- Retirar consentimento tem efeito imediato para a categoria inteira.
create or replace function public.revoke_consent(code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid := public.current_couple_id();
begin
  if cid is null then
    raise exception 'sem casal';
  end if;

  update public.consent_grants
  set revoked_at = now()
  where couple_id = cid and user_id = auth.uid() and category_code = code and revoked_at is null;

  update public.consent_requests
  set status = 'revogado', responded_by = auth.uid(), responded_at = now()
  where couple_id = cid and category_code = code and status = 'pendente';
end;
$$;

-- ------------------------------------------------------------ pontuação -----
create or replace function public.register_game_progress(
  target_couple uuid,
  gained_points int,
  gained_xp int,
  answered int default 0,
  finished_game boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := current_date;
  last_day date;
begin
  if not public.is_couple_member(target_couple) then
    raise exception 'sem permissão';
  end if;

  insert into public.couple_stats (couple_id) values (target_couple)
  on conflict (couple_id) do nothing;

  select last_played_on into last_day from public.couple_stats where couple_id = target_couple;

  update public.couple_stats
  set points = points + greatest(gained_points, 0),
      xp = xp + greatest(gained_xp, 0),
      questions_answered = questions_answered + greatest(answered, 0),
      games_played = games_played + (case when finished_game then 1 else 0 end),
      streak_days = case
        when last_day = today then streak_days
        when last_day = today - 1 then streak_days + 1
        else 1
      end,
      last_played_on = today
  where couple_id = target_couple;
end;
$$;

-- --------------------------------------------- respostas secretas reveladas --
-- Só revela quando as duas pessoas responderam a pergunta na sessão.
create or replace function public.secret_answers_ready(target_session uuid, target_question uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (
    select count(distinct user_id) from public.game_answers
    where session_id = target_session and question_id = target_question
  ) >= (
    select count(*) from public.couple_members cm
    join public.game_sessions gs on gs.couple_id = cm.couple_id
    where gs.id = target_session
  );
$$;

-- ------------------------------------------------------------ retrospectiva --
create or replace function public.year_in_review(target_couple uuid, target_year int)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when not public.is_couple_member(target_couple) then '{}'::jsonb else jsonb_build_object(
    'year', target_year,
    'photos', (select count(*) from public.media m
               where m.couple_id = target_couple and m.kind = 'image'
                 and extract(year from coalesce(m.taken_at, m.created_at)) = target_year),
    'videos', (select count(*) from public.media m
               where m.couple_id = target_couple and m.kind = 'video'
                 and extract(year from coalesce(m.taken_at, m.created_at)) = target_year),
    'memories', (select count(*) from public.memories x
                 where x.couple_id = target_couple
                   and extract(year from coalesce(x.happened_on, x.created_at::date)) = target_year),
    'events', (select count(*) from public.timeline_events x
               where x.couple_id = target_couple and extract(year from x.event_date) = target_year),
    'letters', (select count(*) from public.letters x
                where x.couple_id = target_couple and extract(year from x.created_at) = target_year),
    'games', (select count(*) from public.game_sessions x
              where x.couple_id = target_couple and x.status = 'finalizada'
                and extract(year from x.started_at) = target_year),
    'places', (select count(*) from public.locations x
               where x.couple_id = target_couple
                 and extract(year from coalesce(x.visited_on, x.created_at::date)) = target_year),
    'dreams_done', (select count(*) from public.bucket_list x
                    where x.couple_id = target_couple and x.status = 'concluido'
                      and extract(year from coalesce(x.completed_at, x.created_at)) = target_year),
    'capsules_opened', (select count(*) from public.time_capsules x
                        where x.couple_id = target_couple and x.opened_at is not null
                          and extract(year from x.opened_at) = target_year),
    'top_tags', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (
                   select unnest(tags) as tag, count(*) as total
                   from public.memories
                   where couple_id = target_couple
                     and extract(year from coalesce(happened_on, created_at::date)) = target_year
                   group by 1 order by 2 desc limit 5
                 ) t)
  ) end;
$$;
