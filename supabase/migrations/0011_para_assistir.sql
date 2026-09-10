-- =============================================================================
-- Para Assistir — filmes e séries do casal
-- =============================================================================
-- Nota de cada pessoa fica em tabela separada, não em duas colunas na mesma
-- linha: assim cada um dá a sua nota sem sobrescrever a do outro, e a regra de
-- "só pode alterar a própria" cabe na RLS.
--
-- Seguro rodar mais de uma vez.
-- =============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'watch_status') then
    create type watch_status as enum ('quero', 'assistindo', 'assistido', 'abandonado');
  end if;
  if not exists (select 1 from pg_type where typname = 'watch_kind') then
    create type watch_kind as enum ('filme', 'serie', 'documentario', 'anime', 'outro');
  end if;
end;
$$;

create table if not exists public.watchlist (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references public.couples (id) on delete cascade,
  title       text not null,
  kind        watch_kind not null default 'filme',
  status      watch_status not null default 'quero',
  platform    text,
  genre       text,
  year        int check (year is null or year between 1888 and 2200),
  note        text,
  -- Progresso de série. Sem sentido para filme, por isso aceita nulo.
  season      int check (season is null or season > 0),
  episode     int check (episode is null or episode > 0),
  watched_on  date,
  sort_order  int not null default 0,
  created_by  uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists watchlist_couple_idx
  on public.watchlist (couple_id, status, created_at desc);

create table if not exists public.watchlist_ratings (
  item_id    uuid not null references public.watchlist (id) on delete cascade,
  couple_id  uuid not null references public.couples (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  rating     int not null check (rating between 1 and 5),
  comment    text,
  created_at timestamptz not null default now(),
  primary key (item_id, user_id)
);

alter table public.watchlist enable row level security;
alter table public.watchlist force row level security;
alter table public.watchlist_ratings enable row level security;
alter table public.watchlist_ratings force row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'watchlist' and policyname = 'watchlist_select'
  ) then
    create policy watchlist_select on public.watchlist for select to authenticated
      using (public.is_couple_member(couple_id));
    create policy watchlist_insert on public.watchlist for insert to authenticated
      with check (public.is_couple_member(couple_id) and created_by = auth.uid());
    create policy watchlist_update on public.watchlist for update to authenticated
      using (public.is_couple_member(couple_id))
      with check (public.is_couple_member(couple_id));
    create policy watchlist_delete on public.watchlist for delete to authenticated
      using (public.is_couple_member(couple_id));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'watchlist_ratings' and policyname = 'watchlist_ratings_select'
  ) then
    -- Os dois veem as duas notas; cada um só escreve a própria.
    create policy watchlist_ratings_select on public.watchlist_ratings for select to authenticated
      using (public.is_couple_member(couple_id));
    create policy watchlist_ratings_insert on public.watchlist_ratings for insert to authenticated
      with check (public.is_couple_member(couple_id) and user_id = auth.uid());
    create policy watchlist_ratings_update on public.watchlist_ratings for update to authenticated
      using (user_id = auth.uid()) with check (user_id = auth.uid());
    create policy watchlist_ratings_delete on public.watchlist_ratings for delete to authenticated
      using (user_id = auth.uid());
  end if;
end;
$$;

drop trigger if exists trg_watchlist_touch on public.watchlist;
create trigger trg_watchlist_touch before update on public.watchlist
  for each row execute function public.touch_updated_at();
