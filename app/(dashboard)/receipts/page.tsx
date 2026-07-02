import Link from "next/link";
import { Download, Receipt as ReceiptIcon } from "lucide-react";
import { getOrgContext } from "@/server/services/org-service";
import { listRentsPendingReceipt } from "@/server/services/receipt-service";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBanner } from "@/components/error-banner";
import { ReceiptStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { ReceiptStatus } from "@/lib/types";

export const metadata = { title: "Recibos AT" };

export default async function ReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { supabase, organizationId } = await getOrgContext();

  const [pendingRents, receiptsRes] = await Promise.all([
    listRentsPendingReceipt(supabase, organizationId),
    supabase
      .from("receipts")
      .select("*, rents(properties(name)), leases(lease_tenants(tenants(name)))")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const receipts = receiptsRes.data ?? [];

  return (
    <div>
      <PageHeader
        title="Recibos AT"
        description="Emissão manual e assistida de recibos de renda — sem scraping nem senhas do Portal das Finanças."
      >
        <a href="/api/exports/receipts">
          <Button variant="outline"><Download className="h-4 w-4" /> Exportar CSV</Button>
        </a>
      </PageHeader>
      <ErrorBanner message={error} />

      <section className="mb-8">
        <h2 className="mb-3 text-base font-semibold">
          Por emitir <span className="text-muted-foreground font-normal">({pendingRents.length})</span>
        </h2>
        {pendingRents.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem rendas pendentes de recibo.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Imóvel</TableHead>
                <TableHead>Inquilino(s)</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Valor recebido</TableHead>
                <TableHead>Data de pagamento</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingRents.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.property_name ?? "—"}</TableCell>
                  <TableCell>{r.tenant_names || "—"}</TableCell>
                  <TableCell>{String(r.month).padStart(2, "0")}/{r.year}</TableCell>
                  <TableCell>{formatCurrency(r.total_amount)}</TableCell>
                  <TableCell>{formatDate(r.payment_date)}</TableCell>
                  <TableCell>
                    <Link href={`/receipts/new?rent_id=${r.id}`}>
                      <Button size="sm">Registar recibo</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold">Recibos registados</h2>
        {receipts.length === 0 ? (
          <EmptyState
            icon={<ReceiptIcon className="h-10 w-10" />}
            title="Sem recibos"
            description="Os recibos aparecem aqui depois de registados a partir de uma renda paga."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Imóvel</TableHead>
                <TableHead>Inquilino(s)</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>N.º recibo AT</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receipts.map((r) => {
                const rent = r.rents as unknown as { properties: { name: string } | null } | null;
                const lease = r.leases as unknown as {
                  lease_tenants: { tenants: { name: string } | null }[];
                } | null;
                const tenantNames = (lease?.lease_tenants ?? [])
                  .map((lt) => lt.tenants?.name)
                  .filter(Boolean)
                  .join(", ");
                return (
                  <TableRow key={r.id}>
                    <TableCell>{rent?.properties?.name ?? "—"}</TableCell>
                    <TableCell>{tenantNames || "—"}</TableCell>
                    <TableCell>
                      <Link href={`/receipts/${r.id}`} className="text-primary hover:underline">
                        {formatDate(r.period_start)}
                      </Link>
                    </TableCell>
                    <TableCell>{formatCurrency(r.amount)}</TableCell>
                    <TableCell>{r.at_receipt_number ?? "—"}</TableCell>
                    <TableCell><ReceiptStatusBadge status={r.status as ReceiptStatus} /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
