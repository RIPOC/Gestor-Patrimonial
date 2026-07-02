import { NextRequest } from "next/server";
import { getOrgContext } from "@/server/services/org-service";
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET(request: NextRequest) {
  const { supabase, organizationId } = await getOrgContext();
  const year = request.nextUrl.searchParams.get("year");

  let query = supabase
    .from("expenses")
    .select("expense_date, description, amount_net, vat_amount, amount_total, is_tax_deductible, status, supplier_name, supplier_tax_number, properties(name), expense_categories(name)")
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
      e.expense_date,
      e.description,
      cat?.name ?? "",
      prop?.name ?? "",
      e.supplier_name ?? "",
      e.supplier_tax_number ?? "",
      e.amount_net != null ? Number(e.amount_net).toFixed(2) : "",
      Number(e.vat_amount).toFixed(2),
      Number(e.amount_total).toFixed(2),
      e.is_tax_deductible ? "Sim" : "Não",
      e.status === "pago" ? "Pago" : "Por pagar",
    ];
  });

  const csv = toCsv(
    ["Data", "Descrição", "Categoria", "Imóvel", "Fornecedor", "NIF", "Valor s/IVA", "IVA", "Total", "Dedutível", "Estado"],
    rows
  );

  return csvResponse(`despesas${year ? "_" + year : ""}.csv`, csv);
}
