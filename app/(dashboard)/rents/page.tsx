import { getOrgContext } from "@/server/services/org-service";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { RentStatusBadge } from "@/components/status-badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Euro } from "lucide-react";
import Link from "next/link";
import type { RentStatus } from "@/lib/types";

export const metadata = { title: "Rendas" };

export default async function RentsPage() {
  const { supabase, organizationId } = await getOrgContext();

  const { data: rents } = await supabase
    .from("rents")
    .select("*, properties(id, name)")
    .eq("organization_id", organizationId)
    .order("due_date", { ascending: false })
    .limit(100);

  const list = rents ?? [];

  return (
    <div>
      <PageHeader
        title="Rendas"
        description="Rendas geradas automaticamente a partir dos contratos ativos."
      />
      {list.length === 0 ? (
        <EmptyState
          icon={<Euro className="h-10 w-10" />}
          title="Sem rendas"
          description="As rendas são geradas automaticamente quando cria um contrato ativo."
          actionLabel="Criar contrato"
          actionHref="/leases/new"
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Imóvel</TableHead>
              <TableHead>Período</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Recebido</TableHead>
              <TableHead>Em dívida</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((r) => {
              const prop = r.properties as unknown as { id: string; name: string } | null;
              return (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link href={`/rents/${r.id}`} className="font-medium text-primary hover:underline">
                      {prop?.name ?? "Ver renda"}
                    </Link>
                  </TableCell>
                  <TableCell>{String(r.month).padStart(2, "0")}/{r.year}</TableCell>
                  <TableCell>{formatDate(r.due_date)}</TableCell>
                  <TableCell>{formatCurrency(r.total_amount)}</TableCell>
                  <TableCell>{formatCurrency(r.received_amount)}</TableCell>
                  <TableCell>{formatCurrency(r.outstanding_amount)}</TableCell>
                  <TableCell><RentStatusBadge status={r.status as RentStatus} /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
