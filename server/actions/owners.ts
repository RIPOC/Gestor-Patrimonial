"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getOrgContext } from "@/server/services/org-service";
import { ownerSchema } from "@/lib/validators";

function parseOwnerForm(formData: FormData) {
  return ownerSchema.safeParse({
    name: formData.get("name"),
    tax_number: formData.get("tax_number"),
    owner_type: formData.get("owner_type"),
    address: formData.get("address"),
    postal_code: formData.get("postal_code"),
    city: formData.get("city"),
    country: formData.get("country"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    iban: formData.get("iban"),
    tax_regime: formData.get("tax_regime"),
    notes: formData.get("notes"),
  });
}

export async function createOwner(formData: FormData) {
  const { supabase, user, organizationId } = await getOrgContext();

  const parsed = parseOwnerForm(formData);
  if (!parsed.success) {
    redirect(
      "/owners/new?error=" +
        encodeURIComponent(parsed.error.errors[0]?.message ?? "Dados inválidos")
    );
  }

  const { error } = await supabase.from("owners").insert({
    ...parsed.data,
    organization_id: organizationId,
    created_by: user.id,
  });

  if (error) {
    redirect("/owners/new?error=" + encodeURIComponent(error.message));
  }

  revalidatePath("/owners");
  redirect("/owners");
}

export async function updateOwner(id: string, formData: FormData) {
  const { supabase, organizationId } = await getOrgContext();

  const parsed = parseOwnerForm(formData);
  if (!parsed.success) {
    redirect(
      `/owners/${id}/edit?error=` +
        encodeURIComponent(parsed.error.errors[0]?.message ?? "Dados inválidos")
    );
  }

  const { error } = await supabase
    .from("owners")
    .update(parsed.data)
    .eq("id", id)
    .eq("organization_id", organizationId);

  if (error) {
    redirect(`/owners/${id}/edit?error=` + encodeURIComponent(error.message));
  }

  revalidatePath("/owners");
  redirect("/owners");
}

export async function toggleOwnerActive(id: string, isActive: boolean) {
  const { supabase, organizationId } = await getOrgContext();

  await supabase
    .from("owners")
    .update({ is_active: isActive })
    .eq("id", id)
    .eq("organization_id", organizationId);

  revalidatePath("/owners");
}
