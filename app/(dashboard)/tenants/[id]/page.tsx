import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrgContext } from "@/server/services/org-service";
import { PageHeader } from "@/components/layout/page-header";
import { RentStatusBadge, LeaseStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  TENANT_TYPE_LABELS,
  type LeaseStatus,
  type RentStatus,
  type TenantType,
} from "@/lib/types";

export const metadata = { title: "Inquilino" };

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, organizationId } = await getOrgContext();

  const { data: tenant } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!tenant) notFound();

  // Contratos do inquilino (via lease_tenants)
  const { data: leaseLinks } = await supabase
    .from("lease_tenants")
    .select("lease_id, leases(id, status, current_rent, start_date, end_date, properties(name))")
    .eq("tenant_id", id);

  const leaseIds = (leaseLinks ?? []).map((l) => l.lease_id);

  // Conta corrente: todas as rendas dos contratos deste inquilino
  let rents: Record<string, unknown>[] = [];
  if (leaseIds.length > 0) {
    const { data } = await supabase
      .from("rents")
      .select("*, properties(name)")
      .in("lease_id", leaseIds)
      .neq("status", "anulada")
      .order("year", { ascending: true })
      .order("month", { ascending: true });
    rents = data ?? [];
  }

  const totalDue = rents.reduce((s, r) => s + Number(r.total_amount), 0);
  const totalReceived = rents.reduce((s, r) => s + Number(r.received_amount), 0);
  const balance = totalDue - totalReceived;

  // Saldo acumulado por linha
  let running = 0;

  return (
    <div>
      <PageHeader
        title={tenant.name}
        description={`${TENANT_TYPE_LABELS[tenant.tenant_type as TenantType]}${tenant.tax_number ? ` · NIF ${tenant.tax_number}` : ""}`}
      >
        <Badge tone={tenant.is_active ? "green" : "gray"}>
          {tenant.is_active ? "Ativo" : "Inativo"}
        </Badge>
        <Link href={`/tenants/${id}/edit`}>
          <Button variant="outline">Editar</Button>
        </Link>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-0"><CardTitle className="text-sm text-muted-foreground">Total faturado</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(totalDue)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-0"><CardTitle className="text-sm text-muted-foreground">Total recebido</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">{formatCurrency(totalReceived)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-0"><CardTitle className="text-sm text-muted-foreground">Saldo em dívida</CardTitle></CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${balance > 0 ? "text-red-600" : "text-green-600"}`}>
              {formatCurrency(balance)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-base font-semibold">Conta corrente</h2>
          {rents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem rendas associadas a este inquilino.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead>Imóvel</TableHead>
                  <TableHead>Renda</TableHead>
                  <TableHead>Recebido</TableHead>
                  <TableHead>Saldo acum.</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rents.map((r) => {
                  running += Number(r.total_amount) - Number(r.received_amount);
                  const prop = r.properties as unknown as { name: string } | null;
                  return (
                    <TableRow key={r.id as string}>
                      <TableCell>
                        <Link href={`/rents/${r.id}`} className="text-primary hover:underline">
                          {String(r.month).padStart(2, "0")}/{r.year as number}
                        </Link>
                      </TableCell>
                      <TableCell>{prop?.name ?? "—"}</TableCell>
                      <TableCell>{formatCurrency(r.total_amount as number)}</TableCell>
                      <TableCell>{formatCurrency(r.received_amount as number)}</TableCell>
                      <TableCell className={running > 0 ? "font-medium text-red-600" : "text-green-600"}>
                        {formatCurrency(running)}
                      </TableCell>
                      <TableCell><RentStatusBadge status={r.status as RentStatus} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Contactos</CardTitle></CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-y-2 text-sm">
                <div><dt className="text-muted-foreground">Email</dt><dd>{tenant.email ?? "—"}</dd></div>
                <div><dt className="text-muted-foreground">Telefone</dt><dd>{tenant.phone ?? "—"}</dd></div>
                <div><dt className="text-muted-foreground">Morada</dt><dd>{tenant.address ?? "—"}</dd></div>
                <div><dt className="text-muted-foreground">Fiador</dt><dd>{tenant.guarantor_name ?? "—"}</dd></div>
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Contratos</CardTitle></CardHeader>
            <CardContent>
              {(leaseLinks ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem contratos.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {(leaseLinks ?? []).map((l) => {
                    const lease = l.leases as unknown as {
                      id: string; status: LeaseStatus; current_rent: number;
                      properties: { name: string } | null;
                    } | null;
                    if (!lease) return null;
                    return (
                      <li key={l.lease_id} className="flex items-center justify-between gap-2">
                        <Link href={`/leases/${lease.id}`} className="text-primary hover:underline">
                          {lease.properties?.name ?? "Contrato"}
                        </Link>
                        <LeaseStatusBadge status={lease.status} />
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
