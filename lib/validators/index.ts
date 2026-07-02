import { z } from "zod";

const optionalString = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

const optionalNumber = z.preprocess(
  (v) => (v === "" || v == null ? null : Number(String(v).replace(",", "."))),
  z.number().nullable().optional()
);

const optionalDate = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

export const nifSchema = z
  .string()
  .trim()
  .regex(/^\d{9}$/, "NIF deve ter 9 dígitos")
  .optional()
  .or(z.literal("").transform(() => null))
  .nullable();

export const ownerSchema = z.object({
  name: z.string().trim().min(2, "Nome obrigatório"),
  tax_number: nifSchema,
  owner_type: z.enum([
    "pessoa_singular",
    "empresa",
    "heranca_indivisa",
    "compropriedade",
    "sociedade_patrimonial",
    "outro",
  ]),
  address: optionalString,
  postal_code: optionalString,
  city: optionalString,
  country: optionalString,
  email: z
    .string()
    .trim()
    .email("Email inválido")
    .optional()
    .or(z.literal("").transform(() => null))
    .nullable(),
  phone: optionalString,
  iban: optionalString,
  tax_regime: optionalString,
  notes: optionalString,
});

export const propertySchema = z.object({
  internal_code: optionalString,
  name: z.string().trim().min(2, "Designação obrigatória"),
  address: optionalString,
  postal_code: optionalString,
  parish: optionalString,
  municipality: optionalString,
  district: optionalString,
  matrix_article: optionalString,
  fraction: optionalString,
  property_type: z.enum([
    "predio",
    "apartamento",
    "loja",
    "garagem",
    "escritorio",
    "armazem",
    "fracao_autonoma",
    "terreno",
    "outro",
  ]),
  area_m2: optionalNumber,
  taxable_value: optionalNumber,
  acquisition_date: optionalDate,
  acquisition_value: optionalNumber,
  estimated_value: optionalNumber,
  status: z.enum(["arrendado", "devoluto", "em_obras", "reservado", "vendido", "inativo"]),
  energy_certificate: optionalString,
  energy_certificate_expiry: optionalDate,
  usage_license: optionalString,
  insurance_policy: optionalString,
  insurance_expiry: optionalDate,
  condo_fee_monthly: optionalNumber,
  notes: optionalString,
  owner_id: optionalString,
});

export const tenantSchema = z.object({
  name: z.string().trim().min(2, "Nome obrigatório"),
  tax_number: nifSchema,
  tenant_type: z.enum(["particular", "empresa", "eni", "estudante", "estrangeiro", "outro"]),
  address: optionalString,
  postal_code: optionalString,
  city: optionalString,
  email: z
    .string()
    .trim()
    .email("Email inválido")
    .optional()
    .or(z.literal("").transform(() => null))
    .nullable(),
  phone: optionalString,
  id_document: optionalString,
  iban: optionalString,
  legal_representative: optionalString,
  guarantor_name: optionalString,
  guarantor_tax_number: optionalString,
  guarantor_contact: optionalString,
  notes: optionalString,
});

export const leaseSchema = z
  .object({
    property_id: z.string().uuid("Imóvel obrigatório"),
    unit_id: optionalString,
    owner_id: optionalString,
    tenant_id: z.string().uuid("Inquilino obrigatório"),
    lease_type: z.enum(["habitacao", "comercio", "servicos", "garagem", "armazem", "outro"]),
    start_date: z.string().min(10, "Data de início obrigatória"),
    end_date: optionalDate,
    auto_renewal: z.preprocess((v) => v === "on" || v === true, z.boolean()),
    renewal_months: optionalNumber,
    initial_rent: z.preprocess(
      (v) => Number(String(v).replace(",", ".")),
      z.number().positive("Renda tem de ser positiva")
    ),
    due_day: z.preprocess((v) => Number(v), z.number().int().min(1).max(31)),
    deposit_amount: optionalNumber,
    withholding_tax: z.preprocess((v) => v === "on" || v === true, z.boolean()),
    vat: z.preprocess((v) => v === "on" || v === true, z.boolean()),
    reported_to_at: z.preprocess((v) => v === "on" || v === true, z.boolean()),
    at_contract_number: optionalString,
    status: z.enum(["rascunho", "ativo", "terminado", "suspenso", "em_renovacao"]),
    notes: optionalString,
  })
  .refine(
    (data) => !data.end_date || data.end_date > data.start_date,
    { message: "Data de fim tem de ser posterior à de início", path: ["end_date"] }
  );

export const documentUploadSchema = z.object({
  document_type: z.string().min(1, "Tipo de documento obrigatório"),
  property_id: optionalString,
  lease_id: optionalString,
  tenant_id: optionalString,
  document_date: optionalDate,
  is_shared_with_tenant: z.preprocess((v) => v === "on" || v === true, z.boolean()),
  is_shared_with_accountant: z.preprocess((v) => v === "on" || v === true, z.boolean()),
});

export const organizationSchema = z.object({
  name: z.string().trim().min(2, "Nome da organização obrigatório"),
  tax_number: nifSchema,
});

export const paymentSchema = z.object({
  rent_id: z.string().uuid("Renda inválida"),
  payment_date: z.string().min(10, "Data de pagamento obrigatória"),
  amount: z.preprocess(
    (v) => Number(String(v).replace(",", ".")),
    z.number().positive("Valor tem de ser positivo")
  ),
  method: z.enum([
    "transferencia",
    "numerario",
    "cheque",
    "debito_direto",
    "multibanco",
    "mbway",
    "outro",
  ]),
  reference: optionalString,
  bank: optionalString,
  notes: optionalString,
});

export const expenseSchema = z
  .object({
    property_id: optionalString,
    unit_id: optionalString,
    lease_id: optionalString,
    category_id: optionalString,
    supplier_id: optionalString,
    supplier_name: optionalString,
    supplier_tax_number: nifSchema,
    expense_date: z.string().min(10, "Data da despesa obrigatória"),
    description: z.string().trim().min(2, "Descrição obrigatória"),
    amount_net: optionalNumber,
    vat_amount: z.preprocess(
      (v) => (v === "" || v == null ? 0 : Number(String(v).replace(",", "."))),
      z.number().min(0)
    ),
    amount_total: z.preprocess(
      (v) => Number(String(v).replace(",", ".")),
      z.number().positive("Valor total tem de ser positivo")
    ),
    is_tax_deductible: z.preprocess((v) => v === "on" || v === true, z.boolean()),
    status: z.enum(["por_pagar", "pago"]),
    payment_date: optionalDate,
  })
  .refine((d) => d.property_id || d.unit_id || d.lease_id, {
    message: "A despesa tem de estar associada a um imóvel, fração ou contrato",
    path: ["property_id"],
  });

export const supplierSchema = z.object({
  name: z.string().trim().min(2, "Nome do fornecedor obrigatório"),
  tax_number: nifSchema,
  email: z
    .string()
    .trim()
    .email("Email inválido")
    .optional()
    .or(z.literal("").transform(() => null))
    .nullable(),
  phone: optionalString,
  iban: optionalString,
  notes: optionalString,
});

export const maintenanceSchema = z.object({
  property_id: z.string().uuid("Imóvel obrigatório"),
  unit_id: optionalString,
  lease_id: optionalString,
  tenant_id: optionalString,
  supplier_id: optionalString,
  title: z.string().trim().min(2, "Título obrigatório"),
  description: optionalString,
  priority: z.enum(["baixa", "media", "alta", "urgente"]),
  status: z.enum([
    "aberta",
    "em_analise",
    "orcamentada",
    "aprovada",
    "em_execucao",
    "concluida",
    "cancelada",
  ]),
  opened_at: z.string().min(10, "Data de abertura obrigatória"),
  expected_date: optionalDate,
  estimated_cost: optionalNumber,
  actual_cost: optionalNumber,
  notes: optionalString,
});

export const receiptCreateSchema = z.object({
  rent_id: z.string().uuid("Renda inválida"),
  mode: z.enum(["manual", "assistido"]),
  at_receipt_number: optionalString,
  received_date: optionalDate,
  notes: optionalString,
});

export const receiptCompleteSchema = z.object({
  at_receipt_number: z.string().trim().min(1, "Número do recibo obrigatório"),
  received_date: optionalDate,
});
