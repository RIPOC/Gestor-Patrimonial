"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getOrgContext } from "@/server/services/org-service";
import { parseCadernetaText, type ParsedCaderneta } from "@/server/services/caderneta-parser";
import { isValidNif } from "@/server/at-connector/nif";
import {
  DOCUMENTS_BUCKET,
  buildStoragePath,
  sha256Hex,
} from "@/server/services/document-service";
import type { PropertyType, PropertyStatus } from "@/lib/types";

const MAX_FILE_SIZE = 25 * 1024 * 1024;

export interface CadernetaPreviewOwnerMatch {
  taxNumber: string;
  name: string;
  address: string | null;
  tipoTitular: string;
  quotaParte: string | null;
  ownershipPercentage: number | null;
  isSpecialRegime: boolean;
  existingOwnerId: string | null;
}

export interface CadernetaPreviewCandidateProperty {
  key: string; // "main" ou código da fração
  fraction: string | null;
  name: string;
  propertyType: PropertyType;
  areaM2: number | null;
  taxableValue: number | null;
  existingPropertyId: string | null;
}

export interface CadernetaPreviewResult {
  ok: boolean;
  error?: string;
  parsed?: ParsedCaderneta;
  candidateProperties?: CadernetaPreviewCandidateProperty[];
  ownerMatches?: CadernetaPreviewOwnerMatch[];
}

function baseName(parsed: ParsedCaderneta): string {
  if (parsed.documentType === "rustica") {
    return parsed.locationName || `Prédio rústico art. ${parsed.matrixArticle ?? "?"}`;
  }
  return parsed.address || `Prédio urbano art. ${parsed.matrixArticle ?? "?"}`;
}

export async function parseCadernetaFile(formData: FormData): Promise<CadernetaPreviewResult> {
  const { supabase, organizationId } = await getOrgContext();

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return { ok: false, error: "Selecione um ficheiro PDF." };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { ok: false, error: "Ficheiro excede 25 MB." };
  }

  let text: string;
  try {
    const { PDFParse } = await import("pdf-parse");
    const buf = Buffer.from(await file.arrayBuffer());
    const parser = new PDFParse({ data: buf });
    const result = await parser.getText();
    await parser.destroy();
    text = result.text;
  } catch (err) {
    console.error("[caderneta] erro ao ler PDF:", err);
    return { ok: false, error: "Não foi possível ler o PDF. Verifique se é uma caderneta predial válida." };
  }

  const parsed = parseCadernetaText(text);

  // Match de proprietário por NIF
  const nifs = Array.from(new Set(parsed.titulares.map((t) => t.taxNumber)));
  const ownerMatches: CadernetaPreviewOwnerMatch[] = [];
  if (nifs.length > 0) {
    const { data: existingOwners } = await supabase
      .from("owners")
      .select("id, tax_number")
      .eq("organization_id", organizationId)
      .in("tax_number", nifs);

    const byNif = new Map((existingOwners ?? []).map((o) => [o.tax_number, o.id]));
    for (const t of parsed.titulares) {
      ownerMatches.push({
        taxNumber: t.taxNumber,
        name: t.name,
        address: t.address,
        tipoTitular: t.tipoTitular,
        quotaParte: t.quotaParte,
        ownershipPercentage: t.ownershipPercentage,
        isSpecialRegime: t.isSpecialRegime,
        existingOwnerId: byNif.get(t.taxNumber) ?? null,
      });
    }
  }

  // Match de imóvel(is) por artigo matricial
  let existingByFraction = new Map<string, string>();
  if (parsed.matrixArticle) {
    const { data: existingProps } = await supabase
      .from("properties")
      .select("id, matrix_article, fraction, district, municipality, parish")
      .eq("organization_id", organizationId)
      .eq("matrix_article", parsed.matrixArticle);

    for (const p of existingProps ?? []) {
      const districtOk =
        !parsed.districtName || !p.district || p.district.trim().toLowerCase() === parsed.districtName.trim().toLowerCase();
      const municipalityOk =
        !parsed.municipalityName ||
        !p.municipality ||
        p.municipality.trim().toLowerCase() === parsed.municipalityName.trim().toLowerCase();
      if (districtOk && municipalityOk) {
        existingByFraction.set(p.fraction ?? "", p.id);
      }
    }
  }

  const candidateProperties: CadernetaPreviewCandidateProperty[] = [];
  if (parsed.units.length > 0) {
    for (const u of parsed.units) {
      candidateProperties.push({
        key: u.code ?? "unidade",
        fraction: u.code,
        name: `${baseName(parsed)} — Fração ${u.code}`,
        propertyType: "fracao_autonoma",
        areaM2: u.areaM2,
        taxableValue: u.taxableValue,
        existingPropertyId: existingByFraction.get(u.code ?? "") ?? null,
      });
    }
  } else {
    candidateProperties.push({
      key: "main",
      fraction: null,
      name: baseName(parsed),
      propertyType: parsed.documentType === "rustica" ? "terreno" : "predio",
      areaM2: parsed.areaM2,
      taxableValue: parsed.taxableValueTotal,
      existingPropertyId: existingByFraction.get("") ?? null,
    });
  }

  return { ok: true, parsed, candidateProperties, ownerMatches };
}

export interface ImportCadernetaOwnerDecision {
  taxNumber: string;
  name: string;
  address: string | null;
  existingOwnerId: string | null;
  createNew: boolean;
  ownershipPercentage: number;
}

export interface ImportCadernetaPropertyPayload {
  key: string;
  selected: boolean;
  existingPropertyId: string | null;
  updateExisting: boolean;
  name: string;
  propertyType: PropertyType;
  status: PropertyStatus;
  internalCode: string | null;
  areaM2: number | null;
  taxableValue: number | null;
  fraction: string | null;
  matrixArticle: string | null;
  matrixSection: string | null;
  matrixType: "U" | "R";
  district: string | null;
  municipality: string | null;
  parish: string | null;
  address: string | null;
  postalCode: string | null;
  acquisitionDate: string | null;
  acquisitionValue: number | null;
  estimatedValue: number | null;
  energyCertificate: string | null;
  energyCertificateExpiry: string | null;
  usageLicense: string | null;
  insurancePolicy: string | null;
  insuranceExpiry: string | null;
  condoFeeMonthly: number | null;
  notes: string | null;
}

export async function importCadernetaData(
  formData: FormData
): Promise<{ ok: boolean; error?: string; propertyIds?: string[] }> {
  const { supabase, user, organizationId } = await getOrgContext();

  const payloadRaw = formData.get("payload");
  if (typeof payloadRaw !== "string") {
    return { ok: false, error: "Dados de importação em falta." };
  }
  let payload: { properties: ImportCadernetaPropertyPayload[]; owners: ImportCadernetaOwnerDecision[] };
  try {
    payload = JSON.parse(payloadRaw);
  } catch {
    return { ok: false, error: "Dados de importação inválidos." };
  }

  const selectedProperties = payload.properties.filter((p) => p.selected);
  if (selectedProperties.length === 0) {
    return { ok: false, error: "Selecione pelo menos um imóvel para importar." };
  }

  // Cria/reaproveita proprietários
  const ownerIdByNif = new Map<string, string>();
  for (const o of payload.owners) {
    if (o.existingOwnerId) {
      ownerIdByNif.set(o.taxNumber, o.existingOwnerId);
      continue;
    }
    if (!o.createNew) continue;

    if (!isValidNif(o.taxNumber)) {
      return {
        ok: false,
        error: `NIF inválido para ${o.name} (${o.taxNumber}) — verifique o número antes de importar.`,
      };
    }

    const { data: newOwner, error } = await supabase
      .from("owners")
      .insert({
        organization_id: organizationId,
        name: o.name,
        tax_number: o.taxNumber,
        owner_type: "pessoa_singular",
        address: o.address,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error || !newOwner) {
      return { ok: false, error: `Erro ao criar proprietário ${o.name}: ${error?.message ?? "desconhecido"}` };
    }
    ownerIdByNif.set(o.taxNumber, newOwner.id);
  }

  const propertyIds: string[] = [];

  for (const p of selectedProperties) {
    let propertyId = p.existingPropertyId;

    if (!propertyId) {
      const { data: newProperty, error } = await supabase
        .from("properties")
        .insert({
          organization_id: organizationId,
          internal_code: p.internalCode,
          name: p.name,
          property_type: p.propertyType,
          area_m2: p.areaM2,
          taxable_value: p.taxableValue,
          fraction: p.fraction,
          matrix_article: p.matrixArticle,
          matrix_section: p.matrixSection,
          matrix_type: p.matrixType,
          district: p.district,
          municipality: p.municipality,
          parish: p.parish,
          address: p.address,
          postal_code: p.postalCode,
          status: p.status,
          acquisition_date: p.acquisitionDate,
          acquisition_value: p.acquisitionValue,
          estimated_value: p.estimatedValue,
          energy_certificate: p.energyCertificate,
          energy_certificate_expiry: p.energyCertificateExpiry,
          usage_license: p.usageLicense,
          insurance_policy: p.insurancePolicy,
          insurance_expiry: p.insuranceExpiry,
          condo_fee_monthly: p.condoFeeMonthly,
          notes: p.notes,
          created_by: user.id,
        })
        .select("id")
        .single();

      if (error || !newProperty) {
        return { ok: false, error: `Erro ao criar imóvel ${p.name}: ${error?.message ?? "desconhecido"}` };
      }
      propertyId = newProperty.id;
    } else if (p.updateExisting) {
      const { error } = await supabase
        .from("properties")
        .update({
          area_m2: p.areaM2,
          taxable_value: p.taxableValue,
          matrix_section: p.matrixSection,
          matrix_type: p.matrixType,
          district: p.district,
          municipality: p.municipality,
          parish: p.parish,
          address: p.address,
          postal_code: p.postalCode,
        })
        .eq("id", propertyId)
        .eq("organization_id", organizationId);

      if (error) {
        return { ok: false, error: `Erro ao atualizar imóvel ${p.name}: ${error.message}` };
      }
    }

    if (!propertyId) {
      return { ok: false, error: `Erro interno ao determinar o ID do imóvel ${p.name}.` };
    }

    propertyIds.push(propertyId);

    // Liga proprietários selecionados a este imóvel
    for (const o of payload.owners) {
      const ownerId = ownerIdByNif.get(o.taxNumber);
      if (!ownerId) continue;

      const { data: existingLink } = await supabase
        .from("owner_properties")
        .select("id")
        .eq("owner_id", ownerId)
        .eq("property_id", propertyId)
        .maybeSingle();

      if (existingLink) continue;

      await supabase.from("owner_properties").insert({
        organization_id: organizationId,
        owner_id: ownerId,
        property_id: propertyId,
        ownership_percentage: o.ownershipPercentage,
        created_by: user.id,
      });
    }
  }

  // Anexa o PDF original ao arquivo digital do primeiro imóvel importado (rastreabilidade fiscal)
  const file = formData.get("file") as File | null;
  if (file && file.size > 0 && propertyIds[0]) {
    try {
      const buffer = await file.arrayBuffer();
      const hash = await sha256Hex(buffer);
      const documentId = crypto.randomUUID();
      const storagePath = buildStoragePath({
        organizationId,
        propertyId: propertyIds[0],
        documentId,
        filename: file.name,
      });

      const { error: uploadError } = await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .upload(storagePath, buffer, {
          contentType: file.type || "application/pdf",
          upsert: false,
        });

      if (!uploadError) {
        const { error: insertError } = await supabase.from("documents").insert({
          id: documentId,
          organization_id: organizationId,
          property_id: propertyIds[0],
          document_type: "caderneta_predial",
          original_filename: file.name,
          storage_path: storagePath,
          mime_type: file.type || "application/pdf",
          file_size: file.size,
          sha256_hash: hash,
          created_by: user.id,
        });
        if (insertError) {
          await supabase.storage.from(DOCUMENTS_BUCKET).remove([storagePath]);
        }
      }
    } catch {
      // A anexação do PDF é um extra — não bloqueia a importação dos dados se falhar.
    }
  }

  revalidatePath("/properties");
  revalidatePath("/documents");
  return { ok: true, propertyIds };
}

export async function goToImportedProperty(propertyId: string) {
  redirect(`/properties/${propertyId}`);
}
