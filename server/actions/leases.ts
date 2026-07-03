"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getOrgContext } from "@/server/services/org-service";
import { generateRentsForLease } from "@/server/services/rent-service";
import { leaseSchema } from "@/lib/validators";

export async function createLease(formData: FormData) {
  const { supabase, user, organizationId } = await getOrgContext();

  const parsed = leaseSchema.safeParse({
    property_id: formData.get("property_id"),
    unit_id: formData.get("unit_id"),
    owner_id: formData.get("owner_id"),
    tenant_id: formData.get("tenant_id"),
    lease_type: formData.get("lease_type"),
    start_date: formData.get("start_date"),
    end_date: formData.get("end_date"),
    auto_renewal: formData.get("auto_renewal"),
    renewal_months: formData.get("renewal_months"),
    initial_rent: formData.get("initial_rent"),
    due_day: formData.get("due_day"),
    deposit_amount: formData.get("deposit_amount"),
    withholding_tax: formData.get("withholding_tax"),
    vat: formData.get("vat"),
    reported_to_at: formData.get("reported_to_at"),
    at_contract_number: formData.get("at_contract_number"),
    status: formData.get("status"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    redirect(
      "/leases/new?error=" +
        encodeURIComponent(parsed.error.errors[0]?.message ?? "Dados inválidos")
    );
  }

  const { tenant_id, ...leaseData } = parsed.data;

  const { data: lease, error } = await supabase
    .from("leases")
    .insert({
      ...leaseData,
      unit_id: leaseData.unit_id || null,
      owner_id: leaseData.owner_id || null,
      current_rent: leaseData.initial_rent,
      organization_id: organizationId,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    redirect("/leases/new?error=" + encodeURIComponent(error.message));
  }

  // Associar inquilino principal
  const { error: tenantError } = await supabase.from("lease_tenants").insert({
    organization_id: organizationId,
    lease_id: lease.id,
    tenant_id,
    is_primary: true,
    created_by: user.id,
  });

  if (tenantError) {
    redirect("/leases/new?error=" + encodeURIComponent(tenantError.message));
  }

  // Regra de negócio: contrato ativo gera rendas mensais e marca imóvel arrendado
  if (parsed.data.status === "ativo") {
    await generateRentsForLease(supabase, {
      organizationId,
      leaseId: lease.id,
      propertyId: parsed.data.property_id,
      unitId: parsed.data.unit_id || null,
      ownerId: parsed.data.owner_id || null,
      startDate: parsed.data.start_date,
      endDate: parsed.data.end_date ?? null,
      rentAmount: parsed.data.initial_rent,
      dueDay: parsed.data.due_day,
      createdBy: user.id,
    });

    await supabase
      .from("properties")
      .update({ status: "arrendado" })
      .eq("id", parsed.data.property_id)
      .eq("organization_id", organizationId);
  }

  revalidatePath("/leases");
  revalidatePath("/rents");
  redirect(`/leases/${lease.id}`);
}

export async function terminateLease(id: string) {
  const { supabase, organizationId } = await getOrgContext();

  const { data: lease } = await supabase
    .from("leases")
    .select("property_id")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .single();

  await supabase
    .from("leases")
    .update({ status: "terminado", end_date: new Date().toISOString().slice(0, 10) })
    .eq("id", id)
    .eq("organization_id", organizationId);

  // Anular rendas futuras ainda não cobradas
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  await supabase
    .from("rents")
    .update({ status: "anulada" })
    .eq("lease_id", id)
    .eq("organization_id", organizationId)
    .in("status", ["prevista", "por_cobrar"])
    .gt("due_date", todayStr);

  // Se não houver outro contrato ativo, o imóvel fica devoluto
  if (lease) {
    const { count } = await supabase
      .from("leases")
      .select("id", { count: "exact", head: true })
      .eq("property_id", lease.property_id)
      .eq("status", "ativo");

    if (!count) {
      await supabase
        .from("properties")
        .update({ status: "devoluto" })
        .eq("id", lease.property_id)
        .eq("organization_id", organizationId);
    }
  }

  revalidatePath("/leases");
  revalidatePath(`/leases/${id}`);
  redirect(`/leases/${id}`);
}

export async function deleteLease(id: string) {
  const { supabase, organizationId } = await getOrgContext();

  const { data: lease } = await supabase
    .from("leases")
    .select("property_id")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .single();

  const { error } = await supabase
    .from("leases")
    .delete()
    .eq("id", id)
    .eq("organization_id", organizationId);

  if (error) {
    const message =
      error.code === "23503"
        ? "Não é possível eliminar: existem recibos ou ocorrências associados a este contrato. Elimine ou desassocie esses registos primeiro."
        : error.message;
    redirect(`/leases/${id}?error=` + encodeURIComponent(message));
  }

  // Se não houver outro contrato ativo, o imóvel fica devoluto
  if (lease) {
    const { count } = await supabase
      .from("leases")
      .select("id", { count: "exact", head: true })
      .eq("property_id", lease.property_id)
      .eq("status", "ativo");

    if (!count) {
      await supabase
        .from("properties")
        .update({ status: "devoluto" })
        .eq("id", lease.property_id)
        .eq("organization_id", organizationId);
    }
  }

  revalidatePath("/leases");
  redirect("/leases");
}
