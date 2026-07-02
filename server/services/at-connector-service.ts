/**
 * at-connector-service — helpers dos modos manual/assistido de recibos AT
 * (preparação de dados para cópia manual no Portal das Finanças).
 *
 * O modo integrado (webservice SOAP oficial da AT) está implementado em
 * server/at-connector/ (módulo isolado, protocolo puro) e orquestrado em
 * server/services/at-integration-service.ts (acesso a dados).
 *
 * Regras invioláveis, válidas para todos os modos:
 *  - NUNCA fazer scraping do Portal das Finanças;
 *  - NUNCA guardar a senha principal do Portal das Finanças;
 *  - Registar todas as operações em at_operation_logs.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export interface AtReceiptData {
  ownerTaxNumber: string;
  tenantTaxNumber: string;
  atContractNumber: string | null;
  periodStart: string;
  periodEnd: string;
  amount: number;
  receivedDate: string;
}

/** Prepara os dados de um recibo para emissão manual/assistida no Portal das Finanças. */
export function prepareReceiptDataForPortal(data: AtReceiptData): Record<string, string> {
  return {
    "NIF do senhorio": data.ownerTaxNumber,
    "NIF do inquilino": data.tenantTaxNumber,
    "N.º do contrato AT": data.atContractNumber ?? "(por preencher)",
    "Período — início": data.periodStart,
    "Período — fim": data.periodEnd,
    "Valor da renda": data.amount.toFixed(2) + " €",
    "Data de recebimento": data.receivedDate,
  };
}

export async function logAtOperation(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    receiptId: string | null;
    operation: string;
    success: boolean;
    errorMessage?: string;
    createdBy: string;
  }
) {
  await supabase.from("at_operation_logs").insert({
    organization_id: params.organizationId,
    receipt_id: params.receiptId,
    operation: params.operation,
    success: params.success,
    error_message: params.errorMessage ?? null,
    created_by: params.createdBy,
  });
}
