import Link from "next/link";
import { Download } from "lucide-react";
import { getOrgContext } from "@/server/services/org-service";
import { getAnnualClosing } from "@/server/services/report-service";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Fecho Fiscal Anual" };

export default async function AnnualClosingPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year } = await params;
  const { supabase, organizationId } = await getOrgContext();

  const rows = await getAnnualClosing(supabase, organizationId, Number(year));

  const totals = rows.reduce(
    (acc, r) => ({
      rents: acc.rents + r.rents_total,
      expenses: acc.expenses + r.expenses_total,
      net: acc.net + r.net_result,
      pending: acc.pending + r.receipts_pending,
    }),
    { rents: 0, expenses: 0, net: 0, pending: 0 }
  );

  return (
    <div>
      <PageHeader title={`Fecho Fiscal Anual — ${year}`} description="Mapa de apoio ao Anexo F, por proprietário.">
        <Link href="/reports">
          <Button variant="outline">← Relatórios</Button>
        </Link>
        <a href={`/api/exports/annual/${year}/pdf`}>
          <Button><Download className="h-4 w-4" /> Exportar PDF</Button>
        </a>
      </PageHeader>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem movimentos para {year}.</p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proprietário</TableHead>
                <TableHead>Rendas recebidas</TableHead>
                <TableHead>Despesas</TableHead>
                <TableHead>Resultado líquido</TableHead>
                <TableHead>Recibos emitidos</TableHead>
                <TableHead>Recibos por emitir</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.owner_id ?? "none"}>
                  <TableCell className="font-medium">{r.owner_name}</TableCell>
                  <TableCell>{formatCurrency(r.rents_total)}</TableCell>
                  <TableCell>{formatCurrency(r.expenses_total)}</TableCell>
                  <TableCell className={r.net_result >= 0 ? "text-green-600" : "text-red-600"}>
                    {formatCurrency(r.net_result)}
                  </TableCell>
                  <TableCell>{r.receipts_issued}</TableCell>
                  <TableCell className={r.receipts_pending > 0 ? "font-medium text-amber-600" : ""}>
                    {r.receipts_pending}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-4 text-sm text-muted-foreground">
            Totais: rendas {formatCurrency(totals.rents)} · despesas {formatCurrency(totals.expenses)} ·
            resultado <span className={totals.net >= 0 ? "text-green-600" : "text-red-600"}>{formatCurrency(totals.net)}</span>
            {totals.pending > 0 && <> · <span className="text-amber-600">{totals.pending} recibo(s) por emitir</span></>}
          </p>
        </>
      )}
    </div>
  );
}
