import type { SupabaseClient } from "@supabase/supabase-js";

export interface PendingReceiptRent {
  id: string;
  year: number;
  month: number;
  total_amount: number;
  payment_date: string | null;
  lease_id: string;
  property_name: string | null;
  tenant_names: string;
}

/** Rendas pagas (total ou parcial) que ainda não têm recibo emitido. */
export async function listRentsPendingReceipt(
  supabase: SupabaseClient,
  organizationId: string
): Promise<PendingReceiptRent[]> {
  const { data } = await supabase
    .from("rents")
    .select(
      "id, year, month, total_amount, payment_date, lease_id, properties(name), leases(lease_tenants(tenants(name)))"
    )
    .eq("organization_id", organizationId)
    .in("status", ["paga", "parcialmente_paga"])
    .eq("receipt_issued", false)
    .order("due_date", { ascending: false });

  return (data ?? []).map((r) => {
    const property = r.properties as unknown as { name: string } | null;
    const lease = r.leases as unknown as {
      lease_tenants: { tenants: { name: string } | null }[];
    } | null;
    const tenantNames = (lease?.lease_tenants ?? [])
      .map((lt) => lt.tenants?.name)
      .filter(Boolean)
      .join(", ");
    return {
      id: r.id,
      year: r.year,
      month: r.month,
      total_amount: Number(r.total_amount),
      payment_date: r.payment_date,
      lease_id: r.lease_id,
      property_name: property?.name ?? null,
      tenant_names: tenantNames,
    };
  });
}

/** Sincroniza o espelho do estado do recibo na renda (usado pelo dashboard e listagens). */
export async function markRentReceiptState(
  supabase: SupabaseClient,
  rentId: string,
  organizationId: string,
  params: { issued: boolean; atReceiptNumber: string | null }
) {
  await supabase
    .from("rents")
    .update({
      receipt_issued: params.issued,
      at_receipt_number: params.atReceiptNumber,
    })
    .eq("id", rentId)
    .eq("organization_id", organizationId);
}
