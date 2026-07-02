"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getOrgContext } from "@/server/services/org-service";
import { propertySchema } from "@/lib/validators";

function parsePropertyForm(formData: FormData) {
  return propertySchema.safeParse({
    internal_code: formData.get("internal_code"),
    name: formData.get("name"),
    address: formData.get("address"),
    postal_code: formData.get("postal_code"),
    parish: formData.get("parish"),
    municipality: formData.get("municipality"),
    district: formData.get("district"),
    matrix_article: formData.get("matrix_article"),
    fraction: formData.get("fraction"),
    property_type: formData.get("property_type"),
    area_m2: formData.get("area_m2"),
    taxable_value: formData.get("taxable_value"),
    acquisition_date: formData.get("acquisition_date"),
    acquisition_value: formData.get("acquisition_value"),
    estimated_value: formData.get("estimated_value"),
    status: formData.get("status"),
    energy_certificate: formData.get("energy_certificate"),
    energy_certificate_expiry: formData.get("energy_certificate_expiry"),
    usage_license: formData.get("usage_license"),
    insurance_policy: formData.get("insurance_policy"),
    insurance_expiry: formData.get("insurance_expiry"),
    condo_fee_monthly: formData.get("condo_fee_monthly"),
    notes: formData.get("notes"),
    owner_id: formData.get("owner_id"),
  });
}

export async function createProperty(formData: FormData) {
  const { supabase, user, organizationId } = await getOrgContext();

  const parsed = parsePropertyForm(formData);
  if (!parsed.success) {
    redirect(
      "/properties/new?error=" +
        encodeURIComponent(parsed.error.errors[0]?.message ?? "Dados inválidos")
    );
  }

  const { owner_id, ...propertyData } = parsed.data;

  const { data: property, error } = await supabase
    .from("properties")
    .insert({
      ...propertyData,
      organization_id: organizationId,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    redirect("/properties/new?error=" + encodeURIComponent(error.message));
  }

  // Associação opcional ao proprietário (100% por omissão)
  if (owner_id) {
    await supabase.from("owner_properties").insert({
      organization_id: organizationId,
      owner_id,
      property_id: property.id,
      ownership_percentage: 100,
      created_by: user.id,
    });
  }

  revalidatePath("/properties");
  redirect(`/properties/${property.id}`);
}

export async function updateProperty(id: string, formData: FormData) {
  const { supabase, organizationId } = await getOrgContext();

  const parsed = parsePropertyForm(formData);
  if (!parsed.success) {
    redirect(
      `/properties/${id}/edit?error=` +
        encodeURIComponent(parsed.error.errors[0]?.message ?? "Dados inválidos")
    );
  }

  const { owner_id: _ignored, ...propertyData } = parsed.data;

  const { error } = await supabase
    .from("properties")
    .update(propertyData)
    .eq("id", id)
    .eq("organization_id", organizationId);

  if (error) {
    redirect(`/properties/${id}/edit?error=` + encodeURIComponent(error.message));
  }

  revalidatePath("/properties");
  revalidatePath(`/properties/${id}`);
  redirect(`/properties/${id}`);
}

export async function createUnit(propertyId: string, formData: FormData) {
  const { supabase, user, organizationId } = await getOrgContext();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    redirect(
      `/properties/${propertyId}?tab=units&error=` +
        encodeURIComponent("Designação da fração obrigatória")
    );
  }

  const { error } = await supabase.from("property_units").insert({
    organization_id: organizationId,
    property_id: propertyId,
    name,
    internal_code: String(formData.get("internal_code") ?? "") || null,
    unit_type: String(formData.get("unit_type") ?? "apartamento"),
    area_m2: formData.get("area_m2") ? Number(formData.get("area_m2")) : null,
    status: String(formData.get("status") ?? "devoluto"),
    created_by: user.id,
  });

  if (error) {
    redirect(
      `/properties/${propertyId}?tab=units&error=` + encodeURIComponent(error.message)
    );
  }

  revalidatePath(`/properties/${propertyId}`);
  redirect(`/properties/${propertyId}?tab=units`);
}
