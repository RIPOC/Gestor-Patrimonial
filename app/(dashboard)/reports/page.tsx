import Link from "next/link";
import { Download, FileText } from "lucide-react";
import { getOrgContext } from "@/server/services/org-service";
import {
  listLeasesEndingSoon,
  listVacantProperties,
  listTenantsWithDebt,
  listExpensesWithoutDocument,
} from "@/server/services/report-service";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata = { title: "Relatórios" };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: yearParam } = await searchParams;
  const { supabase, organizationId } = await getOrgContext();

  const currentYear = new Date().getFullYear();
  const year = Number(yearParam) || currentYear;
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i);

  const [
    rentsRes,
    expensesRes,
    leasesEnding,
    vacantProperties,
    tenantsWithDebt,
    expensesWithoutDoc,
  ] = await Promise.all([
    supabase
      .from("rents")
      .select("total_amount, received_amount, status, properties(name)")
      .eq("organization_id", organizationId)
      .eq("year", year)
      .neq("status", "anulada"),
    supabase
      .from("expenses")
      .select("amount_total, is_tax_deductible, properties(name)")
      .eq("organization_id", organizationId)
      .gte("expense_date", `${year}-01-01`)
      .lte("expense_date", `${year}-12-31`),
    listLeasesEndingSoon(supabase, organizationId, 90),
    listVacantProperties(supabase, organizationId),
    listTenantsWithDebt(supabase, organizationId),
    listExpensesWithoutDocument(supabase, organizationId),
  ]);

  const rents = rentsRes.data ?? [];
  const expenses = expensesRes.data ?? [];

  const totalBilled = rents.reduce((s, r) => s + Number(r.total_amount), 0);
  const totalReceived = rents.reduce((s, r) => s + Number(r.received_amount), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount_total), 0);
  const deductibleExpenses = expenses
    .filter((e) => e.is_tax_deductible)
    .reduce((s, e) => s + Number(e.amount_total), 0);
  const netResult = totalReceived - totalExpenses;

  const byProperty = new Map<string, { received: number; expenses: number }>();
  for (const r of rents) {
    const name = (r.properties as unknown as { name: string } | null)?.name ?? "(sem imóvel)";
    const e = byProperty.get(name) ?? { received: 0, expenses: 0 };
    e.received += Number(r.received_amount);
    byProperty.set(name, e);
  }
  for (const ex of expenses) {
    const name = (ex.properties as unknown as { name: string } | null)?.name ?? "(sem imóvel)";
    const e = byProperty.get(name) ?? { received: 0, expenses: 0 };
    e.expenses += Number(ex.amount_total);
    byProperty.set(name, e);
  }
  const propertyRows = [...byProperty.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div>
      <PageHeader
        title="Relatórios e Exportações"
        description="Mapa anual de apoio ao IRS (Anexo F) e exportações para o contabilista."
      >
        <Link href={`/reports/annual/${year}`}>
          <Button variant="outline"><FileText className="h-4 w-4" /> Fecho fiscal anual</Button>
        </Link>
      </PageHeader>

      <form method="get" className="mb-6 flex items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="year">Ano fiscal</Label>
          <Select id="year" name="year" defaultValue={String(year)} className="w-32">
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </Select>
        </div>
        <Button type="submit" variant="outline">Ver ano</Button>
      </form>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-0"><CardTitle className="text-sm text-muted-foreground">Rendas recebidas</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">{formatCurrency(totalReceived)}</div>
            <p className="text-xs text-muted-foreground">Faturado: {formatCurrency(totalBilled)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-0"><CardTitle className="text-sm text-muted-foreground">Despesas</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-amber-600">{formatCurrency(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">Dedutíveis: {formatCurrency(deductibleExpenses)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-0"><CardTitle className="text-sm text-muted-foreground">Resultado líquido</CardTitle></CardHeader>
          <CardContent><div className={`text-2xl font-bold ${netResult >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(netResult)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Exportações</CardTitle>
            <CardDescription>Excel (CSV) e PDF</CardDescription></CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <a href={`/api/exports/rents?year=${year}`}>
              <Button variant="outline" size="sm" className="w-full justify-start"><Download className="h-4 w-4" /> Rendas CSV</Button>
            </a>
            <a href={`/api/exports/rents/pdf?year=${year}`}>
              <Button variant="outline" size="sm" className="w-full justify-start"><Download className="h-4 w-4" /> Rendas PDF</Button>
            </a>
            <a href={`/api/exports/expenses?year=${year}`}>
              <Button variant="outline" size="sm" className="w-full justify-start"><Download className="h-4 w-4" /> Despesas CSV</Button>
            </a>
            <a href={`/api/exports/expenses/pdf?year=${year}`}>
              <Button variant="outline" size="sm" className="w-full justify-start"><Download className="h-4 w-4" /> Despesas PDF</Button>
            </a>
          </CardContent>
        </Card>
      </div>

      <h2 className="mb-3 text-base font-semibold">Mapa por imóvel — {year} (apoio ao Anexo F)</h2>
      {propertyRows.length === 0 ? (
        <p className="mb-8 text-sm text-muted-foreground">Sem dados para o ano selecionado.</p>
      ) : (
        <Table className="mb-8">
          <TableHeader>
            <TableRow>
              <TableHead>Imóvel</TableHead>
              <TableHead>Rendas recebidas</TableHead>
              <TableHead>Despesas</TableHead>
              <TableHead>Resultado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {propertyRows.map(([name, v]) => (
              <TableRow key={name}>
                <TableCell className="font-medium">{name}</TableCell>
                <TableCell>{formatCurrency(v.received)}</TableCell>
                <TableCell>{formatCurrency(v.expenses)}</TableCell>
                <TableCell className={v.received - v.expenses >= 0 ? "text-green-600" : "text-red-600"}>
                  {formatCurrency(v.received - v.expenses)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-base font-semibold">
            Contratos a terminar (90 dias) <span className="text-muted-foreground font-normal">({leasesEnding.length})</span>
          </h2>
          {leasesEnding.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem contratos a terminar em breve.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {leasesEnding.map((l) => (
                <li key={l.id} className="flex justify-between border-b border-border py-1.5">
                  <span>{l.property_name} — {l.tenant_names}</span>
                  <span className="text-muted-foreground">{formatDate(l.end_date)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold">
            Imóveis devolutos <span className="text-muted-foreground font-normal">({vacantProperties.length})</span>
          </h2>
          {vacantProperties.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem imóveis devolutos.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {vacantProperties.map((p) => (
                <li key={p.id} className="border-b border-border py-1.5">
                  <Link href={`/properties/${p.id}`} className="text-primary hover:underline">{p.name}</Link>
                  {p.municipality && <span className="text-muted-foreground"> — {p.municipality}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold">
            Inquilinos com dívida <span className="text-muted-foreground font-normal">({tenantsWithDebt.length})</span>
          </h2>
          {tenantsWithDebt.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem inquilinos com dívida.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {tenantsWithDebt.map((t) => (
                <li key={t.id} className="flex justify-between border-b border-border py-1.5">
                  <span>{t.name}</span>
                  <span className="font-medium text-red-600">{formatCurrency(t.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold">
            Despesas sem documento <span className="text-muted-foreground font-normal">({expensesWithoutDoc.length})</span>
          </h2>
          {expensesWithoutDoc.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todas as despesas têm documento associado.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {expensesWithoutDoc.slice(0, 10).map((e) => (
                <li key={e.id} className="flex justify-between border-b border-border py-1.5">
                  <Link href={`/expenses/${e.id}/edit`} className="text-primary hover:underline">{e.description}</Link>
                  <span className="text-muted-foreground">{formatCurrency(e.amount_total)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
