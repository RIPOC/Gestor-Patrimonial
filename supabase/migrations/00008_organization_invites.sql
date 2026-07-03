-- =============================================================================
-- Convite de utilizadores para uma organização específica já existente.
-- Um org_admin gera um link com token; quem o abre (novo ou já registado)
-- fica membro dessa organização com o papel definido, sem criar organização
-- própria. Não há envio de email — o link é partilhado manualmente.
-- =============================================================================

create table organization_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  role member_role not null default 'manager',
  email text,
  token text not null unique,
  invited_by uuid not null references auth.users (id),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

alter table organization_invites enable row level security;

-- Só um org_admin da organização vê/gere os convites dessa organização.
create policy invites_select on organization_invites for select
  using (has_org_role(organization_id, array['org_admin']::member_role[]));

create policy invites_insert on organization_invites for insert
  with check (has_org_role(organization_id, array['org_admin']::member_role[]));

create policy invites_delete on organization_invites for delete
  using (has_org_role(organization_id, array['org_admin']::member_role[]));

-- SECURITY DEFINER: o utilizador convidado não é membro da organização-alvo,
-- por isso não passaria na policy members_insert (exige org_admin). Esta
-- função valida o token/validade/email e insere a membership em nome dele.
create or replace function accept_organization_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inv organization_invites%rowtype;
  u_email text;
  result_org_id uuid;
begin
  select * into inv from organization_invites where token = p_token;

  if inv.id is null then
    raise exception 'Convite inválido.';
  end if;

  if inv.accepted_at is not null then
    raise exception 'Este convite já foi utilizado.';
  end if;

  if inv.expires_at < now() then
    raise exception 'Este convite expirou.';
  end if;

  if inv.email is not null then
    select email into u_email from auth.users where id = auth.uid();
    if u_email is null or lower(u_email) <> lower(inv.email) then
      raise exception 'Este convite foi emitido para outro email.';
    end if;
  end if;

  insert into organization_members (organization_id, user_id, role, is_active, created_by)
  values (inv.organization_id, auth.uid(), inv.role, true, auth.uid())
  on conflict (organization_id, user_id)
    do update set role = excluded.role, is_active = true, updated_at = now();

  update organization_invites
    set accepted_at = now(), accepted_by = auth.uid()
    where id = inv.id;

  result_org_id := inv.organization_id;
  return result_org_id;
end;
$$;

-- Pré-visualização pública do convite (nome da organização + papel + validade),
-- sem expor a tabela inteira — necessário porque o visitante pode ainda não
-- estar autenticado (nem ser membro da organização) quando abre o link.
create or replace function get_invite_preview(p_token text)
returns table(organization_name text, role member_role, is_valid boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  inv organization_invites%rowtype;
begin
  select * into inv from organization_invites where token = p_token;

  if inv.id is null then
    return query select null::text, null::member_role, false;
    return;
  end if;

  return query
    select o.name, inv.role, (inv.accepted_at is null and inv.expires_at > now())
    from organizations o where o.id = inv.organization_id;
end;
$$;

grant execute on function get_invite_preview(text) to anon, authenticated;
