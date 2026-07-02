import type { SupabaseClient } from "@supabase/supabase-js";

export const DOCUMENTS_BUCKET = "documents";

/** Path canónico no bucket privado (o 2.º segmento é sempre o organization_id — ver RLS do storage). */
export function buildStoragePath(params: {
  organizationId: string;
  propertyId: string | null;
  documentId: string;
  filename: string;
}): string {
  const safeName = params.filename.replace(/[^\w.\-]+/g, "_");
  const propertySegment = params.propertyId ?? "general";
  return `organizations/${params.organizationId}/properties/${propertySegment}/documents/${params.documentId}/${safeName}`;
}

export async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Signed URL temporário (nunca URLs públicas para documentos privados). */
export async function getDocumentSignedUrl(
  supabase: SupabaseClient,
  storagePath: string,
  expiresInSeconds = 300
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error) return null;
  return data.signedUrl;
}
