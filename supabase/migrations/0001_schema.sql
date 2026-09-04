-- =============================================================================
-- Nosso Universo — Schema principal
-- Postgres / Supabase
-- =============================================================================
-- Convenções:
--   * Todo conteúdo pertence a um casal (couple_id) e é isolado por RLS.
--   * Conteúdo sensível (cápsulas, surpresas) fica em tabelas-filhas para que a
--     RLS possa esconder o conteúdo sem esconder o contador regressivo.
--   * Mídia nunca é pública: apenas metadados no banco + signed URLs no storage.
-- =============================================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------------ enums ---
create type couple_role        as enum ('owner', 'partner');
create type media_kind         as enum ('image', 'video', 'audio');
create type timeline_category  as enum ('inicio','encontro','viagem','aniversario','conquista','familia','engracado','superacao','rotina','outro');
create type letter_type        as enum ('comum','surpresa','programada','privada','abra_quando');
create type date_category      as enum ('aniversario','namoro','viagem','encontro','comemorativa','evento','lembrete');
create type date_recurrence    as enum ('nenhuma','anual','mensal');
create type bucket_status      as enum ('quero','planejado','concluido');
create type game_category      as enum ('classico','conexao','sorte','memoria','intimo');
create type game_mode          as enum ('juntos','individual','secreto');
create type session_status     as enum ('ativa','finalizada','abandonada');
create type intensity_level    as enum ('leve','intermediario','ousado');
create type consent_status     as enum ('pendente','aprovado','recusado','revogado');
create type notification_kind  as enum ('data','carta','capsula','surpresa','jogo','consentimento','conquista','sistema');

-- --------------------------------------------------------------- profiles ---
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Amor',
  avatar_url   text,
  birthdate    date,
  pronouns     text,
  adult_confirmed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------- couples ---
create table public.couples (
  id             uuid primary key default gen_random_uuid(),
  name           text not null default 'Nosso Universo',
  tagline        text,
  started_at     date not null default current_date,
  timezone       text not null default 'America/Sao_Paulo',
  cover_media_id uuid,
  created_by     uuid not null references public.profiles (id) on delete cascade,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table public.couple_members (
  couple_id uuid not null references public.couples (id) on delete cascade,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  role      couple_role not null default 'partner',
  nickname  text,
  joined_at timestamptz not null default now(),
  primary key (couple_id, user_id)
);
create index on public.couple_members (user_id);

create table public.couple_invites (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references public.couples (id) on delete cascade,
  code        text not null unique,
  email       text,
  created_by  uuid not null references public.profiles (id) on delete cascade,
  expires_at  timestamptz not null default now() + interval '30 days',
  accepted_at timestamptz,
  accepted_by uuid references public.profiles (id) on delete set null
);

-- ------------------------------------------------------------------ mídia ---
create table public.albums (
  id             uuid primary key default gen_random_uuid(),
  couple_id      uuid not null references public.couples (id) on delete cascade,
  title          text not null,
  description    text,
  cover_media_id uuid,
  sort_order     int  not null default 0,
  created_by     uuid not null references public.profiles (id) on delete cascade,
  created_at     timestamptz not null default now()
);
create index on public.albums (couple_id, sort_order);

create table public.media (
  id           uuid primary key default gen_random_uuid(),
  couple_id    uuid not null references public.couples (id) on delete cascade,
  album_id     uuid references public.albums (id) on delete set null,
  bucket       text not null default 'couple-media',
  path         text not null,
  kind         media_kind not null,
  mime_type    text not null,
  size_bytes   bigint not null default 0,
  width        int,
  height       int,
  duration_seconds numeric,
  caption      text,
  taken_at     timestamptz,
  tags         text[] not null default '{}',
  is_favorite  boolean not null default false,
  is_intimate  boolean not null default false,
  created_by   uuid not null references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (bucket, path)
);
create index on public.media (couple_id, created_at desc);
create index on public.media (couple_id, is_favorite);
create index on public.media (couple_id, taken_at);
create index on public.media using gin (tags);

alter table public.albums  add constraint albums_cover_fk  foreign key (cover_media_id) references public.media (id) on delete set null;
alter table public.couples add constraint couples_cover_fk foreign key (cover_media_id) references public.media (id) on delete set null;

-- ---------------------------------------------------------------- lugares ---
create table public.locations (
  id             uuid primary key default gen_random_uuid(),
  couple_id      uuid not null references public.couples (id) on delete cascade,
  name           text not null,
  city           text,
  country        text,
  latitude       double precision,
  longitude      double precision,
  visited_on     date,
  story          text,
  cover_media_id uuid references public.media (id) on delete set null,
  created_by     uuid not null references public.profiles (id) on delete cascade,
  created_at     timestamptz not null default now()
);
create index on public.locations (couple_id, visited_on desc);

-- ---------------------------------------------------------------- músicas ---
create table public.songs (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references public.couples (id) on delete cascade,
  title      text not null,
  artist     text,
  url        text,
  provider   text,
  reason     text,
  sort_order int not null default 0,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index on public.songs (couple_id, sort_order);

-- --------------------------------------------------------------- memórias ---
create table public.memories (
  id             uuid primary key default gen_random_uuid(),
  couple_id      uuid not null references public.couples (id) on delete cascade,
  title          text not null,
  description    text,
  happened_on    date,
  location_id    uuid references public.locations (id) on delete set null,
  song_id        uuid references public.songs (id) on delete set null,
  cover_media_id uuid references public.media (id) on delete set null,
  emoji          text,
  tags           text[] not null default '{}',
  is_favorite    boolean not null default false,
  is_intimate    boolean not null default false,
  created_by     uuid not null references public.profiles (id) on delete cascade,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index on public.memories (couple_id, happened_on desc);
create index on public.memories using gin (tags);

create table public.memory_media (
  memory_id  uuid not null references public.memories (id) on delete cascade,
  media_id   uuid not null references public.media (id) on delete cascade,
  sort_order int not null default 0,
  primary key (memory_id, media_id)
);

-- --------------------------------------------------------------- timeline ---
create table public.timeline_events (
  id           uuid primary key default gen_random_uuid(),
  couple_id    uuid not null references public.couples (id) on delete cascade,
  title        text not null,
  description  text,
  event_date   date not null,
  event_time   time,
  category     timeline_category not null default 'outro',
  emoji        text,
  tags         text[] not null default '{}',
  is_highlight boolean not null default false,
  location_id  uuid references public.locations (id) on delete set null,
  song_id      uuid references public.songs (id) on delete set null,
  memory_id    uuid references public.memories (id) on delete set null,
  sort_order   int not null default 0,
  created_by   uuid not null references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on public.timeline_events (couple_id, event_date, sort_order);

create table public.timeline_event_media (
  event_id   uuid not null references public.timeline_events (id) on delete cascade,
  media_id   uuid not null references public.media (id) on delete cascade,
  sort_order int not null default 0,
  primary key (event_id, media_id)
);

-- ----------------------------------------------------------------- cartas ---
create table public.letters (
  id             uuid primary key default gen_random_uuid(),
  couple_id      uuid not null references public.couples (id) on delete cascade,
  author_id      uuid not null references public.profiles (id) on delete cascade,
  recipient_id   uuid references public.profiles (id) on delete cascade,
  title          text not null,
  body           text not null default '',
  letter_type    letter_type not null default 'comum',
  open_condition text,
  deliver_at     timestamptz,
  song_id        uuid references public.songs (id) on delete set null,
  envelope_style text not null default 'rose',
  opened_at      timestamptz,
  opened_by      uuid references public.profiles (id) on delete set null,
  is_archived    boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index on public.letters (couple_id, created_at desc);

create table public.letter_media (
  letter_id  uuid not null references public.letters (id) on delete cascade,
  media_id   uuid not null references public.media (id) on delete cascade,
  sort_order int not null default 0,
  primary key (letter_id, media_id)
);

-- ------------------------------------------------------- cápsulas do tempo --
create table public.time_capsules (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references public.couples (id) on delete cascade,
  title      text not null,
  unlock_at  timestamptz not null,
  created_by uuid not null references public.profiles (id) on delete cascade,
  opened_at  timestamptz,
  opened_by  uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.time_capsules (couple_id, unlock_at);

-- Conteúdo separado: a RLS esconde a mensagem até a data de abertura.
create table public.time_capsule_contents (
  capsule_id uuid primary key references public.time_capsules (id) on delete cascade,
  couple_id  uuid not null references public.couples (id) on delete cascade,
  message    text not null default ''
);

create table public.time_capsule_media (
  capsule_id uuid not null references public.time_capsules (id) on delete cascade,
  media_id   uuid not null references public.media (id) on delete cascade,
  sort_order int not null default 0,
  primary key (capsule_id, media_id)
);

-- ------------------------------------------------------ datas importantes ---
create table public.important_dates (
  id                 uuid primary key default gen_random_uuid(),
  couple_id          uuid not null references public.couples (id) on delete cascade,
  title              text not null,
  description        text,
  date               date not null,
  end_date           date,
  recurrence         date_recurrence not null default 'nenhuma',
  category           date_category not null default 'evento',
  color              text,
  notify_days_before int[] not null default '{7,1}',
  created_by         uuid not null references public.profiles (id) on delete cascade,
  created_at         timestamptz not null default now()
);
create index on public.important_dates (couple_id, date);

-- -------------------------------------------------------- lista de sonhos ---
create table public.bucket_list (
  id                 uuid primary key default gen_random_uuid(),
  couple_id          uuid not null references public.couples (id) on delete cascade,
  title              text not null,
  description        text,
  category           text not null default 'geral',
  status             bucket_status not null default 'quero',
  priority           int not null default 2,
  target_date        date,
  completed_at       timestamptz,
  completed_media_id uuid references public.media (id) on delete set null,
  sort_order         int not null default 0,
  created_by         uuid not null references public.profiles (id) on delete cascade,
  created_at         timestamptz not null default now()
);
create index on public.bucket_list (couple_id, status, sort_order);

-- -------------------------------------------------------------- sobre ela ---
-- Seções configuráveis do perfil de uma das pessoas do casal.
create table public.profile_sections (
  id              uuid primary key default gen_random_uuid(),
  couple_id       uuid not null references public.couples (id) on delete cascade,
  subject_user_id uuid not null references public.profiles (id) on delete cascade,
  title           text not null,
  icon            text,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now()
);
create index on public.profile_sections (couple_id, subject_user_id, sort_order);

create table public.profile_items (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references public.couples (id) on delete cascade,
  section_id  uuid not null references public.profile_sections (id) on delete cascade,
  label       text not null,
  value       text,
  note        text,
  media_id    uuid references public.media (id) on delete set null,
  is_favorite boolean not null default false,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
create index on public.profile_items (section_id, sort_order);

-- ------------------------------------------------------------------ jogos ---
-- Catálogo global (sem couple_id): leitura para qualquer usuário autenticado.
create table public.games (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  tagline     text,
  description text,
  icon        text,
  category    game_category not null default 'classico',
  modes       game_mode[] not null default '{juntos}',
  is_intimate boolean not null default false,
  is_active   boolean not null default true,
  sort_order  int not null default 0,
  config      jsonb not null default '{}'::jsonb
);

-- Perguntas: couple_id NULL = banco global; preenchido = pergunta do casal.
create table public.game_questions (
  id               uuid primary key default gen_random_uuid(),
  game_id          uuid not null references public.games (id) on delete cascade,
  couple_id        uuid references public.couples (id) on delete cascade,
  content          text not null,
  options          jsonb not null default '[]'::jsonb,
  answer_key       text,
  category         text,
  intensity        intensity_level not null default 'leve',
  consent_category text,
  is_intimate      boolean not null default false,
  tags             text[] not null default '{}',
  is_active        boolean not null default true,
  media_id         uuid references public.media (id) on delete set null,
  memory_id        uuid references public.memories (id) on delete set null,
  created_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now()
);
create index on public.game_questions (game_id, is_active);
create index on public.game_questions (couple_id);

create table public.game_sessions (
  id            uuid primary key default gen_random_uuid(),
  couple_id     uuid not null references public.couples (id) on delete cascade,
  game_id       uuid not null references public.games (id) on delete cascade,
  mode          game_mode not null default 'juntos',
  status        session_status not null default 'ativa',
  settings      jsonb not null default '{}'::jsonb,
  scores        jsonb not null default '{}'::jsonb,
  question_ids  uuid[] not null default '{}',
  current_index int not null default 0,
  started_at    timestamptz not null default now(),
  ended_at      timestamptz,
  created_by    uuid not null references public.profiles (id) on delete cascade
);
create index on public.game_sessions (couple_id, started_at desc);

create table public.game_answers (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.game_sessions (id) on delete cascade,
  couple_id     uuid not null references public.couples (id) on delete cascade,
  question_id   uuid not null references public.game_questions (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  about_user_id uuid references public.profiles (id) on delete cascade,
  answer        jsonb not null default '{}'::jsonb,
  is_correct    boolean,
  points        int not null default 0,
  answered_at   timestamptz not null default now()
);
create unique index game_answers_unique_idx
  on public.game_answers (session_id, question_id, user_id, coalesce(about_user_id, user_id));
create index on public.game_answers (session_id);

-- ------------------------------------------------------------- conquistas ---
create table public.achievements (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  name        text not null,
  description text not null,
  icon        text not null default '✨',
  xp          int  not null default 50,
  criteria    jsonb not null default '{}'::jsonb,
  sort_order  int not null default 0
);

create table public.user_achievements (
  id             uuid primary key default gen_random_uuid(),
  couple_id      uuid not null references public.couples (id) on delete cascade,
  user_id        uuid references public.profiles (id) on delete cascade,
  achievement_id uuid not null references public.achievements (id) on delete cascade,
  unlocked_at    timestamptz not null default now()
);
create unique index user_achievements_unique_idx
  on public.user_achievements (couple_id, achievement_id, coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid));

create table public.couple_stats (
  couple_id          uuid primary key references public.couples (id) on delete cascade,
  xp                 int not null default 0,
  points             int not null default 0,
  streak_days        int not null default 0,
  last_played_on     date,
  games_played       int not null default 0,
  questions_answered int not null default 0,
  updated_at         timestamptz not null default now()
);

-- ------------------------------------------------------------ preferências --
create table public.preferences (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references public.couples (id) on delete cascade,
  user_id    uuid references public.profiles (id) on delete cascade,
  key        text not null,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create unique index preferences_unique_idx
  on public.preferences (couple_id, key, coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid));

create table public.couple_settings (
  couple_id        uuid primary key references public.couples (id) on delete cascade,
  palette          text not null default 'rose',
  font             text not null default 'serif',
  animations       boolean not null default true,
  particles        boolean not null default true,
  ambient_song_id  uuid references public.songs (id) on delete set null,
  hidden_pages     text[] not null default '{}',
  home_quote       text,
  intimate_enabled boolean not null default false,
  updated_at       timestamptz not null default now()
);

-- ------------------------------------------------------------- área íntima --
create table public.consent_categories (
  code        text primary key,
  name        text not null,
  description text not null,
  intensity   intensity_level not null default 'leve',
  sort_order  int not null default 0
);

create table public.intimate_settings (
  couple_id          uuid not null references public.couples (id) on delete cascade,
  user_id            uuid not null references public.profiles (id) on delete cascade,
  pin_hash           text,
  adult_confirmed_at timestamptz,
  max_intensity      intensity_level not null default 'leve',
  blocked_categories text[] not null default '{}',
  is_enabled         boolean not null default false,
  updated_at         timestamptz not null default now(),
  primary key (couple_id, user_id)
);

-- Um consentimento por pessoa e categoria. A categoria só fica ativa quando as
-- duas pessoas do casal têm um grant vigente (revoked_at is null).
create table public.consent_grants (
  id            uuid primary key default gen_random_uuid(),
  couple_id     uuid not null references public.couples (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  category_code text not null references public.consent_categories (code) on delete cascade,
  granted_at    timestamptz not null default now(),
  revoked_at    timestamptz,
  unique (couple_id, user_id, category_code)
);

create table public.consent_requests (
  id            uuid primary key default gen_random_uuid(),
  couple_id     uuid not null references public.couples (id) on delete cascade,
  category_code text not null references public.consent_categories (code) on delete cascade,
  requested_by  uuid not null references public.profiles (id) on delete cascade,
  message       text,
  status        consent_status not null default 'pendente',
  responded_by  uuid references public.profiles (id) on delete set null,
  responded_at  timestamptz,
  created_at    timestamptz not null default now()
);
create index on public.consent_requests (couple_id, status);

-- ---------------------------------------------------------------- surpresas -
create table public.surprises (
  id             uuid primary key default gen_random_uuid(),
  couple_id      uuid not null references public.couples (id) on delete cascade,
  title          text not null,
  message        text not null default '',
  reveal_at      timestamptz not null,
  target_user_id uuid references public.profiles (id) on delete cascade,
  animation      text not null default 'confete',
  song_id        uuid references public.songs (id) on delete set null,
  revealed_at    timestamptz,
  is_active      boolean not null default true,
  created_by     uuid not null references public.profiles (id) on delete cascade,
  created_at     timestamptz not null default now()
);
create index on public.surprises (couple_id, reveal_at);

create table public.surprise_media (
  surprise_id uuid not null references public.surprises (id) on delete cascade,
  media_id    uuid not null references public.media (id) on delete cascade,
  sort_order  int not null default 0,
  primary key (surprise_id, media_id)
);

-- ------------------------------------------------------------ notificações --
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references public.couples (id) on delete cascade,
  user_id     uuid references public.profiles (id) on delete cascade,
  kind        notification_kind not null default 'sistema',
  title       text not null,
  body        text,
  link        text,
  is_intimate boolean not null default false,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index on public.notifications (couple_id, user_id, read_at);

-- ---------------------------------------------------------- logs de acesso --
create table public.security_logs (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid references public.couples (id) on delete cascade,
  user_id    uuid references public.profiles (id) on delete set null,
  action     text not null,
  meta       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index on public.security_logs (couple_id, created_at desc);
