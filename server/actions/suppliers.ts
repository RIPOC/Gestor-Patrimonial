"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getOrgContext } from "@/server/services/org-service";
import { supplierSchema } from "@/lib/validators";

function parseSupplierForm(formData: FormData) {
  return supplierSchema.safeParse({
    name: formData.get("name"),
    tax_number: formData.get("tax_number"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    iban: formData.get("iban"),
    notes: formData.get("notes"),
  });
}

export async function createSupplier(formData: FormData) {
  const { supabase, user, organizationId } = await getOrgContext();

  const parsed = parseSupplierForm(formData);
  if (!parsed.success) {
    redirect(
      "/expenses/suppliers/new?error=" +
        encodeURIComponent(parsed.error.errors[0]?.message ?? "Dados inválidos")
    );
  }

  const { error } = await supabase.from("suppliers").insert({
    ...parsed.data,
    organization_id: organizationId,
    created_by: user.id,
  });

  if (error) {
    redirect("/expenses/suppliers/new?error=" + encodeURIComponent(error.message));
  }

  revalidatePath("/expenses/suppliers");
  redirect("/expenses/suppliers");
}

export async function updateSupplier(id: string, formData: FormData) {
  const { supabase, organizationId } = await getOrgContext();

  const parsed = parseSupplierForm(formData);
  if (!parsed.success) {
    redirect(
      `/expenses/suppliers/${id}/edit?error=` +
        encodeURIComponent(parsed.error.errors[0]?.message ?? "Dados inválidos")
    );
  }

  const { error } = await supabase
    .from("suppliers")
    .update(parsed.data)
    .eq("id", id)
    .eq("organization_id", organizationId);

  if (error) {
    redirect(`/expenses/suppliers/${id}/edit?error=` + encodeURIComponent(error.message));
  }

  revalidatePath("/expenses/suppliers");
  redirect("/expenses/suppliers");
}

export async function toggleSupplierActive(id: string, isActive: boolean) {
  const { supabase, organizationId } = await getOrgContext();

  await supabase
    .from("suppliers")
    .update({ is_active: isActive })
    .eq("id", id)
    .eq("organization_id", organizationId);

  revalidatePath("/expenses/suppliers");
}
