-- =============================================================================
-- Integração oficial AT (SOAP/WSDL) — Comunicação de contratos de arrendamento
-- e emissão de recibos de renda. Ver server/at-connector/ para o módulo isolado.
--
-- Nunca guardar aqui: senha do Portal das Finanças, senha cifrada, Digest,
-- Nonce, header completo de autenticação, PFX, password do PFX.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Campos AT adicionais em tabelas existentes (necessários para o mapeamento
-- interno -> DTOs da AT). Todos nullable: só são exigidos no momento de
-- submeter à AT, validados pela camada aplicacional antes do envio.
-- -----------------------------------------------------------------------------

alter table properties
  add column if not exists tax_district_code varchar(2),
  add column if not exists tax_municipality_code varchar(2),
  add column if not exists tax_parish_code varchar(2),
  add column if not exists matrix_type varchar(1) check (matrix_type in ('U', 'R')),
  add column if not exists matrix_section varchar(7),
  add column if not exists at_lot_number text,
  add column if not exists at_floor text,
  add column if not exists at_rented_part text,
  add column if not exists at_common_part boolean not null default false,
  add column if not exists at_missing_registration boolean not null default false;

alter table owners
  add column if not exists at_marriage_regime varchar(6),
  add column if not exists at_spouse_tax_number varchar(9),
  add column if not exists at_benefit_code varchar(6);

alter table owner_properties
  add column if not exists at_quota_parte text;

alter table lease_tenants
  add column if not exists at_retention_code varchar(6),
  add column if not exists at_country_code varchar(2) not null default 'PT',
  add column if not exists at_foreign_name text;

alter table leases
  add column if not exists at_reference text,
  add column if not exists at_contract_version bigint,
  add column if not exists at_submission_status text not null default 'draft',
  add column if not exists at_last_submission_id uuid,
  add column if not exists at_submitted_at timestamptz;

alter table receipts
  add column if not exists at_status text,
  add column if not exists at_pdf_document_id uuid references documents (id) on delete set null,
  add column if not exists at_submission_id uuid,
  add column if not exists at_integrated_at timestamptz,
  add column if not exists at_response_code integer,
  add column if not exists at_response_message text;

-- -----------------------------------------------------------------------------
-- at_integrations — configuração/estado da integração AT por organização
-- -----------------------------------------------------------------------------

create table at_integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  taxpayer_nif varchar(9) not null,
  environment text not null default 'test' check (environment in ('test', 'production')),
  status text not null default 'not_configured'
    check (status in ('not_configured', 'configured', 'active', 'suspended', 'error')),
  software_name text not null default 'Gestor Patrimonial Online',
  certificate_subject text,
  certificate_serial text,
  certificate_expires_at date,
  public_key_loaded_at timestamptz,
  last_test_at timestamptz,
  last_test_success boolean,
  last_success_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  created_by uuid,
  unique (organization_id, environment)
);

-- -----------------------------------------------------------------------------
-- at_contract_submissions — histórico de comunicações de contrato à AT
-- -----------------------------------------------------------------------------

create table at_contract_submissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  lease_id uuid not null references leases (id) on delete cascade,
  owner_id uuid references owners (id),
  property_id uuid references properties (id),
  taxpayer_nif varchar(9) not null,
  environment text not null,
  status text not null default 'draft'
    check (status in ('draft', 'ready_to_submit', 'submitted', 'accepted', 'rejected', 'error', 'unknown')),
  reference text,
  request_payload_hash text,
  request_xml_redacted text,
  response_xml_redacted text,
  response_code integer,
  response_message text,
  at_contract_number bigint,
  at_contract_version bigint,
  errors_json jsonb,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid
);

-- -----------------------------------------------------------------------------
-- at_receipt_submissions — histórico de emissões de recibo à AT
-- -----------------------------------------------------------------------------

create table at_receipt_submissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  rent_id uuid not null references rents (id) on delete cascade,
  receipt_id uuid references receipts (id) on delete set null,
  lease_id uuid not null references leases (id),
  taxpayer_nif varchar(9) not null,
  environment text not null,
  status text not null default 'pending'
    check (status in (
      'pending', 'ready_to_issue', 'submitted', 'issued', 'pdf_obtained',
      'rejected', 'error', 'unknown', 'cancelled_manually'
    )),
  request_payload_hash text,
  request_xml_redacted text,
  response_xml_redacted text,
  response_code integer,
  response_message text,
  at_receipt_number bigint,
  pdf_document_id uuid references documents (id) on delete set null,
  errors_json jsonb,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid
);

-- Bloqueio real contra duplicados: no máximo uma submissão em curso (pending/
-- ready_to_issue/submitted) ou concluída com sucesso (issued/pdf_obtained) por renda.
create unique index at_receipt_submissions_one_active_per_rent
  on at_receipt_submissions (rent_id)
  where status in ('pending', 'ready_to_issue', 'submitted', 'issued', 'pdf_obtained');

-- -----------------------------------------------------------------------------
-- Triggers updated_at
-- -----------------------------------------------------------------------------

create trigger trg_at_integrations_updated_at
  before update on at_integrations
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- Índices
-- -----------------------------------------------------------------------------

create index idx_at_integrations_org on at_integrations (organization_id);
create index idx_at_contract_submissions_org on at_contract_submissions (organization_id);
create index idx_at_contract_submissions_lease on at_contract_submissions (lease_id);
create index idx_at_receipt_submissions_org on at_receipt_submissions (organization_id);
create index idx_at_receipt_submissions_rent on at_receipt_submissions (rent_id);

-- -----------------------------------------------------------------------------
-- RLS — mesmo padrão das restantes tabelas de negócio
-- -----------------------------------------------------------------------------

alter table at_integrations enable row level security;
alter table at_contract_submissions enable row level security;
alter table at_receipt_submissions enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['at_integrations', 'at_contract_submissions', 'at_receipt_submissions']
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
