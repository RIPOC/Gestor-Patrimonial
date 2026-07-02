"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getOrgContext } from "@/server/services/org-service";
import { markRentReceiptState } from "@/server/services/receipt-service";
import { logAtOperation } from "@/server/services/at-connector-service";
import {
  DOCUMENTS_BUCKET,
  buildStoragePath,
  sha256Hex,
} from "@/server/services/document-service";
import { receiptCreateSchema, receiptCompleteSchema } from "@/lib/validators";

/**
 * Cria o registo do recibo para uma renda paga. Se o n.º do recibo AT for
 * indicado (emissão já feita no Portal das Finanças), fica logo 'emitido'
 * e a renda é marcada como tendo recibo. Caso contrário fica 'por_emitir'
 * — corresponde ao modo assistido, em que os dados foram apenas preparados.
 */
export async function createReceipt(formData: FormData) {
  const { supabase, user, organizationId } = await getOrgContext();

  const parsed = receiptCreateSchema.safeParse({
    rent_id: formData.get("rent_id"),
    mode: formData.get("mode"),
    at_receipt_number: formData.get("at_receipt_number"),
    received_date: formData.get("received_date"),
    notes: formData.get("notes"),
  });

  const rentIdRaw = String(formData.get("rent_id") ?? "");

  if (!parsed.success) {
    redirect(
      `/receipts/new?rent_id=${rentIdRaw}&error=` +
        encodeURIComponent(parsed.error.errors[0]?.message ?? "Dados inválidos")
    );
  }

  const { data: rent } = await supabase
    .from("rents")
    .select("id, lease_id, owner_id, period_start, period_end, total_amount, receipt_issued")
    .eq("id", parsed.data.rent_id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!rent) {
    redirect("/receipts?error=" + encodeURIComponent("Renda não encontrada"));
  }
  if (rent.receipt_issued) {
    redirect("/receipts?error=" + encodeURIComponent("Esta renda já tem recibo associado"));
  }

  const status = parsed.data.at_receipt_number ? "emitido" : "por_emitir";

  const { data: receipt, error } = await supabase
    .from("receipts")
    .insert({
      organization_id: organizationId,
      rent_id: rent.id,
      lease_id: rent.lease_id,
      owner_id: rent.owner_id,
      period_start: rent.period_start,
      period_end: rent.period_end,
      amount: rent.total_amount,
      received_date: parsed.data.received_date,
      at_receipt_number: parsed.data.at_receipt_number,
      mode: parsed.data.mode,
      status,
      notes: parsed.data.notes,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    redirect(`/receipts/new?rent_id=${rentIdRaw}&error=` + encodeURIComponent(error.message));
  }

  const file = formData.get("file") as File | null;
  if (file && file.size > 0) {
    await attachReceiptPdf(supabase, {
      organizationId,
      receiptId: receipt.id,
      leaseId: rent.lease_id,
      rentId: rent.id,
      userId: user.id,
      file,
    });
  }

  if (parsed.data.at_receipt_number) {
    await markRentReceiptState(supabase, rent.id, organizationId, {
      issued: true,
      atReceiptNumber: parsed.data.at_receipt_number,
    });
  }

  await logAtOperation(supabase, {
    organizationId,
    receiptId: receipt.id,
    operation: parsed.data.mode === "manual" ? "emissao_manual" : "preparacao_assistida",
    success: true,
    createdBy: user.id,
  });

  revalidatePath("/receipts");
  revalidatePath("/rents");
  redirect(`/receipts/${receipt.id}`);
}

/** Completa um recibo que ficou 'por_emitir' (fluxo assistido) com o número obtido no Portal das Finanças. */
export async function completeReceipt(receiptId: string, formData: FormData) {
  const { supabase, user, organizationId } = await getOrgContext();

  const parsed = receiptCompleteSchema.safeParse({
    at_receipt_number: formData.get("at_receipt_number"),
    received_date: formData.get("received_date"),
  });

  if (!parsed.success) {
    redirect(
      `/receipts/${receiptId}?error=` +
        encodeURIComponent(parsed.error.errors[0]?.message ?? "Dados inválidos")
    );
  }

  const { data: receipt } = await supabase
    .from("receipts")
    .select("id, rent_id, lease_id")
    .eq("id", receiptId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!receipt) {
    redirect("/receipts?error=" + encodeURIComponent("Recibo não encontrado"));
  }

  await supabase
    .from("receipts")
    .update({
      at_receipt_number: parsed.data.at_receipt_number,
      received_date: parsed.data.received_date,
      status: "emitido",
    })
    .eq("id", receiptId)
    .eq("organization_id", organizationId);

  const file = formData.get("file") as File | null;
  if (file && file.size > 0) {
    await attachReceiptPdf(supabase, {
      organizationId,
      receiptId,
      leaseId: receipt.lease_id,
      rentId: receipt.rent_id,
      userId: user.id,
      file,
    });
  }

  await markRentReceiptState(supabase, receipt.rent_id, organizationId, {
    issued: true,
    atReceiptNumber: parsed.data.at_receipt_number,
  });

  await logAtOperation(supabase, {
    organizationId,
    receiptId,
    operation: "conclusao_emissao",
    success: true,
    createdBy: user.id,
  });

  revalidatePath("/receipts");
  revalidatePath("/rents");
  revalidatePath(`/receipts/${receiptId}`);
  redirect(`/receipts/${receiptId}`);
}

/** Bookkeeping manual do estado "comunicado" — sem qualquer chamada à AT. */
export async function markReceiptCommunicated(receiptId: string) {
  const { supabase, user, organizationId } = await getOrgContext();

  await supabase
    .from("receipts")
    .update({ status: "comunicado" })
    .eq("id", receiptId)
    .eq("organization_id", organizationId);

  await logAtOperation(supabase, {
    organizationId,
    receiptId,
    operation: "marcar_comunicado",
    success: true,
    createdBy: user.id,
  });

  revalidatePath(`/receipts/${receiptId}`);
  revalidatePath("/receipts");
  redirect(`/receipts/${receiptId}`);
}

export async function cancelReceipt(receiptId: string) {
  const { supabase, user, organizationId } = await getOrgContext();

  const { data: receipt } = await supabase
    .from("receipts")
    .select("rent_id")
    .eq("id", receiptId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  await supabase
    .from("receipts")
    .update({ status: "anulado" })
    .eq("id", receiptId)
    .eq("organization_id", organizationId);

  if (receipt) {
    await markRentReceiptState(supabase, receipt.rent_id, organizationId, {
      issued: false,
      atReceiptNumber: null,
    });
  }

  await logAtOperation(supabase, {
    organizationId,
    receiptId,
    operation: "anular_recibo",
    success: true,
    createdBy: user.id,
  });

  revalidatePath("/receipts");
  revalidatePath("/rents");
  redirect("/receipts");
}

async function attachReceiptPdf(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    receiptId: string;
    leaseId: string;
    rentId: string;
    userId: string;
    file: File;
  }
) {
  const buffer = await params.file.arrayBuffer();
  const hash = await sha256Hex(buffer);
  const documentId = crypto.randomUUID();
  const storagePath = buildStoragePath({
    organizationId: params.organizationId,
    propertyId: null,
    documentId,
    filename: params.file.name,
  });

  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, buffer, {
      contentType: params.file.type || "application/pdf",
      upsert: false,
    });

  if (uploadError) return;

  await supabase.from("documents").insert({
    id: documentId,
    organization_id: params.organizationId,
    lease_id: params.leaseId,
    rent_id: params.rentId,
    receipt_id: params.receiptId,
    document_type: "recibo_at",
    original_filename: params.file.name,
    storage_path: storagePath,
    mime_type: params.file.type || null,
    file_size: params.file.size,
    sha256_hash: hash,
    created_by: params.userId,
  });
}
