-- =============================================================================
-- Registro de intimidade — calendário privado do casal
-- =============================================================================
-- Um registro por dia. `vezes` cobre mais de uma vez no mesmo dia sem precisar
-- de várias linhas, o que mantém o calendário simples de desenhar.
--
-- Esta tabela vive na área íntima: fica fora do calendário comum, da Home, das
-- notificações e do cron de avisos. Nada aqui gera aviso externo.
--
-- Seguro rodar mais de uma vez.
-- =============================================================================

create table if not exists public.intimate_log (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references public.couples (id) on delete cascade,
  happened_on date not null,
  vezes       int  not null default 1 check (vezes between 1 and 20),
  note        text,
  mood        text,
  created_by  uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (couple_id, happened_on)
);

create index if not exists intimate_log_couple_date_idx
  on public.intimate_log (couple_id, happened_on desc);

alter table public.intimate_log enable row level security;
alter table public.intimate_log force row level security;

-- Mesma regra do resto do conteúdo: só quem é do casal, e só o próprio casal.
-- As duas pessoas enxergam e podem apagar qualquer registro — é um diário
-- compartilhado, não o diário de uma pessoa sobre a outra.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'intimate_log' and policyname = 'intimate_log_select'
  ) then
    create policy intimate_log_select on public.intimate_log for select to authenticated
      using (public.is_couple_member(couple_id));
    create policy intimate_log_insert on public.intimate_log for insert to authenticated
      with check (public.is_couple_member(couple_id) and created_by = auth.uid());
    create policy intimate_log_update on public.intimate_log for update to authenticated
      using (public.is_couple_member(couple_id))
      with check (public.is_couple_member(couple_id));
    create policy intimate_log_delete on public.intimate_log for delete to authenticated
      using (public.is_couple_member(couple_id));
  end if;
end;
$$;

drop trigger if exists trg_intimate_log_touch on public.intimate_log;
create trigger trg_intimate_log_touch before update on public.intimate_log
  for each row execute function public.touch_updated_at();
