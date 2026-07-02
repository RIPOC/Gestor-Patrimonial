import { notFound, redirect } from "next/navigation";
import { getOrgContext } from "@/server/services/org-service";
import { createReceipt } from "@/server/actions/receipts";
import { prepareReceiptDataForPortal } from "@/server/services/at-connector-service";
import { PageHeader } from "@/components/layout/page-header";
import { ErrorBanner } from "@/components/error-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const metadata = { title: "Registar recibo" };

export default async function NewReceiptPage({
  searchParams,
}: {
  searchParams: Promise<{ rent_id?: string; error?: string }>;
}) {
  const { rent_id: rentId, error } = await searchParams;
  if (!rentId) redirect("/receipts");

  const { supabase, organizationId } = await getOrgContext();

  const { data: rent } = await supabase
    .from("rents")
    .select(
      "id, period_start, period_end, total_amount, payment_date, receipt_issued, properties(name), owners(name, tax_number), leases(at_contract_number, lease_tenants(tenants(name, tax_number)))"
    )
    .eq("id", rentId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!rent) notFound();
  if (rent.receipt_issued) redirect("/receipts");

  const property = rent.properties as unknown as { name: string } | null;
  const owner = rent.owners as unknown as { name: string; tax_number: string | null } | null;
  const lease = rent.leases as unknown as {
    at_contract_number: string | null;
    lease_tenants: { tenants: { name: string; tax_number: string | null } | null }[];
  } | null;
  const tenant = lease?.lease_tenants?.[0]?.tenants ?? null;

  const preparedData = prepareReceiptDataForPortal({
    ownerTaxNumber: owner?.tax_number ?? "(sem NIF registado)",
    tenantTaxNumber: tenant?.tax_number ?? "(sem NIF registado)",
    atContractNumber: lease?.at_contract_number ?? null,
    periodStart: rent.period_start ?? "",
    periodEnd: rent.period_end ?? "",
    amount: Number(rent.total_amount),
    receivedDate: rent.payment_date ?? "",
  });

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <PageHeader
        title="Registar recibo"
        description={`${property?.name ?? ""}${tenant?.name ? ` · ${tenant.name}` : ""}`}
      />
      <ErrorBanner message={error} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dados para o Portal das Finanças</CardTitle>
            <CardDescription>
              Copie estes dados para emitir o recibo manualmente em www.portaldasfinancas.gov.pt.
              A aplicação nunca acede ao Portal nem guarda a sua senha.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-y-2 text-sm">
              {Object.entries(preparedData).map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 border-b border-border py-1.5 last:border-0">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Registar na aplicação</CardTitle></CardHeader>
          <CardContent>
            <form action={createReceipt} className="space-y-4">
              <input type="hidden" name="rent_id" value={rentId} />
              <div className="space-y-1.5">
                <Label htmlFor="mode">Modo</Label>
                <Select id="mode" name="mode" defaultValue="assistido">
                  <option value="assistido">Assistido — só preparar dados agora</option>
                  <option value="manual">Manual — já emiti no Portal das Finanças</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="at_receipt_number">N.º do recibo AT (se já emitido)</Label>
                <Input id="at_receipt_number" name="at_receipt_number" placeholder="Deixe vazio se ainda não emitiu" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="received_date">Data de recebimento</Label>
                <Input id="received_date" name="received_date" type="date" defaultValue={today} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="file">PDF do recibo (se já o tiver)</Label>
                <Input id="file" name="file" type="file" accept="application/pdf" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notes">Observações</Label>
                <Textarea id="notes" name="notes" />
              </div>
              <Button type="submit" className="w-full">Guardar</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
