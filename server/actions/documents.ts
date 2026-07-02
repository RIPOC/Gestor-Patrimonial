"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getOrgContext, getTenantContextOrNull } from "@/server/services/org-service";
import {
  DOCUMENTS_BUCKET,
  buildStoragePath,
  getDocumentSignedUrl,
  sha256Hex,
} from "@/server/services/document-service";
import { documentUploadSchema } from "@/lib/validators";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

// Apenas caminhos internos relativos (evita open redirect)
const RELATIVE_PATH_RE = /^\/[A-Za-z0-9\-_/]*$/;

function safeRedirect(path: string | null, fallback: string): string {
  return path && RELATIVE_PATH_RE.test(path) ? path : fallback;
}

export async function uploadDocument(formData: FormData) {
  const { supabase, user, organizationId } = await getOrgContext();

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    redirect("/documents?error=" + encodeURIComponent("Selecione um ficheiro"));
  }
  if (file.size > MAX_FILE_SIZE) {
    redirect("/documents?error=" + encodeURIComponent("Ficheiro excede 25 MB"));
  }

  const parsed = documentUploadSchema.safeParse({
    document_type: formData.get("document_type"),
    property_id: formData.get("property_id"),
    lease_id: formData.get("lease_id"),
    tenant_id: formData.get("tenant_id"),
    document_date: formData.get("document_date"),
    is_shared_with_tenant: formData.get("is_shared_with_tenant"),
    is_shared_with_accountant: formData.get("is_shared_with_accountant"),
  });

  if (!parsed.success) {
    redirect(
      "/documents?error=" +
        encodeURIComponent(parsed.error.errors[0]?.message ?? "Dados inválidos")
    );
  }

  const buffer = await file.arrayBuffer();
  const hash = await sha256Hex(buffer);
  const documentId = crypto.randomUUID();
  const storagePath = buildStoragePath({
    organizationId,
    propertyId: parsed.data.property_id ?? null,
    documentId,
    filename: file.name,
  });

  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    redirect("/documents?error=" + encodeURIComponent(uploadError.message));
  }

  const { error: insertError } = await supabase.from("documents").insert({
    id: documentId,
    organization_id: organizationId,
    property_id: parsed.data.property_id || null,
    lease_id: parsed.data.lease_id || null,
    tenant_id: parsed.data.tenant_id || null,
    document_type: parsed.data.document_type,
    original_filename: file.name,
    storage_path: storagePath,
    mime_type: file.type || null,
    file_size: file.size,
    sha256_hash: hash,
    document_date: parsed.data.document_date || null,
    is_shared_with_tenant: parsed.data.is_shared_with_tenant,
    is_shared_with_accountant: parsed.data.is_shared_with_accountant,
    created_by: user.id,
  });

  if (insertError) {
    // rollback do ficheiro para não deixar órfãos no storage
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([storagePath]);
    redirect("/documents?error=" + encodeURIComponent(insertError.message));
  }

  revalidatePath("/documents");
  redirect("/documents");
}

export async function downloadDocument(documentId: string) {
  const { supabase, organizationId } = await getOrgContext();

  const { data: doc } = await supabase
    .from("documents")
    .select("storage_path")
    .eq("id", documentId)
    .eq("organization_id", organizationId)
    .single();

  if (!doc) {
    redirect("/documents?error=" + encodeURIComponent("Documento não encontrado"));
  }

  const url = await getDocumentSignedUrl(supabase, doc.storage_path);
  if (!url) {
    redirect("/documents?error=" + encodeURIComponent("Não foi possível gerar o link"));
  }

  redirect(url);
}

/**
 * Upload genérico ligado a uma entidade específica (despesa, ocorrência, recibo),
 * usado a partir das páginas de detalhe/edição dessas entidades. Regressa ao
 * `redirect_to` indicado (validado como caminho interno).
 */
export async function uploadLinkedDocument(formData: FormData) {
  const { supabase, user, organizationId } = await getOrgContext();

  const redirectTo = safeRedirect(String(formData.get("redirect_to") ?? ""), "/documents");

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    redirect(`${redirectTo}?error=` + encodeURIComponent("Selecione um ficheiro"));
  }
  if (file.size > MAX_FILE_SIZE) {
    redirect(`${redirectTo}?error=` + encodeURIComponent("Ficheiro excede 25 MB"));
  }

  const documentType = String(formData.get("document_type") ?? "outro");
  const propertyId = (formData.get("property_id") as string) || null;
  const leaseId = (formData.get("lease_id") as string) || null;
  const expenseId = (formData.get("expense_id") as string) || null;
  const maintenanceCaseId = (formData.get("maintenance_case_id") as string) || null;
  const receiptId = (formData.get("receipt_id") as string) || null;

  const buffer = await file.arrayBuffer();
  const hash = await sha256Hex(buffer);
  const documentId = crypto.randomUUID();
  const storagePath = buildStoragePath({
    organizationId,
    propertyId,
    documentId,
    filename: file.name,
  });

  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    redirect(`${redirectTo}?error=` + encodeURIComponent(uploadError.message));
  }

  const { error: insertError } = await supabase.from("documents").insert({
    id: documentId,
    organization_id: organizationId,
    property_id: propertyId,
    lease_id: leaseId,
    expense_id: expenseId,
    maintenance_case_id: maintenanceCaseId,
    receipt_id: receiptId,
    document_type: documentType,
    original_filename: file.name,
    storage_path: storagePath,
    mime_type: file.type || null,
    file_size: file.size,
    sha256_hash: hash,
    created_by: user.id,
  });

  if (insertError) {
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([storagePath]);
    redirect(`${redirectTo}?error=` + encodeURIComponent(insertError.message));
  }

  revalidatePath(redirectTo);
  redirect(redirectTo);
}

/** Download por parte do inquilino — apenas documentos partilhados dos seus contratos (validado por RLS). */
export async function downloadSharedDocument(documentId: string) {
  const ctx = await getTenantContextOrNull();
  if (!ctx) {
    redirect("/portal?error=" + encodeURIComponent("Sessão inválida"));
  }
  const { supabase } = ctx;

  // A RLS (tenant_shared_documents) garante que só devolve documentos partilhados do inquilino
  const { data: doc } = await supabase
    .from("documents")
    .select("storage_path")
    .eq("id", documentId)
    .eq("is_shared_with_tenant", true)
    .maybeSingle();

  if (!doc) {
    redirect("/portal?error=" + encodeURIComponent("Documento não disponível"));
  }

  const url = await getDocumentSignedUrl(supabase, doc.storage_path);
  if (!url) {
    redirect("/portal?error=" + encodeURIComponent("Não foi possível gerar o link"));
  }

  redirect(url);
}
