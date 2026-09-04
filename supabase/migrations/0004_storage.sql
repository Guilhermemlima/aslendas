-- =============================================================================
-- Nosso Universo — Storage privado
-- =============================================================================
-- Três buckets, todos privados. O caminho SEMPRE começa pelo id do casal:
--   couple-media/<couple_id>/<ano>/<uuid>.<ext>
-- A política lê a primeira pasta do caminho e confere se quem pede é do casal.
-- Nenhuma URL pública é gerada: o app usa signed URLs de curta duração.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('couple-media',  'couple-media',  false, 209715200,
   array['image/jpeg','image/png','image/webp','image/gif','image/heic','video/mp4','video/quicktime','video/webm','audio/mpeg','audio/mp4','audio/webm','audio/ogg']),
  ('letters-media', 'letters-media', false, 104857600,
   array['image/jpeg','image/png','image/webp','video/mp4','audio/mpeg','audio/webm','audio/ogg']),
  ('private-media', 'private-media', false, 209715200,
   array['image/jpeg','image/png','image/webp','video/mp4','video/webm','audio/mpeg','audio/webm'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Cast tolerante: caminhos malformados simplesmente não batem com nenhum casal.
create or replace function public.safe_uuid(value text)
returns uuid
language plpgsql
immutable
as $$
begin
  return value::uuid;
exception when others then
  return null;
end;
$$;

create or replace function public.storage_owner_is_member(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_couple_member(
    public.safe_uuid((storage.foldername(object_name))[1])
  );
$$;

do $$
declare b text;
begin
  foreach b in array array['couple-media','letters-media','private-media'] loop
    execute format(
      'create policy %1$s on storage.objects for select to authenticated
       using (bucket_id = %2$L and public.storage_owner_is_member(name))',
      'stg_' || replace(b, '-', '_') || '_select', b);
    execute format(
      'create policy %1$s on storage.objects for insert to authenticated
       with check (bucket_id = %2$L and public.storage_owner_is_member(name) and owner = auth.uid())',
      'stg_' || replace(b, '-', '_') || '_insert', b);
    execute format(
      'create policy %1$s on storage.objects for update to authenticated
       using (bucket_id = %2$L and public.storage_owner_is_member(name))
       with check (bucket_id = %2$L and public.storage_owner_is_member(name))',
      'stg_' || replace(b, '-', '_') || '_update', b);
    execute format(
      'create policy %1$s on storage.objects for delete to authenticated
       using (bucket_id = %2$L and public.storage_owner_is_member(name))',
      'stg_' || replace(b, '-', '_') || '_delete', b);
  end loop;
end;
$$;
