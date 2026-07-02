import { NextRequest } from "next/server";
import { getOrgContext } from "@/server/services/org-service";
import { buildPdfReport, pdfResponse } from "@/lib/pdf";
import { RENT_STATUS_LABELS, type RentStatus } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { supabase, organizationId, organizationName } = await getOrgContext();
  const year = request.nextUrl.searchParams.get("year");

  let query = supabase
    .from("rents")
    .select("year, month, due_date, total_amount, received_amount, status, properties(name)")
    .eq("organization_id", organizationId)
    .order("year")
    .order("month");

  if (year) query = query.eq("year", Number(year));

  const { data } = await query;
  const rows = (data ?? []).map((r) => {
    const prop = r.properties as unknown as { name: string } | null;
    return [
      prop?.name ?? "—",
      `${String(r.month).padStart(2, "0")}/${r.year}`,
      formatDate(r.due_date),
      formatCurrency(r.total_amount),
      formatCurrency(r.received_amount),
      RENT_STATUS_LABELS[r.status as RentStatus],
    ];
  });

  const buffer = await buildPdfReport({
    title: `Relatório de Rendas${year ? ` — ${year}` : ""}`,
    subtitle: organizationName,
    columns: [
      { label: "Imóvel", width: 160 },
      { label: "Período", width: 60 },
      { label: "Vencimento", width: 80 },
      { label: "Valor", width: 70 },
      { label: "Recebido", width: 70 },
      { label: "Estado", width: 75 },
    ],
    rows,
    footer: `Gerado em ${formatDate(new Date().toISOString())} · Gestor Patrimonial Online`,
  });

  return pdfResponse(`rendas${year ? "_" + year : ""}.pdf`, buffer);
}
