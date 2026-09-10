-- =============================================================================
-- Metas financeiras do casal
-- =============================================================================
-- Valores em CENTAVOS (bigint), nunca em ponto flutuante: 0.1 + 0.2 não dá 0.3
-- em float, e num cofre compartilhado esse erro se acumula a cada aporte.
-- A conversão para reais acontece só na borda, na hora de exibir.
--
-- Seguro rodar mais de uma vez.
-- =============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'goal_status') then
    create type goal_status as enum ('ativa', 'concluida', 'pausada');
  end if;
end;
$$;

create table if not exists public.financial_goals (
  id           uuid primary key default gen_random_uuid(),
  couple_id    uuid not null references public.couples (id) on delete cascade,
  title        text not null,
  description  text,
  emoji        text,
  category     text not null default 'viagem',
  target_cents bigint not null check (target_cents > 0),
  target_date  date,
  status       goal_status not null default 'ativa',
  created_by   uuid not null references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists financial_goals_couple_idx
  on public.financial_goals (couple_id, status, target_date);

-- Aportes. Valor negativo é uma retirada — por isso o check é <> 0, não > 0.
create table if not exists public.financial_contributions (
  id             uuid primary key default gen_random_uuid(),
  goal_id        uuid not null references public.financial_goals (id) on delete cascade,
  couple_id      uuid not null references public.couples (id) on delete cascade,
  amount_cents   bigint not null check (amount_cents <> 0),
  contributed_on date not null default current_date,
  note           text,
  created_by     uuid not null references public.profiles (id) on delete cascade,
  created_at     timestamptz not null default now()
);

create index if not exists financial_contributions_goal_idx
  on public.financial_contributions (goal_id, contributed_on desc);

alter table public.financial_goals enable row level security;
alter table public.financial_goals force row level security;
alter table public.financial_contributions enable row level security;
alter table public.financial_contributions force row level security;

-- Mesma regra do resto do conteúdo: isolado por casal, os dois com acesso igual.
do $$
declare t text;
begin
  foreach t in array array['financial_goals', 'financial_contributions'] loop
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = t and policyname = t || '_select'
    ) then
      execute format('create policy %1$s_select on public.%1$s for select to authenticated
                      using (public.is_couple_member(couple_id))', t);
      execute format('create policy %1$s_insert on public.%1$s for insert to authenticated
                      with check (public.is_couple_member(couple_id) and created_by = auth.uid())', t);
      execute format('create policy %1$s_update on public.%1$s for update to authenticated
                      using (public.is_couple_member(couple_id))
                      with check (public.is_couple_member(couple_id))', t);
      execute format('create policy %1$s_delete on public.%1$s for delete to authenticated
                      using (public.is_couple_member(couple_id))', t);
    end if;
  end loop;
end;
$$;

drop trigger if exists trg_financial_goals_touch on public.financial_goals;
create trigger trg_financial_goals_touch before update on public.financial_goals
  for each row execute function public.touch_updated_at();
