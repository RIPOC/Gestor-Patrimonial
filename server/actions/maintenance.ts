"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getOrgContext } from "@/server/services/org-service";
import { maintenanceSchema } from "@/lib/validators";

function parseMaintenanceForm(formData: FormData) {
  return maintenanceSchema.safeParse({
    property_id: formData.get("property_id"),
    unit_id: formData.get("unit_id"),
    lease_id: formData.get("lease_id"),
    tenant_id: formData.get("tenant_id"),
    supplier_id: formData.get("supplier_id"),
    title: formData.get("title"),
    description: formData.get("description"),
    priority: formData.get("priority"),
    status: formData.get("status"),
    opened_at: formData.get("opened_at"),
    expected_date: formData.get("expected_date"),
    estimated_cost: formData.get("estimated_cost"),
    actual_cost: formData.get("actual_cost"),
    notes: formData.get("notes"),
  });
}

export async function createMaintenanceCase(formData: FormData) {
  const { supabase, user, organizationId } = await getOrgContext();

  const parsed = parseMaintenanceForm(formData);
  if (!parsed.success) {
    redirect(
      "/maintenance/new?error=" +
        encodeURIComponent(parsed.error.errors[0]?.message ?? "Dados inválidos")
    );
  }

  const { data: created, error } = await supabase
    .from("maintenance_cases")
    .insert({
      ...parsed.data,
      unit_id: parsed.data.unit_id || null,
      lease_id: parsed.data.lease_id || null,
      tenant_id: parsed.data.tenant_id || null,
      supplier_id: parsed.data.supplier_id || null,
      organization_id: organizationId,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    redirect("/maintenance/new?error=" + encodeURIComponent(error.message));
  }

  revalidatePath("/maintenance");
  redirect(`/maintenance/${created.id}`);
}

export async function updateMaintenanceCase(id: string, formData: FormData) {
  const { supabase, organizationId } = await getOrgContext();

  const parsed = parseMaintenanceForm(formData);
  if (!parsed.success) {
    redirect(
      `/maintenance/${id}/edit?error=` +
        encodeURIComponent(parsed.error.errors[0]?.message ?? "Dados inválidos")
    );
  }

  const completedAt =
    parsed.data.status === "concluida"
      ? new Date().toISOString().slice(0, 10)
      : null;

  const { error } = await supabase
    .from("maintenance_cases")
    .update({
      ...parsed.data,
      unit_id: parsed.data.unit_id || null,
      lease_id: parsed.data.lease_id || null,
      tenant_id: parsed.data.tenant_id || null,
      supplier_id: parsed.data.supplier_id || null,
      completed_at: completedAt,
    })
    .eq("id", id)
    .eq("organization_id", organizationId);

  if (error) {
    redirect(`/maintenance/${id}/edit?error=` + encodeURIComponent(error.message));
  }

  revalidatePath("/maintenance");
  revalidatePath(`/maintenance/${id}`);
  redirect(`/maintenance/${id}`);
}

export async function updateMaintenanceStatus(id: string, status: string) {
  const { supabase, organizationId } = await getOrgContext();

  const completedAt = status === "concluida" ? new Date().toISOString().slice(0, 10) : null;

  await supabase
    .from("maintenance_cases")
    .update({ status, completed_at: completedAt })
    .eq("id", id)
    .eq("organization_id", organizationId);

  revalidatePath("/maintenance");
  revalidatePath(`/maintenance/${id}`);
  redirect(`/maintenance/${id}`);
}
