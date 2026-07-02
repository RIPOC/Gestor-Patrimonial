"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getOrgContext } from "@/server/services/org-service";
import { expenseSchema } from "@/lib/validators";

type ExpenseData = z.infer<typeof expenseSchema>;

function parseExpenseForm(formData: FormData) {
  return expenseSchema.safeParse({
    property_id: formData.get("property_id"),
    unit_id: formData.get("unit_id"),
    lease_id: formData.get("lease_id"),
    category_id: formData.get("category_id"),
    supplier_id: formData.get("supplier_id"),
    supplier_name: formData.get("supplier_name"),
    supplier_tax_number: formData.get("supplier_tax_number"),
    expense_date: formData.get("expense_date"),
    description: formData.get("description"),
    amount_net: formData.get("amount_net"),
    vat_amount: formData.get("vat_amount"),
    amount_total: formData.get("amount_total"),
    is_tax_deductible: formData.get("is_tax_deductible"),
    status: formData.get("status"),
    payment_date: formData.get("payment_date"),
  });
}

function normalize(data: ExpenseData) {
  return {
    ...data,
    property_id: data.property_id || null,
    unit_id: data.unit_id || null,
    lease_id: data.lease_id || null,
    category_id: data.category_id || null,
    supplier_id: data.supplier_id || null,
    payment_date: data.status === "pago" ? data.payment_date || null : null,
  };
}

export async function createExpense(formData: FormData) {
  const { supabase, user, organizationId } = await getOrgContext();

  const parsed = parseExpenseForm(formData);
  if (!parsed.success) {
    redirect(
      "/expenses/new?error=" +
        encodeURIComponent(parsed.error.errors[0]?.message ?? "Dados inválidos")
    );
  }

  const { error } = await supabase.from("expenses").insert({
    ...normalize(parsed.data),
    organization_id: organizationId,
    created_by: user.id,
  });

  if (error) {
    redirect("/expenses/new?error=" + encodeURIComponent(error.message));
  }

  revalidatePath("/expenses");
  redirect("/expenses");
}

export async function updateExpense(id: string, formData: FormData) {
  const { supabase, organizationId } = await getOrgContext();

  const parsed = parseExpenseForm(formData);
  if (!parsed.success) {
    redirect(
      `/expenses/${id}/edit?error=` +
        encodeURIComponent(parsed.error.errors[0]?.message ?? "Dados inválidos")
    );
  }

  const { error } = await supabase
    .from("expenses")
    .update(normalize(parsed.data))
    .eq("id", id)
    .eq("organization_id", organizationId);

  if (error) {
    redirect(`/expenses/${id}/edit?error=` + encodeURIComponent(error.message));
  }

  revalidatePath("/expenses");
  redirect("/expenses");
}

export async function toggleExpensePaid(id: string, paid: boolean) {
  const { supabase, organizationId } = await getOrgContext();

  const pad = (n: number) => String(n).padStart(2, "0");
  const now = new Date();
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  await supabase
    .from("expenses")
    .update({
      status: paid ? "pago" : "por_pagar",
      payment_date: paid ? today : null,
    })
    .eq("id", id)
    .eq("organization_id", organizationId);

  revalidatePath("/expenses");
}

export async function deleteExpense(id: string) {
  const { supabase, organizationId } = await getOrgContext();

  await supabase
    .from("expenses")
    .delete()
    .eq("id", id)
    .eq("organization_id", organizationId);

  revalidatePath("/expenses");
  redirect("/expenses");
}
