import { Download, FileText } from "lucide-react";
import { redirect } from "next/navigation";
import { getTenantContextOrNull } from "@/server/services/org-service";
import { downloadSharedDocument } from "@/server/actions/documents";
import { ErrorBanner } from "@/components/error-banner";
import { RentStatusBadge, LeaseStatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  DOCUMENT_TYPE_LABELS,
  LEASE_TYPE_LABELS,
  type DocumentType,
  type LeaseStatus,
  type LeaseType,
  type RentStatus,
} from "@/lib/types";

export const metadata = { title: "Portal do Inquilino" };

export default async function PortalPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const ctx = await getTenantContextOrNull();
  if (!ctx) redirect("/login");
  const { supabase, tenantId, tenantName } = ctx;

  // Contratos do inquilino
  const { data: leaseLinks } = await supabase
    .from("lease_tenants")
    .select("lease_id, leases(id, lease_type, status, current_rent, start_date, end_date, properties(name))")
    .eq("tenant_id", tenantId);

  const leaseIds = (leaseLinks ?? []).map((l) => l.lease_id);

  // Rendas (via RLS tenant_own_rents)
  let rents: Record<string, unknown>[] = [];
  let documents: Record<string, unknown>[] = [];
  if (leaseIds.length > 0) {
    const [rentsRes, docsRes] = await Promise.all([
      supabase
        .from("rents")
        .select("*, properties(name)")
        .in("lease_id", leaseIds)
        .neq("status", "anulada")
        .order("year", { ascending: false })
        .order("month", { ascending: false })
        .limit(24),
      supabase
        .from("documents")
        .select("id, original_filename, document_type, document_date, created_at")
        .eq("is_shared_with_tenant", true)
        .in("lease_id", leaseIds)
        .order("created_at", { ascending: false }),
    ]);
    rents = rentsRes.data ?? [];
    documents = docsRes.data ?? [];
  }

  const outstanding = rents.reduce(
    (s, r) => s + (Number(r.total_amount) - Number(r.received_amount)),
    0
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Olá, {tenantName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Consulte os seus contratos, rendas e documentos partilhados.
        </p>
      </div>
      <ErrorBanner message={error} />

      {outstanding > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Tem um valor em dívida de <strong>{formatCurrency(outstanding)}</strong>.
        </div>
      )}

      {/* Contratos */}
      <section>
        <h2 className="mb-3 text-base font-semibold">Os meus contratos</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {(leaseLinks ?? []).map((l) => {
            const lease = l.leases as unknown as {
              id: string; lease_type: LeaseType; status: LeaseStatus;
              current_rent: number; start_date: string; end_date: string | null;
              properties: { name: string } | null;
            } | null;
            if (!lease) return null;
            return (
              <Card key={l.lease_id}>
                <CardHeader className="pb-1">
                  <div className="flex items-center justify-between">
                    <CardTitle>{lease.properties?.name ?? "Contrato"}</CardTitle>
                    <LeaseStatusBadge status={lease.status} />
                  </div>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-2 gap-y-1 text-sm">
                    <dt className="text-muted-foreground">Tipo</dt>
                    <dd>{LEASE_TYPE_LABELS[lease.lease_type]}</dd>
                    <dt className="text-muted-foreground">Renda</dt>
                    <dd className="font-semibold">{formatCurrency(lease.current_rent)}</dd>
                    <dt className="text-muted-foreground">Início</dt>
                    <dd>{formatDate(lease.start_date)}</dd>
                    <dt className="text-muted-foreground">Fim</dt>
                    <dd>{formatDate(lease.end_date)}</dd>
                  </dl>
                </CardContent>
              </Card>
            );
          })}
          {(leaseLinks ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Sem contratos associados.</p>
          )}
        </div>
      </section>

      {/* Rendas */}
      <section>
        <h2 className="mb-3 text-base font-semibold">As minhas rendas</h2>
        {rents.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem rendas registadas.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Período</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Recebido</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rents.map((r) => (
                <TableRow key={r.id as string}>
                  <TableCell>{String(r.month).padStart(2, "0")}/{r.year as number}</TableCell>
                  <TableCell>{formatDate(r.due_date as string)}</TableCell>
                  <TableCell>{formatCurrency(r.total_amount as number)}</TableCell>
                  <TableCell>{formatCurrency(r.received_amount as number)}</TableCell>
                  <TableCell><RentStatusBadge status={r.status as RentStatus} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      {/* Documentos partilhados */}
      <section>
        <h2 className="mb-3 text-base font-semibold">Documentos partilhados</h2>
        {documents.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            Ainda não há documentos partilhados consigo.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ficheiro</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Data</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((d) => {
                const dl = downloadSharedDocument.bind(null, d.id as string);
                return (
                  <TableRow key={d.id as string}>
                    <TableCell className="font-medium">{d.original_filename as string}</TableCell>
                    <TableCell>{DOCUMENT_TYPE_LABELS[d.document_type as DocumentType]}</TableCell>
                    <TableCell>{formatDate((d.document_date ?? d.created_at) as string)}</TableCell>
                    <TableCell>
                      <form action={dl}>
                        <Button variant="ghost" size="sm" type="submit" title="Descarregar">
                          <Download className="h-4 w-4" />
                        </Button>
                      </form>
                    </TableCell>
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
