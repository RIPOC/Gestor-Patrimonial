import { getOrgContext } from "@/server/services/org-service";
import { toCsv, csvResponse } from "@/lib/csv";
import { RECEIPT_STATUS_LABELS, type ReceiptStatus } from "@/lib/types";

export async function GET() {
  const { supabase, organizationId } = await getOrgContext();

  const { data } = await supabase
    .from("receipts")
    .select(
      "period_start, period_end, amount, at_receipt_number, status, received_date, rents(properties(name)), leases(lease_tenants(tenants(name)))"
    )
    .eq("organization_id", organizationId)
    .order("period_start");

  const rows = (data ?? []).map((r) => {
    const rent = r.rents as unknown as { properties: { name: string } | null } | null;
    const lease = r.leases as unknown as {
      lease_tenants: { tenants: { name: string } | null }[];
    } | null;
    const tenantNames = (lease?.lease_tenants ?? [])
      .map((lt) => lt.tenants?.name)
      .filter(Boolean)
      .join(", ");
    return [
      rent?.properties?.name ?? "",
      tenantNames,
      r.period_start,
      r.period_end,
      Number(r.amount).toFixed(2),
      r.at_receipt_number ?? "",
      r.received_date ?? "",
      RECEIPT_STATUS_LABELS[r.status as ReceiptStatus],
    ];
  });

  const csv = toCsv(
    ["Imóvel", "Inquilino(s)", "Início período", "Fim período", "Valor", "N.º recibo AT", "Data recebimento", "Estado"],
    rows
  );

  return csvResponse("recibos.csv", csv);
}
