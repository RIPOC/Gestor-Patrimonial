import { NextRequest } from "next/server";
import { getOrgContext } from "@/server/services/org-service";
import { buildPdfReport, pdfResponse } from "@/lib/pdf";
import { formatCurrency, formatDate } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { supabase, organizationId, organizationName } = await getOrgContext();
  const year = request.nextUrl.searchParams.get("year");

  let query = supabase
    .from("expenses")
    .select("expense_date, description, amount_total, is_tax_deductible, status, properties(name), expense_categories(name)")
    .eq("organization_id", organizationId)
    .order("expense_date");

  if (year) {
    query = query.gte("expense_date", `${year}-01-01`).lte("expense_date", `${year}-12-31`);
  }

  const { data } = await query;
  const rows = (data ?? []).map((e) => {
    const prop = e.properties as unknown as { name: string } | null;
    const cat = e.expense_categories as unknown as { name: string } | null;
    return [
      formatDate(e.expense_date),
      e.description,
      cat?.name ?? "—",
      prop?.name ?? "—",
      formatCurrency(e.amount_total),
      e.is_tax_deductible ? "Sim" : "Não",
      e.status === "pago" ? "Pago" : "Por pagar",
    ];
  });

  const buffer = await buildPdfReport({
    title: `Relatório de Despesas${year ? ` — ${year}` : ""}`,
    subtitle: organizationName,
    columns: [
      { label: "Data", width: 65 },
      { label: "Descrição", width: 140 },
      { label: "Categoria", width: 80 },
      { label: "Imóvel", width: 90 },
      { label: "Valor", width: 60 },
      { label: "Dedutível", width: 55 },
      { label: "Estado", width: 55 },
    ],
    rows,
    footer: `Gerado em ${formatDate(new Date().toISOString())} · Gestor Patrimonial Online`,
  });

  return pdfResponse(`despesas${year ? "_" + year : ""}.pdf`, buffer);
}
