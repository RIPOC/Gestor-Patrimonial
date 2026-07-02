import Link from "next/link";
import { CreditCard } from "lucide-react";
import { getOrgContext } from "@/server/services/org-service";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata = { title: "Pagamentos" };

const PAYMENT_METHODS: Record<string, string> = {
  transferencia: "Transferência",
  numerario: "Numerário",
  cheque: "Cheque",
  debito_direto: "Débito direto",
  multibanco: "Multibanco",
  mbway: "MB Way",
  outro: "Outro",
};

export default async function PaymentsPage() {
  const { supabase, organizationId } = await getOrgContext();

  const { data: payments } = await supabase
    .from("rent_payments")
    .select("*, rents(id, year, month, properties(name))")
    .eq("organization_id", organizationId)
    .order("payment_date", { ascending: false })
    .limit(100);

  const list = payments ?? [];
  const total = list.reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div>
      <PageHeader
        title="Pagamentos"
        description="Todos os pagamentos registados nas rendas."
      />

      {list.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="h-10 w-10" />}
          title="Sem pagamentos"
          description="Os pagamentos são registados a partir do detalhe de cada renda."
          actionLabel="Ver rendas"
          actionHref="/rents"
        />
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            {list.length} pagamento(s) · Total: <span className="font-semibold text-foreground">{formatCurrency(total)}</span>
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Imóvel</TableHead>
                <TableHead>Renda</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Referência</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((p) => {
                const rent = p.rents as unknown as {
                  id: string; year: number; month: number; properties: { name: string } | null;
                } | null;
                return (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.payment_date)}</TableCell>
                    <TableCell>{rent?.properties?.name ?? "—"}</TableCell>
                    <TableCell>
                      {rent ? (
                        <Link href={`/rents/${rent.id}`} className="text-primary hover:underline">
                          {String(rent.month).padStart(2, "0")}/{rent.year}
                        </Link>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="font-medium">{formatCurrency(p.amount)}</TableCell>
                    <TableCell>{PAYMENT_METHODS[p.method] ?? p.method}</TableCell>
                    <TableCell>{p.reference ?? "—"}</TableCell>
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
