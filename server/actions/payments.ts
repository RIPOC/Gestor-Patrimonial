"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getOrgContext } from "@/server/services/org-service";
import { recalcRent } from "@/server/services/payment-service";
import { paymentSchema } from "@/lib/validators";

export async function registerPayment(formData: FormData) {
  const { supabase, user, organizationId } = await getOrgContext();

  const parsed = paymentSchema.safeParse({
    rent_id: formData.get("rent_id"),
    payment_date: formData.get("payment_date"),
    amount: formData.get("amount"),
    method: formData.get("method"),
    reference: formData.get("reference"),
    bank: formData.get("bank"),
    notes: formData.get("notes"),
  });

  const rentId = String(formData.get("rent_id") ?? "");

  if (!parsed.success) {
    redirect(
      `/rents/${rentId}?error=` +
        encodeURIComponent(parsed.error.errors[0]?.message ?? "Dados inválidos")
    );
  }

  // Garantir que a renda pertence à organização e não está anulada
  const { data: rent } = await supabase
    .from("rents")
    .select("id, status")
    .eq("id", parsed.data.rent_id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!rent) {
    redirect("/rents?error=" + encodeURIComponent("Renda não encontrada"));
  }
  if (rent.status === "anulada") {
    redirect(
      `/rents/${rentId}?error=` +
        encodeURIComponent("Não é possível registar pagamentos numa renda anulada")
    );
  }

  const { error } = await supabase.from("rent_payments").insert({
    organization_id: organizationId,
    rent_id: parsed.data.rent_id,
    payment_date: parsed.data.payment_date,
    amount: parsed.data.amount,
    method: parsed.data.method,
    reference: parsed.data.reference,
    bank: parsed.data.bank,
    notes: parsed.data.notes,
    created_by: user.id,
  });

  if (error) {
    redirect(`/rents/${rentId}?error=` + encodeURIComponent(error.message));
  }

  await recalcRent(supabase, parsed.data.rent_id, organizationId);

  revalidatePath(`/rents/${rentId}`);
  revalidatePath("/rents");
  revalidatePath("/payments");
  redirect(`/rents/${rentId}`);
}

export async function deletePayment(paymentId: string, rentId: string) {
  const { supabase, organizationId } = await getOrgContext();

  await supabase
    .from("rent_payments")
    .delete()
    .eq("id", paymentId)
    .eq("organization_id", organizationId);

  await recalcRent(supabase, rentId, organizationId);

  revalidatePath(`/rents/${rentId}`);
  revalidatePath("/rents");
  revalidatePath("/payments");
  redirect(`/rents/${rentId}`);
}

/** Marca a renda como totalmente paga registando um único pagamento pelo valor em dívida. */
export async function markRentPaid(rentId: string) {
  const { supabase, user, organizationId } = await getOrgContext();

  const { data: rent } = await supabase
    .from("rents")
    .select("total_amount, received_amount, status")
    .eq("id", rentId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!rent || rent.status === "anulada") {
    redirect(`/rents/${rentId}?error=` + encodeURIComponent("Operação inválida"));
  }

  const outstanding = Number(rent.total_amount) - Number(rent.received_amount);
  if (outstanding <= 0) {
    redirect(`/rents/${rentId}`);
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  const now = new Date();
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  await supabase.from("rent_payments").insert({
    organization_id: organizationId,
    rent_id: rentId,
    payment_date: today,
    amount: outstanding,
    method: "transferencia",
    notes: "Regularização total",
    created_by: user.id,
  });

  await recalcRent(supabase, rentId, organizationId);

  revalidatePath(`/rents/${rentId}`);
  revalidatePath("/rents");
  revalidatePath("/payments");
  redirect(`/rents/${rentId}`);
}
