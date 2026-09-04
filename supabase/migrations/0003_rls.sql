-- =============================================================================
-- Nosso Universo — Row Level Security
-- =============================================================================
-- Regra de ouro: nada é legível fora do casal. Todas as tabelas de conteúdo têm
-- couple_id e a política é sempre `is_couple_member(couple_id)`.
-- =============================================================================

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','couples','couple_members','couple_invites','albums','media','locations',
    'songs','memories','memory_media','timeline_events','timeline_event_media','letters',
    'letter_media','time_capsules','time_capsule_contents','time_capsule_media',
    'important_dates','bucket_list','profile_sections','profile_items','games',
    'game_questions','game_sessions','game_answers','achievements','user_achievements',
    'couple_stats','preferences','couple_settings','consent_categories','intimate_settings',
    'consent_grants','consent_requests','surprises','surprise_media','notifications',
    'security_logs'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
  end loop;
end;
$$;

-- --------------------------------------------------------------- profiles ---
-- Você vê o seu perfil e o de quem está no mesmo casal.
create policy profiles_select on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1 from public.couple_members mine
      join public.couple_members theirs on theirs.couple_id = mine.couple_id
      where mine.user_id = auth.uid() and theirs.user_id = profiles.id
    )
  );
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- ---------------------------------------------------------------- couples ---
create policy couples_select on public.couples for select to authenticated
  using (public.is_couple_member(id));
create policy couples_update on public.couples for update to authenticated
  using (public.is_couple_member(id)) with check (public.is_couple_member(id));

-- Entrar em um casal acontece por create_couple()/accept_invite() (definer).
create policy couple_members_select on public.couple_members for select to authenticated
  using (public.is_couple_member(couple_id));
create policy couple_members_update on public.couple_members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy couple_members_delete on public.couple_members for delete to authenticated
  using (user_id = auth.uid());

create policy couple_invites_select on public.couple_invites for select to authenticated
  using (public.is_couple_member(couple_id));
create policy couple_invites_delete on public.couple_invites for delete to authenticated
  using (public.is_couple_member(couple_id));

-- ------------------------------------------------- conteúdo comum do casal ---
-- Tabelas com couple_id + created_by: leitura/escrita para membros do casal.
do $$
declare t text;
begin
  foreach t in array array[
    'albums','media','locations','songs','memories','timeline_events','important_dates',
    'bucket_list','profile_sections','profile_items','preferences','notifications'
  ] loop
    execute format('create policy %1$s_select on public.%1$s for select to authenticated
                    using (public.is_couple_member(couple_id))', t);
    execute format('create policy %1$s_insert on public.%1$s for insert to authenticated
                    with check (public.is_couple_member(couple_id))', t);
    execute format('create policy %1$s_update on public.%1$s for update to authenticated
                    using (public.is_couple_member(couple_id))
                    with check (public.is_couple_member(couple_id))', t);
    execute format('create policy %1$s_delete on public.%1$s for delete to authenticated
                    using (public.is_couple_member(couple_id))', t);
  end loop;
end;
$$;

-- Tabelas de ligação (sem couple_id próprio): validam pelo pai.
create policy memory_media_all on public.memory_media for all to authenticated
  using (exists (select 1 from public.memories m where m.id = memory_id and public.is_couple_member(m.couple_id)))
  with check (exists (select 1 from public.memories m where m.id = memory_id and public.is_couple_member(m.couple_id)));

create policy timeline_event_media_all on public.timeline_event_media for all to authenticated
  using (exists (select 1 from public.timeline_events e where e.id = event_id and public.is_couple_member(e.couple_id)))
  with check (exists (select 1 from public.timeline_events e where e.id = event_id and public.is_couple_member(e.couple_id)));

create policy letter_media_all on public.letter_media for all to authenticated
  using (exists (select 1 from public.letters l where l.id = letter_id and public.is_couple_member(l.couple_id)))
  with check (exists (select 1 from public.letters l where l.id = letter_id and public.is_couple_member(l.couple_id)));

create policy time_capsule_media_all on public.time_capsule_media for all to authenticated
  using (exists (
    select 1 from public.time_capsules c
    where c.id = capsule_id and public.is_couple_member(c.couple_id)
      and (c.unlock_at <= now() or c.created_by = auth.uid())))
  with check (exists (
    select 1 from public.time_capsules c
    where c.id = capsule_id and public.is_couple_member(c.couple_id)));

create policy surprise_media_all on public.surprise_media for all to authenticated
  using (exists (
    select 1 from public.surprises s
    where s.id = surprise_id and public.is_couple_member(s.couple_id)
      and (s.reveal_at <= now() or s.created_by = auth.uid())))
  with check (exists (
    select 1 from public.surprises s
    where s.id = surprise_id and public.is_couple_member(s.couple_id) and s.created_by = auth.uid()));

-- ----------------------------------------------------------------- cartas ---
-- Carta programada não aparece para quem recebe antes da data de entrega.
create policy letters_select on public.letters for select to authenticated
  using (
    public.is_couple_member(couple_id)
    and (
      author_id = auth.uid()
      or deliver_at is null
      or deliver_at <= now()
    )
  );
create policy letters_insert on public.letters for insert to authenticated
  with check (public.is_couple_member(couple_id) and author_id = auth.uid());
create policy letters_update on public.letters for update to authenticated
  using (public.is_couple_member(couple_id) and (author_id = auth.uid() or deliver_at is null or deliver_at <= now()))
  with check (public.is_couple_member(couple_id));
create policy letters_delete on public.letters for delete to authenticated
  using (author_id = auth.uid());

-- -------------------------------------------------------- cápsulas do tempo --
-- Os metadados (título + contagem regressiva) são visíveis; o conteúdo não.
create policy time_capsules_select on public.time_capsules for select to authenticated
  using (public.is_couple_member(couple_id));
create policy time_capsules_insert on public.time_capsules for insert to authenticated
  with check (public.is_couple_member(couple_id) and created_by = auth.uid());
create policy time_capsules_update on public.time_capsules for update to authenticated
  using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));
create policy time_capsules_delete on public.time_capsules for delete to authenticated
  using (created_by = auth.uid() and unlock_at > now());

create policy time_capsule_contents_select on public.time_capsule_contents for select to authenticated
  using (exists (
    select 1 from public.time_capsules c
    where c.id = capsule_id and public.is_couple_member(c.couple_id)
      and (c.unlock_at <= now() or c.created_by = auth.uid())));
create policy time_capsule_contents_write on public.time_capsule_contents for insert to authenticated
  with check (exists (
    select 1 from public.time_capsules c
    where c.id = capsule_id and public.is_couple_member(c.couple_id) and c.created_by = auth.uid()));
create policy time_capsule_contents_update on public.time_capsule_contents for update to authenticated
  using (exists (
    select 1 from public.time_capsules c
    where c.id = capsule_id and c.created_by = auth.uid() and c.unlock_at > now()))
  with check (true);

-- -------------------------------------------------------------- surpresas ---
-- Quem preparou vê sempre; a outra pessoa só depois do horário marcado.
create policy surprises_select on public.surprises for select to authenticated
  using (
    public.is_couple_member(couple_id)
    and (created_by = auth.uid() or (is_active and reveal_at <= now()))
  );
create policy surprises_insert on public.surprises for insert to authenticated
  with check (public.is_couple_member(couple_id) and created_by = auth.uid());
create policy surprises_update on public.surprises for update to authenticated
  using (public.is_couple_member(couple_id) and (created_by = auth.uid() or reveal_at <= now()))
  with check (public.is_couple_member(couple_id));
create policy surprises_delete on public.surprises for delete to authenticated
  using (created_by = auth.uid());

-- ------------------------------------------------------ catálogos globais ----
-- Somente leitura para usuários autenticados; escrita apenas pelo service role.
create policy games_select on public.games for select to authenticated using (true);
create policy achievements_select on public.achievements for select to authenticated using (true);
create policy consent_categories_select on public.consent_categories for select to authenticated using (true);

-- ------------------------------------------------------------------ jogos ---
-- Perguntas globais (couple_id null) + perguntas criadas pelo casal.
create policy game_questions_select on public.game_questions for select to authenticated
  using (couple_id is null or public.is_couple_member(couple_id));
create policy game_questions_insert on public.game_questions for insert to authenticated
  with check (couple_id is not null and public.is_couple_member(couple_id));
create policy game_questions_update on public.game_questions for update to authenticated
  using (couple_id is not null and public.is_couple_member(couple_id))
  with check (couple_id is not null and public.is_couple_member(couple_id));
create policy game_questions_delete on public.game_questions for delete to authenticated
  using (couple_id is not null and public.is_couple_member(couple_id));

create policy game_sessions_all on public.game_sessions for all to authenticated
  using (public.is_couple_member(couple_id))
  with check (public.is_couple_member(couple_id));

-- Resposta secreta: a resposta da outra pessoa só aparece quando as duas responderam.
create policy game_answers_select on public.game_answers for select to authenticated
  using (
    public.is_couple_member(couple_id)
    and (
      user_id = auth.uid()
      or exists (select 1 from public.game_sessions s where s.id = session_id and s.mode <> 'secreto')
      or public.secret_answers_ready(session_id, question_id)
    )
  );
create policy game_answers_insert on public.game_answers for insert to authenticated
  with check (public.is_couple_member(couple_id) and user_id = auth.uid());
create policy game_answers_update on public.game_answers for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy game_answers_delete on public.game_answers for delete to authenticated
  using (user_id = auth.uid());

create policy user_achievements_select on public.user_achievements for select to authenticated
  using (public.is_couple_member(couple_id));
create policy user_achievements_insert on public.user_achievements for insert to authenticated
  with check (public.is_couple_member(couple_id));

create policy couple_stats_select on public.couple_stats for select to authenticated
  using (public.is_couple_member(couple_id));
create policy couple_stats_update on public.couple_stats for update to authenticated
  using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));

-- ----------------------------------------------------------- configurações --
create policy couple_settings_select on public.couple_settings for select to authenticated
  using (public.is_couple_member(couple_id));
create policy couple_settings_insert on public.couple_settings for insert to authenticated
  with check (public.is_couple_member(couple_id));
create policy couple_settings_update on public.couple_settings for update to authenticated
  using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));

-- ------------------------------------------------------------- área íntima --
-- Cada pessoa só enxerga e altera as próprias configurações íntimas.
create policy intimate_settings_select on public.intimate_settings for select to authenticated
  using (user_id = auth.uid());
create policy intimate_settings_insert on public.intimate_settings for insert to authenticated
  with check (user_id = auth.uid() and public.is_couple_member(couple_id));
create policy intimate_settings_update on public.intimate_settings for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- O estado do consentimento é compartilhado (as duas pessoas precisam saber),
-- mas só dá para conceder ou revogar em nome de si mesmo.
create policy consent_grants_select on public.consent_grants for select to authenticated
  using (public.is_couple_member(couple_id));
create policy consent_grants_insert on public.consent_grants for insert to authenticated
  with check (user_id = auth.uid() and public.is_couple_member(couple_id));
create policy consent_grants_update on public.consent_grants for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy consent_requests_select on public.consent_requests for select to authenticated
  using (public.is_couple_member(couple_id));
create policy consent_requests_insert on public.consent_requests for insert to authenticated
  with check (public.is_couple_member(couple_id) and requested_by = auth.uid());
create policy consent_requests_delete on public.consent_requests for delete to authenticated
  using (requested_by = auth.uid() and status = 'pendente');

-- --------------------------------------------------------------- auditoria --
create policy security_logs_select on public.security_logs for select to authenticated
  using (couple_id is not null and public.is_couple_member(couple_id));
create policy security_logs_insert on public.security_logs for insert to authenticated
  with check (couple_id is null or public.is_couple_member(couple_id));
