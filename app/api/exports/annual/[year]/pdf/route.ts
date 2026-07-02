import { getOrgContext } from "@/server/services/org-service";
import { getAnnualClosing } from "@/server/services/report-service";
import { buildPdfReport, pdfResponse } from "@/lib/pdf";
import { formatCurrency, formatDate } from "@/lib/utils";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ year: string }> }
) {
  const { year } = await params;
  const { supabase, organizationId, organizationName } = await getOrgContext();

  const rows = await getAnnualClosing(supabase, organizationId, Number(year));

  const buffer = await buildPdfReport({
    title: `Fecho Fiscal Anual — ${year}`,
    subtitle: `${organizationName} · Mapa de apoio ao Anexo F`,
    columns: [
      { label: "Proprietário", width: 160 },
      { label: "Rendas recebidas", width: 90 },
      { label: "Despesas", width: 80 },
      { label: "Resultado líquido", width: 90 },
      { label: "Recibos emitidos", width: 75 },
      { label: "Recibos por emitir", width: 75 },
    ],
    rows: rows.map((r) => [
      r.owner_name,
      formatCurrency(r.rents_total),
      formatCurrency(r.expenses_total),
      formatCurrency(r.net_result),
      r.receipts_issued,
      r.receipts_pending,
    ]),
    footer: `Gerado em ${formatDate(new Date().toISOString())} · Documento de apoio — não substitui a declaração fiscal oficial.`,
  });

  return pdfResponse(`fecho_fiscal_${year}.pdf`, buffer);
}
