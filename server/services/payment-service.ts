import type { SupabaseClient } from "@supabase/supabase-js";
import type { RentStatus } from "@/lib/types";

/**
 * Recalcula o estado de uma renda a partir da soma dos pagamentos registados.
 * Regras de negócio (secção 34):
 *  - pagamento parcial => 'parcialmente_paga' e atualiza saldo;
 *  - renda totalmente paga => 'paga' com data de pagamento;
 *  - renda vencida sem pagamento => 'em_atraso'.
 * Nunca sobrepõe estados manuais 'anulada' ou 'em_litigio'.
 */
export async function recalcRent(
  supabase: SupabaseClient,
  rentId: string,
  organizationId: string
) {
  const { data: rent } = await supabase
    .from("rents")
    .select("id, total_amount, due_date, status")
    .eq("id", rentId)
    .eq("organization_id", organizationId)
    .single();

  if (!rent) return;
  if (rent.status === "anulada" || rent.status === "em_litigio") return;

  const { data: payments } = await supabase
    .from("rent_payments")
    .select("amount, payment_date")
    .eq("rent_id", rentId)
    .order("payment_date", { ascending: false });

  const list = payments ?? [];
  const received = list.reduce((sum, p) => sum + Number(p.amount), 0);
  const total = Number(rent.total_amount);

  const pad = (n: number) => String(n).padStart(2, "0");
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const isOverdue = rent.due_date < todayStr;

  let status: RentStatus;
  let paymentDate: string | null = null;

  if (received <= 0) {
    status = isOverdue ? "em_atraso" : "por_cobrar";
  } else if (received < total) {
    status = "parcialmente_paga";
  } else {
    status = "paga";
    paymentDate = list[0]?.payment_date ?? todayStr;
  }

  await supabase
    .from("rents")
    .update({
      received_amount: received,
      status,
      payment_date: paymentDate,
    })
    .eq("id", rentId)
    .eq("organization_id", organizationId);
}
