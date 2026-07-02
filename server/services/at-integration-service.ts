import type { SupabaseClient } from "@supabase/supabase-js";
import {
  registerContract,
  issueReceipt,
  getReceiptPdf,
  mapLeaseToContractRequest,
  mapRentToReceiptRequest,
  hashPayload,
  getATConfig,
  isATFullyConfigured,
  type ATCredentials,
} from "@/server/at-connector";
import {
  DOCUMENTS_BUCKET,
  buildStoragePath,
  sha256Hex,
} from "@/server/services/document-service";
import { logAtOperation } from "@/server/services/at-connector-service";

export interface ATIntegrationStatus {
  configured: boolean;
  environment: string;
  status: string;
  certificateSubject: string | null;
  certificateExpiresAt: string | null;
  lastTestAt: string | null;
  lastTestSuccess: boolean | null;
  lastSuccessAt: string | null;
}

/** Estado da integração AT desta organização — usado na página de Configurações. */
export async function getATIntegrationStatus(
  supabase: SupabaseClient,
  organizationId: string
): Promise<ATIntegrationStatus> {
  const config = getATConfig();
  const configured = isATFullyConfigured(config);

  const { data } = await supabase
    .from("at_integrations")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("environment", config.environment === "production" ? "production" : "test")
    .maybeSingle();

  return {
    configured,
    environment: config.environment,
    status: data?.status ?? (configured ? "configured" : "not_configured"),
    certificateSubject: data?.certificate_subject ?? null,
    certificateExpiresAt: data?.certificate_expires_at ?? null,
    lastTestAt: data?.last_test_at ?? null,
    lastTestSuccess: data?.last_test_success ?? null,
    lastSuccessAt: data?.last_success_at ?? null,
  };
}

/** Verifica se a configuração local (certificado + chave pública) está completa. Não contacta a AT. */
export async function testATConnectivity(
  supabase: SupabaseClient,
  organizationId: string,
  taxpayerNif: string,
  userId: string
) {
  const config = getATConfig();
  const configured = isATFullyConfigured(config);
  const environment = config.environment === "production" ? "production" : "test";

  await supabase.from("at_integrations").upsert(
    {
      organization_id: organizationId,
      taxpayer_nif: taxpayerNif,
      environment,
      status: configured ? "configured" : "not_configured",
      last_test_at: new Date().toISOString(),
      last_test_success: configured,
      created_by: userId,
    },
    { onConflict: "organization_id,environment" }
  );

  await logAtOperation(supabase, {
    organizationId,
    receiptId: null,
    operation: "testar_conectividade",
    success: configured,
    errorMessage: configured ? undefined : "Certificado ou chave pública da AT não configurados",
    createdBy: userId,
  });

  return { configured, environment, mock: config.environment === "mock" };
}

export interface SubmitContractResult {
  success: boolean;
  atContractNumber: number | null;
  message: string;
  fieldErrors: { campo?: string; mensagem: string }[] | null;
}

/**
 * Comunica um contrato à AT. Bloqueia se já tiver sido comunicado com sucesso.
 * As credenciais só existem durante esta chamada — nunca são persistidas.
 */
export async function submitLeaseContractToAT(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    userId: string;
    leaseId: string;
    credentials: ATCredentials;
  }
): Promise<SubmitContractResult> {
  const { data: lease, error: leaseError } = await supabase
    .from("leases")
    .select(
      "id, at_reference, at_contract_number, lease_type, start_date, end_date, auto_renewal, current_rent, at_submission_status, property_id, properties(tax_district_code, tax_municipality_code, tax_parish_code, matrix_type, matrix_section, matrix_article, fraction, postal_code, address, municipality, at_lot_number, at_floor, at_rented_part, at_common_part, at_missing_registration), owner_properties:properties(owner_properties(ownership_percentage, at_quota_parte, owners(tax_number, at_marriage_regime, at_spouse_tax_number, at_benefit_code))), lease_tenants(at_country_code, at_retention_code, at_foreign_name, tenants(tax_number, id_document))"
    )
    .eq("id", params.leaseId)
    .eq("organization_id", params.organizationId)
    .maybeSingle();

  if (leaseError) {
    console.error("[at-integration] falha ao carregar contrato para submissão AT:", leaseError.message);
    return { success: false, atContractNumber: null, message: `Erro ao carregar contrato: ${leaseError.message}`, fieldErrors: null };
  }
  if (!lease) {
    return { success: false, atContractNumber: null, message: "Contrato não encontrado", fieldErrors: null };
  }
  if (lease.at_contract_number) {
    return {
      success: false,
      atContractNumber: lease.at_contract_number,
      message: "Este contrato já foi comunicado à AT",
      fieldErrors: null,
    };
  }

  const property = (lease.properties as unknown as Record<string, unknown>) ?? {};
  const ownerLinks =
    ((lease.owner_properties as unknown as { owner_properties: Record<string, unknown>[] } | null)
      ?.owner_properties ?? []) as Record<string, unknown>[];
  const leaseTenants = (lease.lease_tenants ?? []) as unknown as (Record<string, unknown> & {
    tenants: Record<string, unknown> | null;
  })[];

  const config = getATConfig();
  const orgNif = params.credentials.username.split("/")[0];

  const mapped = mapLeaseToContractRequest({
    reference: lease.at_reference || lease.id.slice(0, 40),
    lease_type: lease.lease_type,
    start_date: lease.start_date,
    end_date: lease.end_date,
    auto_renewal: lease.auto_renewal,
    current_rent: Number(lease.current_rent),
    nif_declarante: orgNif,
    at_contract_type: "ARREND",
    authorized_tax_number: null,
    properties: [
      {
        tax_district_code: (property.tax_district_code as string) ?? null,
        tax_municipality_code: (property.tax_municipality_code as string) ?? null,
        tax_parish_code: (property.tax_parish_code as string) ?? null,
        matrix_type: (property.matrix_type as string) ?? null,
        matrix_section: (property.matrix_section as string) ?? null,
        matrix_article: (property.matrix_article as string) ?? null,
        fraction: (property.fraction as string) ?? null,
        postal_code: (property.postal_code as string) ?? null,
        address: (property.address as string) ?? null,
        municipality: (property.municipality as string) ?? null,
        at_lot_number: (property.at_lot_number as string) ?? null,
        at_floor: (property.at_floor as string) ?? null,
        at_rented_part: (property.at_rented_part as string) ?? null,
        at_common_part: Boolean(property.at_common_part),
        at_missing_registration: Boolean(property.at_missing_registration),
      },
    ],
    owners: ownerLinks.map((link) => {
      const owner = link.owners as Record<string, unknown> | null;
      return {
        tax_number: (owner?.tax_number as string) ?? null,
        ownership_percentage: Number(link.ownership_percentage ?? 100),
        at_quota_parte: (link.at_quota_parte as string) ?? null,
        at_marriage_regime: (owner?.at_marriage_regime as "CO_GER" | "CO_ADQ") ?? null,
        at_spouse_tax_number: (owner?.at_spouse_tax_number as string) ?? null,
        at_benefit_code: (owner?.at_benefit_code as string) ?? null,
      };
    }),
    tenants: leaseTenants.map((lt) => ({
      tax_number: (lt.tenants?.tax_number as string) ?? null,
      id_document: (lt.tenants?.id_document as string) ?? null,
      at_country_code: (lt.at_country_code as string) ?? "PT",
      at_retention_code: (lt.at_retention_code as string) ?? null,
      at_foreign_name: (lt.at_foreign_name as string) ?? null,
    })),
  });

  if ("errors" in mapped) {
    await supabase.from("at_contract_submissions").insert({
      organization_id: params.organizationId,
      lease_id: params.leaseId,
      taxpayer_nif: orgNif,
      environment: config.environment,
      status: "draft",
      errors_json: mapped.errors,
      created_by: params.userId,
    });
    return {
      success: false,
      atContractNumber: null,
      message: "Dados em falta para comunicar o contrato",
      fieldErrors: mapped.errors,
    };
  }

  const payloadHash = hashPayload(mapped.request);

  const { data: submission } = await supabase
    .from("at_contract_submissions")
    .insert({
      organization_id: params.organizationId,
      lease_id: params.leaseId,
      property_id: lease.property_id,
      taxpayer_nif: orgNif,
      environment: config.environment,
      status: "submitted",
      reference: mapped.request.referencia,
      request_payload_hash: payloadHash,
      submitted_at: new Date().toISOString(),
      created_by: params.userId,
    })
    .select("id")
    .single();

  const outcome = await registerContract(params.credentials, mapped.request);

  const finalStatus = outcome.success
    ? outcome.response?.codigo === 0
      ? "accepted"
      : "rejected"
    : outcome.errorType === "validation"
      ? "draft"
      : "error";

  await supabase
    .from("at_contract_submissions")
    .update({
      status: finalStatus,
      request_xml_redacted: outcome.requestXmlRedacted,
      response_xml_redacted: outcome.responseXmlRedacted,
      response_code: outcome.response?.codigo ?? null,
      response_message: outcome.response?.mensagem ?? outcome.errorMessage,
      at_contract_number: outcome.response?.numeroContrato ?? null,
      errors_json: outcome.response?.erros ?? outcome.validationErrors ?? null,
    })
    .eq("id", submission?.id);

  await logAtOperation(supabase, {
    organizationId: params.organizationId,
    receiptId: null,
    operation: "registar_contrato",
    success: finalStatus === "accepted",
    errorMessage: finalStatus === "accepted" ? undefined : outcome.errorMessage ?? outcome.response?.mensagem,
    createdBy: params.userId,
  });

  if (finalStatus === "accepted" && outcome.response?.numeroContrato) {
    await supabase
      .from("leases")
      .update({
        at_contract_number: outcome.response.numeroContrato,
        at_contract_version: 1,
        reported_to_at: true,
        at_submission_status: "accepted",
        at_last_submission_id: submission?.id,
        at_submitted_at: new Date().toISOString(),
      })
      .eq("id", params.leaseId)
      .eq("organization_id", params.organizationId);
  } else {
    await supabase
      .from("leases")
      .update({ at_submission_status: finalStatus, at_last_submission_id: submission?.id })
      .eq("id", params.leaseId)
      .eq("organization_id", params.organizationId);
  }

  return {
    success: finalStatus === "accepted",
    atContractNumber: outcome.response?.numeroContrato ?? null,
    message: outcome.response?.mensagem ?? outcome.errorMessage ?? "Sem resposta da AT",
    fieldErrors: outcome.response?.erros ?? outcome.validationErrors ?? null,
  };
}

export interface IssueReceiptResult {
  success: boolean;
  atReceiptNumber: number | null;
  message: string;
  fieldErrors: { campo?: string; mensagem: string }[] | null;
  alreadyInProgress?: boolean;
}

/**
 * Emite um recibo AT para uma renda. Bloqueio contra duplicados garantido a
 * dois níveis: verificação prévia + índice único parcial na base de dados
 * (at_receipt_submissions_one_active_per_rent) — mesmo em caso de pedidos
 * concorrentes, só um consegue inserir a linha "pending".
 */
export async function issueReceiptForRentViaAT(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    userId: string;
    rentId: string;
    receiptId: string | null;
    credentials: ATCredentials;
  }
): Promise<IssueReceiptResult> {
  const { data: rent, error: rentError } = await supabase
    .from("rents")
    .select(
      "id, lease_id, period_start, period_end, total_amount, payment_date, receipt_issued, leases(at_contract_number, at_contract_version, lease_type, owner_properties:properties(owner_properties(owners(tax_number))), lease_tenants(at_country_code, at_retention_code, tenants(tax_number, id_document)))"
    )
    .eq("id", params.rentId)
    .eq("organization_id", params.organizationId)
    .maybeSingle();

  if (rentError) {
    console.error("[at-integration] falha ao carregar renda para emissão AT:", rentError.message);
    return { success: false, atReceiptNumber: null, message: `Erro ao carregar renda: ${rentError.message}`, fieldErrors: null };
  }
  if (!rent) return { success: false, atReceiptNumber: null, message: "Renda não encontrada", fieldErrors: null };
  if (rent.receipt_issued) {
    return { success: false, atReceiptNumber: null, message: "Esta renda já tem recibo emitido", fieldErrors: null };
  }

  const lease = rent.leases as unknown as {
    at_contract_number: number | null;
    at_contract_version: number | null;
    owner_properties: { owner_properties: { owners: { tax_number: string | null } | null }[] } | null;
    lease_tenants: (Record<string, unknown> & { tenants: Record<string, unknown> | null })[];
  } | null;

  const config = getATConfig();
  const orgNif = params.credentials.username.split("/")[0];

  const mapped = mapRentToReceiptRequest({
    at_contract_number: lease?.at_contract_number ?? 0,
    at_contract_version: lease?.at_contract_version ?? null,
    nif_emitente: orgNif,
    owners_nifs: (lease?.owner_properties?.owner_properties ?? [])
      .map((l) => l.owners?.tax_number)
      .filter((n): n is string => Boolean(n)),
    tenants: (lease?.lease_tenants ?? []).map((lt) => ({
      tax_number: (lt.tenants?.tax_number as string) ?? null,
      id_document: (lt.tenants?.id_document as string) ?? null,
      at_country_code: (lt.at_country_code as string) ?? "PT",
      at_retention_code: (lt.at_retention_code as string) ?? null,
      at_foreign_name: null,
    })),
    receipt_type: "ARREND",
    period_start: rent.period_start,
    period_end: rent.period_end,
    amount_type: "RENDAC",
    amount: Number(rent.total_amount),
    received_date: rent.payment_date ?? rent.period_end,
  });

  if ("errors" in mapped) {
    return { success: false, atReceiptNumber: null, message: "Dados em falta para emitir o recibo", fieldErrors: mapped.errors };
  }

  // Insere a linha "pending" ANTES de contactar a AT — o índice único parcial
  // impede duas submissões concorrentes para a mesma renda.
  const { data: submission, error: lockError } = await supabase
    .from("at_receipt_submissions")
    .insert({
      organization_id: params.organizationId,
      rent_id: params.rentId,
      receipt_id: params.receiptId,
      lease_id: rent.lease_id,
      taxpayer_nif: orgNif,
      environment: config.environment,
      status: "pending",
      request_payload_hash: hashPayload(mapped.request),
      submitted_at: new Date().toISOString(),
      created_by: params.userId,
    })
    .select("id")
    .single();

  if (lockError) {
    return {
      success: false,
      atReceiptNumber: null,
      message: "Já existe uma emissão em curso ou concluída para esta renda",
      fieldErrors: null,
      alreadyInProgress: true,
    };
  }

  const outcome = await issueReceipt(params.credentials, mapped.request);

  const finalStatus = outcome.success
    ? outcome.response?.codigo === 0
      ? "issued"
      : "rejected"
    : outcome.errorType === "validation"
      ? "error"
      : "unknown"; // timeout/network: incerto se a AT recebeu — nunca reemitir automaticamente

  await supabase
    .from("at_receipt_submissions")
    .update({
      status: finalStatus,
      request_xml_redacted: outcome.requestXmlRedacted,
      response_xml_redacted: outcome.responseXmlRedacted,
      response_code: outcome.response?.codigo ?? null,
      response_message: outcome.response?.mensagem ?? outcome.errorMessage,
      at_receipt_number: outcome.response?.numeroRecibo ?? null,
      errors_json: outcome.response?.erros ?? outcome.validationErrors ?? null,
    })
    .eq("id", submission.id);

  await logAtOperation(supabase, {
    organizationId: params.organizationId,
    receiptId: params.receiptId,
    operation: "emitir_recibo_at",
    success: finalStatus === "issued",
    errorMessage: finalStatus === "issued" ? undefined : outcome.errorMessage ?? outcome.response?.mensagem,
    createdBy: params.userId,
  });

  if (finalStatus === "issued" && outcome.response?.numeroRecibo) {
    await supabase
      .from("rents")
      .update({ receipt_issued: true, at_receipt_number: String(outcome.response.numeroRecibo) })
      .eq("id", params.rentId)
      .eq("organization_id", params.organizationId);

    const receiptPatch = {
      status: "emitido",
      mode: "integrado",
      at_receipt_number: String(outcome.response.numeroRecibo),
      at_status: "issued",
      at_submission_id: submission.id,
      at_integrated_at: new Date().toISOString(),
      at_response_code: outcome.response.codigo,
      at_response_message: outcome.response.mensagem ?? null,
    };

    let effectiveReceiptId = params.receiptId;

    if (effectiveReceiptId) {
      await supabase
        .from("receipts")
        .update(receiptPatch)
        .eq("id", effectiveReceiptId)
        .eq("organization_id", params.organizationId);
    } else {
      // Emissão iniciada diretamente na renda, sem recibo prévio — cria o
      // registo agora para aparecer em /receipts e permitir obter o PDF.
      const { data: newReceipt } = await supabase
        .from("receipts")
        .insert({
          organization_id: params.organizationId,
          rent_id: params.rentId,
          lease_id: rent.lease_id,
          period_start: rent.period_start,
          period_end: rent.period_end,
          amount: rent.total_amount,
          received_date: rent.payment_date,
          created_by: params.userId,
          ...receiptPatch,
        })
        .select("id")
        .single();

      effectiveReceiptId = newReceipt?.id ?? null;

      if (effectiveReceiptId) {
        await supabase
          .from("at_receipt_submissions")
          .update({ receipt_id: effectiveReceiptId })
          .eq("id", submission.id);
      }
    }
  }

  return {
    success: finalStatus === "issued",
    atReceiptNumber: outcome.response?.numeroRecibo ?? null,
    message: outcome.response?.mensagem ?? outcome.errorMessage ?? "Sem resposta da AT",
    fieldErrors: outcome.response?.erros ?? outcome.validationErrors ?? null,
  };
}

/** Obtém o PDF do recibo emitido e guarda-o no arquivo digital. */
export async function fetchAndStoreReceiptPdf(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    userId: string;
    receiptId: string;
    credentials: ATCredentials;
  }
): Promise<{ success: boolean; message: string }> {
  const { data: receipt, error: receiptError } = await supabase
    .from("receipts")
    .select("id, lease_id, rent_id, at_receipt_number, leases(at_contract_number)")
    .eq("id", params.receiptId)
    .eq("organization_id", params.organizationId)
    .maybeSingle();

  if (receiptError) {
    console.error("[at-integration] falha ao carregar recibo para obter PDF:", receiptError.message);
    return { success: false, message: `Erro ao carregar recibo: ${receiptError.message}` };
  }
  if (!receipt || !receipt.at_receipt_number) {
    return { success: false, message: "Recibo AT ainda não emitido" };
  }
  const lease = receipt.leases as unknown as { at_contract_number: number | null } | null;
  if (!lease?.at_contract_number) {
    return { success: false, message: "Contrato sem número AT" };
  }

  const outcome = await getReceiptPdf(params.credentials, {
    numeroContrato: lease.at_contract_number,
    numeroRecibo: Number(receipt.at_receipt_number),
  });

  await logAtOperation(supabase, {
    organizationId: params.organizationId,
    receiptId: params.receiptId,
    operation: "obter_recibo_pdf",
    success: outcome.success && outcome.response?.codigo === 0,
    errorMessage: outcome.errorMessage ?? outcome.response?.mensagem,
    createdBy: params.userId,
  });

  if (!outcome.success || outcome.response?.codigo !== 0 || !outcome.response.recibo) {
    return { success: false, message: outcome.response?.mensagem ?? outcome.errorMessage ?? "Não foi possível obter o PDF" };
  }

  const pdfBuffer = Buffer.from(outcome.response.recibo, "base64");
  const documentId = crypto.randomUUID();
  const storagePath = buildStoragePath({
    organizationId: params.organizationId,
    propertyId: null,
    documentId,
    filename: `recibo_at_${receipt.at_receipt_number}.pdf`,
  });

  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, pdfBuffer, { contentType: "application/pdf" });

  if (uploadError) {
    return { success: false, message: `Falha ao guardar PDF: ${uploadError.message}` };
  }

  const hash = await sha256Hex(pdfBuffer.buffer.slice(pdfBuffer.byteOffset, pdfBuffer.byteOffset + pdfBuffer.byteLength));

  await supabase.from("documents").insert({
    id: documentId,
    organization_id: params.organizationId,
    lease_id: receipt.lease_id,
    rent_id: receipt.rent_id,
    receipt_id: receipt.id,
    document_type: "recibo_at",
    original_filename: `recibo_at_${receipt.at_receipt_number}.pdf`,
    storage_path: storagePath,
    mime_type: "application/pdf",
    file_size: pdfBuffer.byteLength,
    sha256_hash: hash,
    created_by: params.userId,
  });

  await supabase
    .from("receipts")
    .update({ at_pdf_document_id: documentId, at_status: "pdf_obtained" })
    .eq("id", params.receiptId)
    .eq("organization_id", params.organizationId);

  return { success: true, message: "PDF guardado no arquivo digital" };
}
