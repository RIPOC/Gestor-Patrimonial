"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getOrgContext } from "@/server/services/org-service";
import { tenantSchema } from "@/lib/validators";

function parseTenantForm(formData: FormData) {
  return tenantSchema.safeParse({
    name: formData.get("name"),
    tax_number: formData.get("tax_number"),
    tenant_type: formData.get("tenant_type"),
    address: formData.get("address"),
    postal_code: formData.get("postal_code"),
    city: formData.get("city"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    id_document: formData.get("id_document"),
    iban: formData.get("iban"),
    legal_representative: formData.get("legal_representative"),
    guarantor_name: formData.get("guarantor_name"),
    guarantor_tax_number: formData.get("guarantor_tax_number"),
    guarantor_contact: formData.get("guarantor_contact"),
    notes: formData.get("notes"),
  });
}

export async function createTenant(formData: FormData) {
  const { supabase, user, organizationId } = await getOrgContext();

  const parsed = parseTenantForm(formData);
  if (!parsed.success) {
    redirect(
      "/tenants/new?error=" +
        encodeURIComponent(parsed.error.errors[0]?.message ?? "Dados inválidos")
    );
  }

  const { error } = await supabase.from("tenants").insert({
    ...parsed.data,
    organization_id: organizationId,
    created_by: user.id,
  });

  if (error) {
    redirect("/tenants/new?error=" + encodeURIComponent(error.message));
  }

  revalidatePath("/tenants");
  redirect("/tenants");
}

export async function updateTenant(id: string, formData: FormData) {
  const { supabase, organizationId } = await getOrgContext();

  const parsed = parseTenantForm(formData);
  if (!parsed.success) {
    redirect(
      `/tenants/${id}/edit?error=` +
        encodeURIComponent(parsed.error.errors[0]?.message ?? "Dados inválidos")
    );
  }

  const { error } = await supabase
    .from("tenants")
    .update(parsed.data)
    .eq("id", id)
    .eq("organization_id", organizationId);

  if (error) {
    redirect(`/tenants/${id}/edit?error=` + encodeURIComponent(error.message));
  }

  revalidatePath("/tenants");
  redirect("/tenants");
}
