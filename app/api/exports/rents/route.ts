import { NextRequest } from "next/server";
import { getOrgContext } from "@/server/services/org-service";
import { toCsv, csvResponse } from "@/lib/csv";
import { RENT_STATUS_LABELS, type RentStatus } from "@/lib/types";

export async function GET(request: NextRequest) {
  const { supabase, organizationId } = await getOrgContext();
  const year = request.nextUrl.searchParams.get("year");

  let query = supabase
    .from("rents")
    .select("year, month, due_date, total_amount, received_amount, status, properties(name), leases(lease_tenants(tenants(name)))")
    .eq("organization_id", organizationId)
    .order("year")
    .order("month");

  if (year) query = query.eq("year", Number(year));

  const { data } = await query;
  const rows = (data ?? []).map((r) => {
    const prop = r.properties as unknown as { name: string } | null;
    const lease = r.leases as unknown as {
      lease_tenants: { tenants: { name: string } | null }[];
    } | null;
    const tenants = (lease?.lease_tenants ?? [])
      .map((lt) => lt.tenants?.name)
      .filter(Boolean)
      .join(", ");
    const total = Number(r.total_amount);
    const received = Number(r.received_amount);
    return [
      prop?.name ?? "",
      tenants,
      r.year,
      String(r.month).padStart(2, "0"),
      r.due_date,
      total.toFixed(2),
      received.toFixed(2),
      (total - received).toFixed(2),
      RENT_STATUS_LABELS[r.status as RentStatus],
    ];
  });

  const csv = toCsv(
    ["Imóvel", "Inquilino(s)", "Ano", "Mês", "Vencimento", "Valor", "Recebido", "Em dívida", "Estado"],
    rows
  );

  return csvResponse(`rendas${year ? "_" + year : ""}.csv`, csv);
}
