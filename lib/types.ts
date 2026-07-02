// Tipos de domínio — espelham o schema Supabase (supabase/migrations)

export type MemberRole = "org_admin" | "owner" | "manager" | "accountant" | "tenant";

export type OwnerType =
  | "pessoa_singular"
  | "empresa"
  | "heranca_indivisa"
  | "compropriedade"
  | "sociedade_patrimonial"
  | "outro";

export type PropertyType =
  | "predio"
  | "apartamento"
  | "loja"
  | "garagem"
  | "escritorio"
  | "armazem"
  | "fracao_autonoma"
  | "terreno"
  | "outro";

export type PropertyStatus =
  | "arrendado"
  | "devoluto"
  | "em_obras"
  | "reservado"
  | "vendido"
  | "inativo";

export type TenantType =
  | "particular"
  | "empresa"
  | "eni"
  | "estudante"
  | "estrangeiro"
  | "outro";

export type LeaseType =
  | "habitacao"
  | "comercio"
  | "servicos"
  | "garagem"
  | "armazem"
  | "outro";

export type LeaseStatus =
  | "rascunho"
  | "ativo"
  | "terminado"
  | "suspenso"
  | "em_renovacao";

export type RentStatus =
  | "prevista"
  | "por_cobrar"
  | "paga"
  | "parcialmente_paga"
  | "vencida"
  | "em_atraso"
  | "em_litigio"
  | "anulada";

export type MaintenanceStatus =
  | "aberta"
  | "em_analise"
  | "orcamentada"
  | "aprovada"
  | "em_execucao"
  | "concluida"
  | "cancelada";

export type MaintenancePriority = "baixa" | "media" | "alta" | "urgente";

export type ReceiptStatus = "por_emitir" | "emitido" | "comunicado" | "erro" | "anulado";

export type ReceiptMode = "manual" | "assistido" | "integrado";

export type ReminderType =
  | "renda_vencida"
  | "renda_atraso"
  | "pagamento_parcial"
  | "recibo_por_emitir"
  | "contrato_fim_90"
  | "contrato_fim_30"
  | "seguro_a_vencer"
  | "imi_pendente"
  | "condominio_pendente"
  | "certificado_expirado"
  | "documento_em_falta"
  | "atualizacao_renda"
  | "despesa_por_pagar"
  | "ocorrencia_pendente";

export type DocumentType =
  | "contrato"
  | "aditamento"
  | "recibo_at"
  | "fatura_despesa"
  | "comprovativo_pagamento"
  | "certificado_energetico"
  | "licenca_utilizacao"
  | "seguro"
  | "imi"
  | "condominio"
  | "vistoria"
  | "fotografia"
  | "documento_inquilino"
  | "documento_fiador"
  | "comunicacao_inquilino"
  | "orcamento"
  | "auto_entrega_chaves"
  | "inventario"
  | "outro";

export interface Organization {
  id: string;
  name: string;
  tax_number: string | null;
  email: string | null;
  is_active: boolean;
}

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  default_organization_id: string | null;
}

export interface Owner {
  id: string;
  organization_id: string;
  name: string;
  tax_number: string | null;
  owner_type: OwnerType;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  iban: string | null;
  tax_regime: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Property {
  id: string;
  organization_id: string;
  internal_code: string | null;
  name: string;
  address: string | null;
  postal_code: string | null;
  parish: string | null;
  municipality: string | null;
  district: string | null;
  matrix_article: string | null;
  fraction: string | null;
  property_type: PropertyType;
  area_m2: number | null;
  taxable_value: number | null;
  acquisition_date: string | null;
  acquisition_value: number | null;
  estimated_value: number | null;
  status: PropertyStatus;
  energy_certificate: string | null;
  energy_certificate_expiry: string | null;
  usage_license: string | null;
  insurance_policy: string | null;
  insurance_expiry: string | null;
  condo_fee_monthly: number | null;
  notes: string | null;
  created_at: string;
}

export interface PropertyUnit {
  id: string;
  property_id: string;
  internal_code: string | null;
  name: string;
  unit_type: PropertyType;
  area_m2: number | null;
  status: PropertyStatus;
}

export interface Tenant {
  id: string;
  organization_id: string;
  name: string;
  tax_number: string | null;
  tenant_type: TenantType;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  email: string | null;
  phone: string | null;
  id_document: string | null;
  iban: string | null;
  legal_representative: string | null;
  guarantor_name: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Lease {
  id: string;
  organization_id: string;
  property_id: string;
  unit_id: string | null;
  owner_id: string | null;
  lease_type: LeaseType;
  start_date: string;
  end_date: string | null;
  auto_renewal: boolean;
  renewal_months: number | null;
  initial_rent: number;
  current_rent: number;
  due_day: number;
  deposit_amount: number | null;
  withholding_tax: boolean;
  vat: boolean;
  reported_to_at: boolean;
  at_contract_number: string | null;
  status: LeaseStatus;
  notes: string | null;
  created_at: string;
  // joins
  properties?: Pick<Property, "id" | "name"> | null;
  owners?: Pick<Owner, "id" | "name"> | null;
  lease_tenants?: { tenants: Pick<Tenant, "id" | "name"> | null }[];
}

export interface Supplier {
  id: string;
  organization_id: string;
  name: string;
  tax_number: string | null;
  email: string | null;
  phone: string | null;
  iban: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface MaintenanceCase {
  id: string;
  organization_id: string;
  property_id: string;
  unit_id: string | null;
  lease_id: string | null;
  tenant_id: string | null;
  supplier_id: string | null;
  title: string;
  description: string | null;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  opened_at: string;
  expected_date: string | null;
  completed_at: string | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  notes: string | null;
  created_at: string;
  properties?: Pick<Property, "id" | "name"> | null;
}

export interface Reminder {
  id: string;
  organization_id: string;
  reminder_type: ReminderType;
  priority: MaintenancePriority;
  entity_table: string | null;
  entity_id: string | null;
  due_date: string | null;
  message: string | null;
  is_resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  organization_id: string;
  user_id: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Receipt {
  id: string;
  organization_id: string;
  rent_id: string;
  lease_id: string;
  owner_id: string | null;
  period_start: string | null;
  period_end: string | null;
  amount: number;
  received_date: string | null;
  at_receipt_number: string | null;
  mode: ReceiptMode;
  status: ReceiptStatus;
  notes: string | null;
  created_at: string;
}

export interface DocumentRow {
  id: string;
  organization_id: string;
  property_id: string | null;
  lease_id: string | null;
  tenant_id: string | null;
  document_type: DocumentType;
  original_filename: string;
  storage_path: string;
  mime_type: string | null;
  file_size: number | null;
  sha256_hash: string | null;
  document_date: string | null;
  is_shared_with_tenant: boolean;
  is_shared_with_accountant: boolean;
  created_at: string;
  properties?: Pick<Property, "id" | "name"> | null;
}

// Etiquetas em português para a UI
export const OWNER_TYPE_LABELS: Record<OwnerType, string> = {
  pessoa_singular: "Pessoa singular",
  empresa: "Empresa",
  heranca_indivisa: "Herança indivisa",
  compropriedade: "Compropriedade",
  sociedade_patrimonial: "Sociedade patrimonial",
  outro: "Outro",
};

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  predio: "Prédio",
  apartamento: "Apartamento",
  loja: "Loja",
  garagem: "Garagem",
  escritorio: "Escritório",
  armazem: "Armazém",
  fracao_autonoma: "Fração autónoma",
  terreno: "Terreno",
  outro: "Outro",
};

export const PROPERTY_STATUS_LABELS: Record<PropertyStatus, string> = {
  arrendado: "Arrendado",
  devoluto: "Devoluto",
  em_obras: "Em obras",
  reservado: "Reservado",
  vendido: "Vendido",
  inativo: "Inativo",
};

export const TENANT_TYPE_LABELS: Record<TenantType, string> = {
  particular: "Particular",
  empresa: "Empresa",
  eni: "ENI",
  estudante: "Estudante",
  estrangeiro: "Estrangeiro",
  outro: "Outro",
};

export const LEASE_TYPE_LABELS: Record<LeaseType, string> = {
  habitacao: "Habitação",
  comercio: "Comércio",
  servicos: "Serviços",
  garagem: "Garagem",
  armazem: "Armazém",
  outro: "Outro",
};

export const LEASE_STATUS_LABELS: Record<LeaseStatus, string> = {
  rascunho: "Rascunho",
  ativo: "Ativo",
  terminado: "Terminado",
  suspenso: "Suspenso",
  em_renovacao: "Em renovação",
};

export const RENT_STATUS_LABELS: Record<RentStatus, string> = {
  prevista: "Prevista",
  por_cobrar: "Por cobrar",
  paga: "Paga",
  parcialmente_paga: "Parcialmente paga",
  vencida: "Vencida",
  em_atraso: "Em atraso",
  em_litigio: "Em litígio",
  anulada: "Anulada",
};

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  aberta: "Aberta",
  em_analise: "Em análise",
  orcamentada: "Orçamentada",
  aprovada: "Aprovada",
  em_execucao: "Em execução",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

export const MAINTENANCE_PRIORITY_LABELS: Record<MaintenancePriority, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

export const RECEIPT_STATUS_LABELS: Record<ReceiptStatus, string> = {
  por_emitir: "Por emitir",
  emitido: "Emitido",
  comunicado: "Comunicado à AT",
  erro: "Erro",
  anulado: "Anulado",
};

export const RECEIPT_MODE_LABELS: Record<ReceiptMode, string> = {
  manual: "Manual",
  assistido: "Assistido",
  integrado: "Integrado (futuro)",
};

export const REMINDER_TYPE_LABELS: Record<ReminderType, string> = {
  renda_vencida: "Renda vencida",
  renda_atraso: "Renda em atraso",
  pagamento_parcial: "Pagamento parcial",
  recibo_por_emitir: "Recibo por emitir",
  contrato_fim_90: "Contrato a terminar em 90 dias",
  contrato_fim_30: "Contrato a terminar em 30 dias",
  seguro_a_vencer: "Seguro a vencer",
  imi_pendente: "IMI pendente",
  condominio_pendente: "Condomínio pendente",
  certificado_expirado: "Certificado energético expirado",
  documento_em_falta: "Documento em falta",
  atualizacao_renda: "Atualização de renda",
  despesa_por_pagar: "Despesa por pagar",
  ocorrencia_pendente: "Ocorrência pendente",
};

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  contrato: "Contrato",
  aditamento: "Aditamento",
  recibo_at: "Recibo AT",
  fatura_despesa: "Fatura de despesa",
  comprovativo_pagamento: "Comprovativo de pagamento",
  certificado_energetico: "Certificado energético",
  licenca_utilizacao: "Licença de utilização",
  seguro: "Seguro",
  imi: "IMI",
  condominio: "Condomínio",
  vistoria: "Vistoria",
  fotografia: "Fotografia",
  documento_inquilino: "Documento do inquilino",
  documento_fiador: "Documento do fiador",
  comunicacao_inquilino: "Comunicação com inquilino",
  orcamento: "Orçamento",
  auto_entrega_chaves: "Auto de entrega de chaves",
  inventario: "Inventário",
  outro: "Outro",
};
