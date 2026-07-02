import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrgContext } from "@/server/services/org-service";
import { terminateLease } from "@/server/actions/leases";
import { submitContractToAT } from "@/server/actions/at-integration";
import { PageHeader } from "@/components/layout/page-header";
import { ErrorBanner } from "@/components/error-banner";
import { LeaseStatusBadge, RentStatusBadge } from "@/components/status-badge";
import { ATCredentialsModal } from "@/components/at-credentials-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  LEASE_TYPE_LABELS,
  type LeaseStatus,
  type LeaseType,
  type RentStatus,
} from "@/lib/types";

export const metadata = { title: "Contrato" };

export default async function LeaseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; at_error?: string; at_success?: string }>;
}) {
  const { id } = await params;
  const { error, at_error, at_success } = await searchParams;
  const { supabase, organizationId } = await getOrgContext();

  const { data: lease } = await supabase
    .from("leases")
    .select("*, properties(id, name), owners(id, name), lease_tenants(tenants(id, name))")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!lease) notFound();

  const { data: rents } = await supabase
    .from("rents")
    .select("*")
    .eq("lease_id", id)
    .order("year", { ascending: false })
    .order("month", { ascending: false });

  const property = lease.properties as unknown as { id: string; name: string } | null;
  const owner = lease.owners as unknown as { id: string; name: string } | null;
  const tenantNames = (lease.lease_tenants ?? [])
    .map((lt: { tenants: { name: string } | null }) => lt.tenants?.name)
    .filter(Boolean)
    .join(", ");

  const terminateAction = terminateLease.bind(null, id);

  return (
    <div>
      <PageHeader
        title={`Contrato — ${property?.name ?? ""}`}
        description={tenantNames ? `Inquilino(s): ${tenantNames}` : undefined}
      >
        <LeaseStatusBadge status={lease.status as LeaseStatus} />
        {lease.status === "ativo" && (
          <form action={terminateAction}>
            <Button variant="destructive" type="submit">
              Terminar contrato
            </Button>
          </form>
        )}
      </PageHeader>
      <ErrorBanner message={error ?? at_error} />
      {at_success && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {at_success}
        </div>
      )}

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Condições</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Tipo</dt>
              <dd>{LEASE_TYPE_LABELS[lease.lease_type as LeaseType]}</dd>
              <dt className="text-muted-foreground">Início</dt>
              <dd>{formatDate(lease.start_date)}</dd>
              <dt className="text-muted-foreground">Fim</dt>
              <dd>{formatDate(lease.end_date)}</dd>
              <dt className="text-muted-foreground">Renovação automática</dt>
              <dd>{lease.auto_renewal ? "Sim" : "Não"}</dd>
              <dt className="text-muted-foreground">Renda atual</dt>
              <dd className="font-semibold">{formatCurrency(lease.current_rent)}</dd>
              <dt className="text-muted-foreground">Dia de vencimento</dt>
              <dd>{lease.due_day}</dd>
              <dt className="text-muted-foreground">Caução</dt>
              <dd>{formatCurrency(lease.deposit_amount)}</dd>
              <dt className="text-muted-foreground">Proprietário</dt>
              <dd>{owner?.name ?? "—"}</dd>
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Situação fiscal</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Comunicado à AT</dt>
              <dd>{lease.reported_to_at ? "Sim" : "Não"}</dd>
              <dt className="text-muted-foreground">N.º contrato AT</dt>
              <dd>{lease.at_contract_number ?? "—"}</dd>
              <dt className="text-muted-foreground">Retenção na fonte</dt>
              <dd>{lease.withholding_tax ? "Sim" : "Não"}</dd>
              <dt className="text-muted-foreground">IVA</dt>
              <dd>{lease.vat ? "Sim" : "Não"}</dd>
            </dl>
            {property && (
              <Link
                href={`/properties/${property.id}`}
                className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
              >
                Ver imóvel →
              </Link>
            )}
            {!lease.at_contract_number && (
              <div className="mt-4 border-t border-border pt-4">
                <ATCredentialsModal
                  action={submitContractToAT.bind(null, id)}
                  triggerLabel="Comunicar contrato à AT"
                  title="Comunicar contrato à AT"
                  description="Envia os dados deste contrato ao webservice oficial da AT (SOAP/WSDL). Confirme antes que o imóvel, o(s) proprietário(s) e o(s) inquilino(s) têm os dados fiscais preenchidos (NIF, códigos de localização, quota-parte)."
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Ver <Link href="/settings/at-integration" className="underline">estado da integração</Link> antes de submeter.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <h2 className="mb-3 text-base font-semibold">Rendas do contrato</h2>
      {(rents ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Sem rendas geradas. As rendas são criadas automaticamente quando o contrato está ativo.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Período</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Recebido</TableHead>
              <TableHead>Em dívida</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(rents ?? []).map((r) => (
              <TableRow key={r.id}>
                <TableCell>{String(r.month).padStart(2, "0")}/{r.year}</TableCell>
                <TableCell>{formatDate(r.due_date)}</TableCell>
                <TableCell>{formatCurrency(r.total_amount)}</TableCell>
                <TableCell>{formatCurrency(r.received_amount)}</TableCell>
                <TableCell>{formatCurrency(r.outstanding_amount)}</TableCell>
                <TableCell><RentStatusBadge status={r.status as RentStatus} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
