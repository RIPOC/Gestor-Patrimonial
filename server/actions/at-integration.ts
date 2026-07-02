"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getOrgContext } from "@/server/services/org-service";
import {
  testATConnectivity,
  submitLeaseContractToAT,
  issueReceiptForRentViaAT,
  fetchAndStoreReceiptPdf,
} from "@/server/services/at-integration-service";

/**
 * Todas estas actions recebem "at_username"/"at_password" diretamente do
 * FormData submetido pelo modal de credenciais — nunca são lidas de um campo
 * gravado na base de dados, nunca são escritas em nenhuma tabela, nunca
 * aparecem em revalidatePath/redirect (só mensagens de resultado).
 */

function readCredentials(formData: FormData) {
  const username = String(formData.get("at_username") ?? "").trim();
  const password = String(formData.get("at_password") ?? "");
  return { username, password };
}

export async function runATConnectivityTest(formData: FormData) {
  const { supabase, user, organizationId } = await getOrgContext();
  const nif = String(formData.get("taxpayer_nif") ?? "").trim();

  const result = await testATConnectivity(supabase, organizationId, nif, user.id);

  revalidatePath("/settings/at-integration");
  redirect(
    "/settings/at-integration?result=" +
      encodeURIComponent(
        result.mock
          ? "Modo mock — sem certificado configurado, chamadas simuladas localmente."
          : result.configured
            ? "Configuração válida (certificado e chave pública carregados)."
            : "Configuração incompleta — falta certificado ou chave pública."
      )
  );
}

export async function submitContractToAT(leaseId: string, formData: FormData) {
  const { supabase, user, organizationId } = await getOrgContext();
  const credentials = readCredentials(formData);

  if (!credentials.username || !credentials.password) {
    redirect(`/leases/${leaseId}?error=` + encodeURIComponent("Credenciais do Portal das Finanças obrigatórias"));
  }

  const result = await submitLeaseContractToAT(supabase, {
    organizationId,
    userId: user.id,
    leaseId,
    credentials,
  });

  revalidatePath(`/leases/${leaseId}`);

  if (!result.success) {
    const detail = result.fieldErrors?.map((e) => e.mensagem).join("; ") || result.message;
    redirect(`/leases/${leaseId}?at_error=` + encodeURIComponent(detail));
  }

  redirect(`/leases/${leaseId}?at_success=` + encodeURIComponent(`Contrato comunicado — n.º ${result.atContractNumber}`));
}

export async function issueReceiptViaAT(rentId: string, receiptId: string | null, formData: FormData) {
  const { supabase, user, organizationId } = await getOrgContext();
  const credentials = readCredentials(formData);

  if (!credentials.username || !credentials.password) {
    redirect(`/rents/${rentId}?error=` + encodeURIComponent("Credenciais do Portal das Finanças obrigatórias"));
  }

  const result = await issueReceiptForRentViaAT(supabase, {
    organizationId,
    userId: user.id,
    rentId,
    receiptId,
    credentials,
  });

  revalidatePath(`/rents/${rentId}`);
  revalidatePath("/receipts");

  if (!result.success) {
    const detail = result.fieldErrors?.map((e) => e.mensagem).join("; ") || result.message;
    redirect(`/rents/${rentId}?at_error=` + encodeURIComponent(detail));
  }

  redirect(`/rents/${rentId}?at_success=` + encodeURIComponent(`Recibo AT emitido — n.º ${result.atReceiptNumber}`));
}

export async function fetchReceiptPdfFromAT(receiptId: string, formData: FormData) {
  const { supabase, user, organizationId } = await getOrgContext();
  const credentials = readCredentials(formData);

  if (!credentials.username || !credentials.password) {
    redirect(`/receipts/${receiptId}?error=` + encodeURIComponent("Credenciais do Portal das Finanças obrigatórias"));
  }

  const result = await fetchAndStoreReceiptPdf(supabase, {
    organizationId,
    userId: user.id,
    receiptId,
    credentials,
  });

  revalidatePath(`/receipts/${receiptId}`);

  if (!result.success) {
    redirect(`/receipts/${receiptId}?at_error=` + encodeURIComponent(result.message));
  }
  redirect(`/receipts/${receiptId}?at_success=` + encodeURIComponent(result.message));
}
