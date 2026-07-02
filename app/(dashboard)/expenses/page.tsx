import Link from "next/link";
import { Wallet, Check, Undo2 } from "lucide-react";
import { getOrgContext } from "@/server/services/org-service";
import { toggleExpensePaid } from "@/server/actions/expenses";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBanner } from "@/components/error-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata = { title: "Despesas" };

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; property?: string; year?: string }>;
}) {
  const { error, property: propertyFilter, year: yearFilter } = await searchParams;
  const { supabase, organizationId } = await getOrgContext();

  let query = supabase
    .from("expenses")
    .select("*, properties(id, name), expense_categories(name)")
    .eq("organization_id", organizationId)
    .order("expense_date", { ascending: false })
    .limit(200);

  if (propertyFilter) query = query.eq("property_id", propertyFilter);
  if (yearFilter) {
    query = query.gte("expense_date", `${yearFilter}-01-01`).lte("expense_date", `${yearFilter}-12-31`);
  }

  const [expensesRes, propertiesRes] = await Promise.all([
    query,
    supabase.from("properties").select("id, name").eq("organization_id", organizationId).order("name"),
  ]);

  const expenses = expensesRes.data ?? [];
  const properties = propertiesRes.data ?? [];
  const total = expenses.reduce((s, e) => s + Number(e.amount_total), 0);
  const unpaid = expenses.filter((e) => e.status === "por_pagar").reduce((s, e) => s + Number(e.amount_total), 0);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i);

  return (
    <div>
      <PageHeader
        title="Despesas"
        description="Despesas por imóvel, fração ou contrato, com classificação fiscal."
        actionLabel="Nova despesa"
        actionHref="/expenses/new"
      />
      <ErrorBanner message={error} />

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="property">Imóvel</Label>
          <Select id="property" name="property" defaultValue={propertyFilter ?? ""} className="w-56">
            <option value="">Todos</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="year">Ano</Label>
          <Select id="year" name="year" defaultValue={yearFilter ?? ""} className="w-32">
            <option value="">Todos</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </Select>
        </div>
        <Button type="submit" variant="outline">Filtrar</Button>
      </form>

      {expenses.length === 0 ? (
        <EmptyState
          icon={<Wallet className="h-10 w-10" />}
          title="Sem despesas"
          description="Registe despesas (IMI, condomínio, obras, seguros...) e anexe faturas no arquivo digital."
          actionLabel="Criar despesa"
          actionHref="/expenses/new"
        />
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            {expenses.length} despesa(s) · Total: <span className="font-semibold text-foreground">{formatCurrency(total)}</span>
            {unpaid > 0 && <> · Por pagar: <span className="font-semibold text-red-600">{formatCurrency(unpaid)}</span></>}
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Imóvel</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Dedutível</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((e) => {
                const prop = e.properties as unknown as { id: string; name: string } | null;
                const cat = e.expense_categories as unknown as { name: string } | null;
                const isPaid = e.status === "pago";
                const toggleAction = toggleExpensePaid.bind(null, e.id, !isPaid);
                return (
                  <TableRow key={e.id}>
                    <TableCell>{formatDate(e.expense_date)}</TableCell>
                    <TableCell>
                      <Link href={`/expenses/${e.id}/edit`} className="font-medium text-primary hover:underline">
                        {e.description}
                      </Link>
                    </TableCell>
                    <TableCell>{cat?.name ?? "—"}</TableCell>
                    <TableCell>{prop?.name ?? "—"}</TableCell>
                    <TableCell>{formatCurrency(e.amount_total)}</TableCell>
                    <TableCell>{e.is_tax_deductible ? "Sim" : "Não"}</TableCell>
                    <TableCell>
                      <Badge tone={isPaid ? "green" : "yellow"}>{isPaid ? "Pago" : "Por pagar"}</Badge>
                    </TableCell>
                    <TableCell>
                      <form action={toggleAction}>
                        <Button variant="ghost" size="sm" type="submit" title={isPaid ? "Marcar por pagar" : "Marcar pago"}>
                          {isPaid ? <Undo2 className="h-4 w-4" /> : <Check className="h-4 w-4 text-green-600" />}
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  );
}
