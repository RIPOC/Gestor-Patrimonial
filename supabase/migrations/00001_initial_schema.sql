-- =============================================================================
-- Gestor Patrimonial Online — Migration inicial
-- Modelo de dados multi-tenant para gestão de arrendamentos em Portugal
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- ENUMS
-- -----------------------------------------------------------------------------

create type member_role as enum ('org_admin', 'owner', 'manager', 'accountant', 'tenant');

create type owner_type as enum ('pessoa_singular', 'empresa', 'heranca_indivisa', 'compropriedade', 'sociedade_patrimonial', 'outro');

create type property_type as enum ('predio', 'apartamento', 'loja', 'garagem', 'escritorio', 'armazem', 'fracao_autonoma', 'terreno', 'outro');

create type property_status as enum ('arrendado', 'devoluto', 'em_obras', 'reservado', 'vendido', 'inativo');

create type tenant_type as enum ('particular', 'empresa', 'eni', 'estudante', 'estrangeiro', 'outro');

create type lease_type as enum ('habitacao', 'comercio', 'servicos', 'garagem', 'armazem', 'outro');

create type lease_status as enum ('rascunho', 'ativo', 'terminado', 'suspenso', 'em_renovacao');

create type rent_status as enum ('prevista', 'por_cobrar', 'paga', 'parcialmente_paga', 'vencida', 'em_atraso', 'em_litigio', 'anulada');

create type payment_method as enum ('transferencia', 'numerario', 'cheque', 'debito_direto', 'multibanco', 'mbway', 'outro');

create type receipt_status as enum ('por_emitir', 'emitido', 'comunicado', 'erro', 'anulado');

create type receipt_mode as enum ('manual', 'assistido', 'integrado');

create type expense_status as enum ('por_pagar', 'pago');

create type document_type as enum (
  'contrato', 'aditamento', 'recibo_at', 'fatura_despesa', 'comprovativo_pagamento',
  'certificado_energetico', 'licenca_utilizacao', 'seguro', 'imi', 'condominio',
  'vistoria', 'fotografia', 'documento_inquilino', 'documento_fiador',
  'comunicacao_inquilino', 'orcamento', 'auto_entrega_chaves', 'inventario', 'outro'
);

create type maintenance_status as enum ('aberta', 'em_analise', 'orcamentada', 'aprovada', 'em_execucao', 'concluida', 'cancelada');

create type maintenance_priority as enum ('baixa', 'media', 'alta', 'urgente');

create type reminder_type as enum (
  'renda_vencida', 'renda_atraso', 'pagamento_parcial', 'recibo_por_emitir',
  'contrato_fim_90', 'contrato_fim_30', 'seguro_a_vencer', 'imi_pendente',
  'condominio_pendente', 'certificado_expirado', 'documento_em_falta',
  'atualizacao_renda', 'despesa_por_pagar', 'ocorrencia_pendente'
);

create type bank_tx_status as enum ('por_reconciliar', 'reconciliado', 'duvida');

-- -----------------------------------------------------------------------------
-- ORGANIZAÇÕES E UTILIZADORES
-- -----------------------------------------------------------------------------

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tax_number text,
  address text,
  postal_code text,
  city text,
  country text default 'Portugal',
  email text,
  phone text,
  logo_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  created_by uuid
);

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  phone text,
  avatar_url text,
  default_organization_id uuid references organizations (id),
  is_platform_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role member_role not null default 'manager',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  created_by uuid,
  unique (organization_id, user_id)
);

-- -----------------------------------------------------------------------------
-- FUNÇÕES AUXILIARES DE SEGURANÇA (usadas pelas políticas RLS)
-- -----------------------------------------------------------------------------

create or replace function is_org_member(org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from organization_members m
    where m.organization_id = org_id
      and m.user_id = auth.uid()
      and m.is_active
  );
$$;

create or replace function has_org_role(org_id uuid, roles member_role[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from organization_members m
    where m.organization_id = org_id
      and m.user_id = auth.uid()
      and m.is_active
      and m.role = any (roles)
  );
$$;

-- Pode editar dados da organização (admin, owner ou gestor)
create or replace function can_edit_org(org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select has_org_role(org_id, array['org_admin','owner','manager']::member_role[]);
$$;

-- -----------------------------------------------------------------------------
-- PROPRIETÁRIOS
-- -----------------------------------------------------------------------------

create table owners (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  tax_number text,
  owner_type owner_type not null default 'pessoa_singular',
  address text,
  postal_code text,
  city text,
  country text default 'Portugal',
  email text,
  phone text,
  iban text,
  tax_regime text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  created_by uuid
);

-- -----------------------------------------------------------------------------
-- IMÓVEIS E FRAÇÕES
-- -----------------------------------------------------------------------------

create table properties (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  internal_code text,
  name text not null,
  address text,
  postal_code text,
  parish text,       -- freguesia
  municipality text, -- concelho
  district text,     -- distrito
  country text default 'Portugal',
  matrix_article text, -- artigo matricial
  fraction text,
  property_type property_type not null default 'apartamento',
  area_m2 numeric(10,2),
  taxable_value numeric(12,2),      -- valor patrimonial tributário
  acquisition_date date,
  acquisition_value numeric(12,2),
  estimated_value numeric(12,2),
  status property_status not null default 'devoluto',
  energy_certificate text,
  energy_certificate_expiry date,
  usage_license text,
  insurance_policy text,
  insurance_expiry date,
  condo_fee_monthly numeric(10,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  created_by uuid
);

create table property_units (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  property_id uuid not null references properties (id) on delete cascade,
  internal_code text,
  name text not null,
  unit_type property_type not null default 'apartamento',
  area_m2 numeric(10,2),
  status property_status not null default 'devoluto',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  created_by uuid
);

-- Um imóvel pode ter vários proprietários com percentagem
create table owner_properties (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  owner_id uuid not null references owners (id) on delete cascade,
  property_id uuid not null references properties (id) on delete cascade,
  ownership_percentage numeric(5,2) not null default 100.00,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  created_by uuid,
  unique (owner_id, property_id)
);

-- -----------------------------------------------------------------------------
-- INQUILINOS
-- -----------------------------------------------------------------------------

create table tenants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  tax_number text,
  tenant_type tenant_type not null default 'particular',
  address text,
  postal_code text,
  city text,
  country text default 'Portugal',
  email text,
  phone text,
  id_document text,
  iban text,
  legal_representative text,
  guarantor_name text,
  guarantor_tax_number text,
  guarantor_contact text,
  user_id uuid references auth.users (id), -- acesso ao portal do inquilino
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  created_by uuid
);

create table tenant_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  tenant_id uuid not null references tenants (id) on delete cascade,
  name text not null,
  relation text,
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  created_by uuid
);

-- -----------------------------------------------------------------------------
-- CONTRATOS
-- -----------------------------------------------------------------------------

create table leases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  property_id uuid not null references properties (id),
  unit_id uuid references property_units (id),
  owner_id uuid references owners (id),
  lease_type lease_type not null default 'habitacao',
  start_date date not null,
  end_date date,
  auto_renewal boolean not null default true,
  renewal_months integer,
  initial_rent numeric(10,2) not null,
  current_rent numeric(10,2) not null,
  due_day integer not null default 1 check (due_day between 1 and 31),
  deposit_amount numeric(10,2),
  has_guarantor boolean not null default false,
  withholding_tax boolean not null default false,
  vat boolean not null default false,
  reported_to_at boolean not null default false, -- comunicado à AT
  at_contract_number text,
  stamp_duty_paid boolean not null default false,
  stamp_duty_amount numeric(10,2),
  status lease_status not null default 'rascunho',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  created_by uuid
);

create table lease_tenants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  lease_id uuid not null references leases (id) on delete cascade,
  tenant_id uuid not null references tenants (id) on delete cascade,
  is_primary boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  created_by uuid,
  unique (lease_id, tenant_id)
);

-- -----------------------------------------------------------------------------
-- RENDAS E PAGAMENTOS
-- -----------------------------------------------------------------------------

create table rents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  lease_id uuid not null references leases (id) on delete cascade,
  property_id uuid not null references properties (id),
  unit_id uuid references property_units (id),
  owner_id uuid references owners (id),
  year integer not null,
  month integer not null check (month between 1 and 12),
  period_start date,
  period_end date,
  due_date date not null,
  base_amount numeric(10,2) not null,
  update_amount numeric(10,2) not null default 0,
  discount_amount numeric(10,2) not null default 0,
  withholding_amount numeric(10,2) not null default 0,
  vat_amount numeric(10,2) not null default 0,
  total_amount numeric(10,2) not null,
  received_amount numeric(10,2) not null default 0,
  outstanding_amount numeric(10,2) generated always as (total_amount - received_amount) stored,
  payment_date date,
  payment_method payment_method,
  status rent_status not null default 'prevista',
  receipt_issued boolean not null default false,
  at_receipt_number text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  created_by uuid,
  unique (lease_id, year, month)
);

create table rent_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  rent_id uuid not null references rents (id) on delete cascade,
  payment_date date not null,
  amount numeric(10,2) not null check (amount > 0),
  method payment_method not null default 'transferencia',
  reference text,
  bank text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  created_by uuid
);

-- -----------------------------------------------------------------------------
-- RECIBOS AT (estrutura preparada: manual / assistido / integrado)
-- -----------------------------------------------------------------------------

create table receipts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  rent_id uuid not null references rents (id),
  lease_id uuid not null references leases (id),
  owner_id uuid references owners (id),
  period_start date,
  period_end date,
  amount numeric(10,2) not null,
  received_date date,
  at_receipt_number text,
  mode receipt_mode not null default 'manual',
  status receipt_status not null default 'por_emitir',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  created_by uuid
);

create table at_operation_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  receipt_id uuid references receipts (id) on delete set null,
  operation text not null,
  request_payload jsonb,
  response_payload jsonb,
  success boolean,
  error_message text,
  created_at timestamptz not null default now(),
  created_by uuid
);

-- -----------------------------------------------------------------------------
-- DESPESAS
-- -----------------------------------------------------------------------------

create table expense_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations (id) on delete cascade, -- null = categoria global
  name text not null,
  is_tax_deductible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  created_by uuid
);

create table suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  tax_number text,
  email text,
  phone text,
  iban text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  created_by uuid
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  property_id uuid references properties (id),
  unit_id uuid references property_units (id),
  lease_id uuid references leases (id),
  supplier_id uuid references suppliers (id),
  supplier_name text,
  supplier_tax_number text,
  category_id uuid references expense_categories (id),
  expense_date date not null,
  description text not null,
  amount_net numeric(10,2),
  vat_amount numeric(10,2) not null default 0,
  amount_total numeric(10,2) not null,
  is_tax_deductible boolean not null default true,
  status expense_status not null default 'por_pagar',
  payment_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  created_by uuid,
  constraint expense_must_have_target check (
    property_id is not null or unit_id is not null or lease_id is not null
  )
);

-- -----------------------------------------------------------------------------
-- ARQUIVO DIGITAL
-- -----------------------------------------------------------------------------

create table maintenance_cases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  property_id uuid not null references properties (id),
  unit_id uuid references property_units (id),
  lease_id uuid references leases (id),
  tenant_id uuid references tenants (id),
  title text not null,
  description text,
  priority maintenance_priority not null default 'media',
  status maintenance_status not null default 'aberta',
  opened_at date not null default current_date,
  expected_date date,
  completed_at date,
  supplier_id uuid references suppliers (id),
  estimated_cost numeric(10,2),
  actual_cost numeric(10,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  created_by uuid
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  owner_id uuid references owners (id) on delete set null,
  property_id uuid references properties (id) on delete set null,
  unit_id uuid references property_units (id) on delete set null,
  lease_id uuid references leases (id) on delete set null,
  tenant_id uuid references tenants (id) on delete set null,
  rent_id uuid references rents (id) on delete set null,
  receipt_id uuid references receipts (id) on delete set null,
  expense_id uuid references expenses (id) on delete set null,
  maintenance_case_id uuid references maintenance_cases (id) on delete set null,
  document_type document_type not null default 'outro',
  original_filename text not null,
  storage_path text not null,
  mime_type text,
  file_size bigint,
  sha256_hash text,
  ocr_text text,                -- preparado para OCR futuro
  document_date date,
  amount numeric(12,2),
  supplier_name text,
  supplier_tax_number text,
  tags text[],
  is_shared_with_tenant boolean not null default false,
  is_shared_with_accountant boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

-- -----------------------------------------------------------------------------
-- ALERTAS, NOTIFICAÇÕES E MENSAGENS
-- -----------------------------------------------------------------------------

create table reminders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  reminder_type reminder_type not null,
  priority maintenance_priority not null default 'media',
  entity_table text,
  entity_id uuid,
  due_date date,
  message text,
  is_resolved boolean not null default false,
  resolved_at timestamptz,
  assigned_to uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  created_by uuid
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  body text,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  lease_id uuid references leases (id) on delete set null,
  tenant_id uuid references tenants (id) on delete set null,
  sender_id uuid references auth.users (id),
  subject text,
  body text not null,
  is_internal boolean not null default false,
  sent_via_email boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  created_by uuid
);

-- -----------------------------------------------------------------------------
-- BANCA (fase 1: importação manual; preparado para Open Banking)
-- -----------------------------------------------------------------------------

create table bank_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  owner_id uuid references owners (id),
  name text not null,
  iban text,
  bank_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  created_by uuid
);

create table bank_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  bank_account_id uuid references bank_accounts (id) on delete cascade,
  transaction_date date not null,
  description text,
  amount numeric(12,2) not null,
  reference text,
  matched_rent_id uuid references rents (id) on delete set null,
  status bank_tx_status not null default 'por_reconciliar',
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  created_by uuid
);

-- -----------------------------------------------------------------------------
-- FISCAL E AUDITORIA
-- -----------------------------------------------------------------------------

create table tax_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  owner_id uuid references owners (id),
  year integer not null,
  report_type text not null default 'anexo_f',
  data jsonb,
  generated_at timestamptz,
  storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  created_by uuid
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations (id) on delete set null,
  user_id uuid,
  action text not null,
  entity_table text,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- TRIGGER updated_at
-- -----------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  for t in
    select table_name from information_schema.columns
    where table_schema = 'public' and column_name = 'updated_at'
  loop
    execute format(
      'create trigger trg_%I_updated_at before update on %I for each row execute function set_updated_at()',
      t, t
    );
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- ÍNDICES
-- -----------------------------------------------------------------------------

create index idx_members_org on organization_members (organization_id);
create index idx_members_user on organization_members (user_id);
create index idx_owners_org on owners (organization_id);
create index idx_properties_org on properties (organization_id);
create index idx_properties_status on properties (organization_id, status);
create index idx_units_org on property_units (organization_id);
create index idx_units_property on property_units (property_id);
create index idx_owner_props_org on owner_properties (organization_id);
create index idx_owner_props_property on owner_properties (property_id);
create index idx_tenants_org on tenants (organization_id);
create index idx_tenants_user on tenants (user_id);
create index idx_leases_org on leases (organization_id);
create index idx_leases_property on leases (property_id);
create index idx_leases_status on leases (organization_id, status);
create index idx_leases_end_date on leases (end_date);
create index idx_lease_tenants_lease on lease_tenants (lease_id);
create index idx_lease_tenants_tenant on lease_tenants (tenant_id);
create index idx_rents_org on rents (organization_id);
create index idx_rents_lease on rents (lease_id);
create index idx_rents_property on rents (property_id);
create index idx_rents_due_date on rents (due_date);
create index idx_rents_status on rents (organization_id, status);
create index idx_rents_period on rents (organization_id, year, month);
create index idx_payments_org on rent_payments (organization_id);
create index idx_payments_rent on rent_payments (rent_id);
create index idx_receipts_org on receipts (organization_id);
create index idx_receipts_rent on receipts (rent_id);
create index idx_receipts_status on receipts (organization_id, status);
create index idx_expenses_org on expenses (organization_id);
create index idx_expenses_property on expenses (property_id);
create index idx_expenses_date on expenses (expense_date);
create index idx_documents_org on documents (organization_id);
create index idx_documents_property on documents (property_id);
create index idx_documents_lease on documents (lease_id);
create index idx_documents_tenant on documents (tenant_id);
create index idx_documents_type on documents (organization_id, document_type);
create index idx_documents_date on documents (document_date);
create index idx_documents_tags on documents using gin (tags);
create index idx_maintenance_org on maintenance_cases (organization_id);
create index idx_maintenance_property on maintenance_cases (property_id);
create index idx_reminders_org on reminders (organization_id);
create index idx_reminders_unresolved on reminders (organization_id, is_resolved);
create index idx_notifications_user on notifications (user_id, is_read);
create index idx_messages_org on messages (organization_id);
create index idx_bank_tx_org on bank_transactions (organization_id);
create index idx_bank_tx_status on bank_transactions (organization_id, status);
create index idx_audit_org on audit_logs (organization_id);
create index idx_audit_entity on audit_logs (entity_table, entity_id);

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------

alter table organizations enable row level security;
alter table profiles enable row level security;
alter table organization_members enable row level security;
alter table owners enable row level security;
alter table properties enable row level security;
alter table property_units enable row level security;
alter table owner_properties enable row level security;
alter table tenants enable row level security;
alter table tenant_contacts enable row level security;
alter table leases enable row level security;
alter table lease_tenants enable row level security;
alter table rents enable row level security;
alter table rent_payments enable row level security;
alter table receipts enable row level security;
alter table at_operation_logs enable row level security;
alter table expense_categories enable row level security;
alter table suppliers enable row level security;
alter table expenses enable row level security;
alter table maintenance_cases enable row level security;
alter table documents enable row level security;
alter table reminders enable row level security;
alter table notifications enable row level security;
alter table messages enable row level security;
alter table bank_accounts enable row level security;
alter table bank_transactions enable row level security;
alter table tax_reports enable row level security;
alter table audit_logs enable row level security;

-- organizations: membros podem ler; utilizador autenticado pode criar (torna-se admin via trigger)
-- O criador também pode ler (created_by) para permitir INSERT ... RETURNING antes de o
-- trigger criar a linha em organization_members (problema de arranque da 1.ª organização).
create policy org_select on organizations for select
  using (is_org_member(id) or created_by = auth.uid());
create policy org_insert on organizations for insert
  with check (auth.uid() is not null);
create policy org_update on organizations for update
  using (has_org_role(id, array['org_admin']::member_role[]));

-- Ao criar organização, o criador torna-se org_admin automaticamente
create or replace function handle_new_organization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into organization_members (organization_id, user_id, role, created_by)
  values (new.id, auth.uid(), 'org_admin', auth.uid());
  return new;
end;
$$;

create trigger trg_org_created after insert on organizations
  for each row execute function handle_new_organization();

-- profiles: cada utilizador gere o seu
create policy profile_select on profiles for select using (id = auth.uid());
create policy profile_insert on profiles for insert with check (id = auth.uid());
create policy profile_update on profiles for update using (id = auth.uid());

-- organization_members
create policy members_select on organization_members for select
  using (user_id = auth.uid() or is_org_member(organization_id));
create policy members_insert on organization_members for insert
  with check (has_org_role(organization_id, array['org_admin']::member_role[]));
create policy members_update on organization_members for update
  using (has_org_role(organization_id, array['org_admin']::member_role[]));
create policy members_delete on organization_members for delete
  using (has_org_role(organization_id, array['org_admin']::member_role[]));

-- Trigger de perfil ao registar utilizador
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger trg_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Políticas genéricas por organization_id para as tabelas de negócio
do $$
declare
  t text;
begin
  foreach t in array array[
    'owners','properties','property_units','owner_properties','tenants',
    'tenant_contacts','leases','lease_tenants','rents','rent_payments',
    'receipts','at_operation_logs','suppliers','expenses','maintenance_cases',
    'documents','reminders','messages','bank_accounts','bank_transactions','tax_reports'
  ]
  loop
    execute format(
      'create policy %I_select on %I for select using (is_org_member(organization_id))', t, t);
    execute format(
      'create policy %I_insert on %I for insert with check (can_edit_org(organization_id))', t, t);
    execute format(
      'create policy %I_update on %I for update using (can_edit_org(organization_id))', t, t);
    execute format(
      'create policy %I_delete on %I for delete using (can_edit_org(organization_id))', t, t);
  end loop;
end;
$$;

-- expense_categories: globais (organization_id null) legíveis por todos os autenticados
create policy expcat_select on expense_categories for select
  using (organization_id is null or is_org_member(organization_id));
create policy expcat_insert on expense_categories for insert
  with check (organization_id is not null and can_edit_org(organization_id));
create policy expcat_update on expense_categories for update
  using (organization_id is not null and can_edit_org(organization_id));

-- notifications: cada utilizador vê e atualiza as suas; qualquer membro da
-- organização pode criar notificações para os colegas (usado pelo motor de
-- automatismos para avisar os gestores de alertas novos)
create policy notif_select on notifications for select using (user_id = auth.uid());
create policy notif_update on notifications for update using (user_id = auth.uid());
create policy notif_insert on notifications for insert with check (is_org_member(organization_id));

-- audit_logs: apenas leitura por admins da organização; escrita via service role
create policy audit_select on audit_logs for select
  using (organization_id is not null and has_org_role(organization_id, array['org_admin']::member_role[]));

-- Portal do inquilino: acesso de leitura aos dados ligados aos seus contratos
create policy tenant_own_leases on leases for select
  using (
    exists (
      select 1 from lease_tenants lt
      join tenants t on t.id = lt.tenant_id
      where lt.lease_id = leases.id and t.user_id = auth.uid()
    )
  );

create policy tenant_own_rents on rents for select
  using (
    exists (
      select 1 from lease_tenants lt
      join tenants t on t.id = lt.tenant_id
      where lt.lease_id = rents.lease_id and t.user_id = auth.uid()
    )
  );

create policy tenant_shared_documents on documents for select
  using (
    is_shared_with_tenant
    and exists (
      select 1 from lease_tenants lt
      join tenants t on t.id = lt.tenant_id
      where lt.lease_id = documents.lease_id and t.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- SEED: categorias de despesa globais
-- -----------------------------------------------------------------------------

insert into expense_categories (name, is_tax_deductible) values
  ('IMI', true),
  ('Condomínio', true),
  ('Seguro', true),
  ('Obras', true),
  ('Manutenção', true),
  ('Canalização', true),
  ('Eletricidade', true),
  ('Água', true),
  ('Gás', true),
  ('Certificado energético', true),
  ('Licença de utilização', true),
  ('Contabilidade', true),
  ('Advogado', true),
  ('Comissões imobiliárias', true),
  ('Juros de financiamento', false),
  ('Taxas bancárias', false),
  ('Limpeza', true),
  ('Reparações', true),
  ('Outras', false);
