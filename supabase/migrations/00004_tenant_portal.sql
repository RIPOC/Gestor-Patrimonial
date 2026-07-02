-- =============================================================================
-- Fase 8 — Portal do Inquilino (acesso restrito aos próprios dados)
-- O inquilino autentica-se com o mesmo email do registo em `tenants`.
-- claim_tenant_profile() liga o utilizador ao registo do inquilino por email.
-- =============================================================================

-- Ligar o utilizador autenticado ao registo de inquilino com o mesmo email.
-- SECURITY DEFINER: contorna a RLS de update (o inquilino não é membro da org).
create or replace function claim_tenant_profile()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  t_id uuid;
  u_email text;
begin
  select email into u_email from auth.users where id = auth.uid();
  if u_email is null then
    return null;
  end if;

  -- Se já está ligado, devolve-o
  select id into t_id from tenants where user_id = auth.uid() limit 1;
  if t_id is not null then
    return t_id;
  end if;

  -- Caso contrário, liga por email (apenas registos ainda sem utilizador)
  update tenants
    set user_id = auth.uid()
    where user_id is null and lower(email) = lower(u_email)
    returning id into t_id;

  return t_id;
end;
$$;

-- Inquilino lê o próprio registo
create policy tenant_self_select on tenants for select
  using (user_id = auth.uid());

-- Inquilino lê as ligações contrato-inquilino que lhe pertencem
create policy tenant_self_lease_links on lease_tenants for select
  using (
    exists (
      select 1 from tenants t
      where t.id = lease_tenants.tenant_id and t.user_id = auth.uid()
    )
  );

-- Inquilino lê o imóvel associado aos seus contratos (para ver a designação)
create policy tenant_lease_property on properties for select
  using (
    exists (
      select 1 from leases l
      join lease_tenants lt on lt.lease_id = l.id
      join tenants t on t.id = lt.tenant_id
      where l.property_id = properties.id and t.user_id = auth.uid()
    )
  );

-- Inquilino lê os pagamentos das suas rendas
create policy tenant_own_payments on rent_payments for select
  using (
    exists (
      select 1 from rents r
      join lease_tenants lt on lt.lease_id = r.lease_id
      join tenants t on t.id = lt.tenant_id
      where r.id = rent_payments.rent_id and t.user_id = auth.uid()
    )
  );

-- Inquilino lê os recibos dos seus contratos
create policy tenant_own_receipts on receipts for select
  using (
    exists (
      select 1 from lease_tenants lt
      join tenants t on t.id = lt.tenant_id
      where lt.lease_id = receipts.lease_id and t.user_id = auth.uid()
    )
  );
