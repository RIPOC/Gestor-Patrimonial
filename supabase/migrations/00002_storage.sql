-- =============================================================================
-- Supabase Storage — buckets privados e políticas
-- Acesso a documentos APENAS por signed URLs temporários (nunca públicos)
-- =============================================================================

insert into storage.buckets (id, name, public)
values
  ('documents', 'documents', false),
  ('avatars', 'avatars', false),
  ('exports', 'exports', false),
  ('temp', 'temp', false)
on conflict (id) do nothing;

-- Estrutura de path do bucket documents:
-- organizations/{organization_id}/properties/{property_id}/documents/{document_id}/{filename}
-- O 2.º segmento do path é sempre o organization_id.

create or replace function storage_path_org_id(object_name text)
returns uuid
language sql
immutable
as $$
  select nullif((string_to_array(object_name, '/'))[2], '')::uuid;
$$;

-- documents: membros da organização com permissão de edição podem fazer upload;
-- membros podem ler (o acesso do frontend é sempre feito via signed URL)
create policy documents_bucket_select on storage.objects for select
  using (
    bucket_id = 'documents'
    and is_org_member(storage_path_org_id(name))
  );

create policy documents_bucket_insert on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and can_edit_org(storage_path_org_id(name))
  );

create policy documents_bucket_delete on storage.objects for delete
  using (
    bucket_id = 'documents'
    and can_edit_org(storage_path_org_id(name))
  );

-- avatars: cada utilizador gere a sua pasta users/{user_id}/...
create policy avatars_select on storage.objects for select
  using (bucket_id = 'avatars' and auth.uid() is not null);

create policy avatars_insert on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (string_to_array(name, '/'))[2] = auth.uid()::text
  );

-- exports e temp: por organização, mesmo esquema do documents
create policy exports_select on storage.objects for select
  using (bucket_id = 'exports' and is_org_member(storage_path_org_id(name)));

create policy exports_insert on storage.objects for insert
  with check (bucket_id = 'exports' and can_edit_org(storage_path_org_id(name)));

create policy temp_all_select on storage.objects for select
  using (bucket_id = 'temp' and is_org_member(storage_path_org_id(name)));

create policy temp_all_insert on storage.objects for insert
  with check (bucket_id = 'temp' and can_edit_org(storage_path_org_id(name)));

create policy temp_all_delete on storage.objects for delete
  using (bucket_id = 'temp' and can_edit_org(storage_path_org_id(name)));
