import Link from "next/link";
import { FileText } from "lucide-react";
import { getOrgContext } from "@/server/services/org-service";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBanner } from "@/components/error-banner";
import { LeaseStatusBadge } from "@/components/status-badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { LEASE_TYPE_LABELS, type Lease, type LeaseStatus, type LeaseType } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata = { title: "Contratos" };

export default async function LeasesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { supabase, organizationId } = await getOrgContext();

  const { data: leases } = await supabase
    .from("leases")
    .select("*, properties(id, name), lease_tenants(tenants(id, name))")
    .eq("organization_id", organizationId)
    .order("start_date", { ascending: false });

  const list = (leases ?? []) as Lease[];

  return (
    <div>
      <PageHeader
        title="Contratos"
        description="Contratos de arrendamento — o centro operacional da gestão."
        actionLabel="Novo contrato"
        actionHref="/leases/new"
      />
      <ErrorBanner message={error} />

      {list.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-10 w-10" />}
          title="Ainda não existem contratos"
          description="Crie um contrato ativo para gerar automaticamente as rendas mensais."
          actionLabel="Criar contrato"
          actionHref="/leases/new"
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Imóvel</TableHead>
              <TableHead>Inquilino(s)</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Início</TableHead>
              <TableHead>Renda</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((l) => {
              const tenantNames = (l.lease_tenants ?? [])
                .map((lt) => lt.tenants?.name)
                .filter(Boolean)
                .join(", ");
              return (
                <TableRow key={l.id}>
                  <TableCell>
                    <Link href={`/leases/${l.id}`} className="font-medium text-primary hover:underline">
                      {l.properties?.name ?? "—"}
                    </Link>
                  </TableCell>
                  <TableCell>{tenantNames || "—"}</TableCell>
                  <TableCell>{LEASE_TYPE_LABELS[l.lease_type as LeaseType]}</TableCell>
                  <TableCell>{formatDate(l.start_date)}</TableCell>
                  <TableCell>{formatCurrency(l.current_rent)}</TableCell>
                  <TableCell><LeaseStatusBadge status={l.status as LeaseStatus} /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
