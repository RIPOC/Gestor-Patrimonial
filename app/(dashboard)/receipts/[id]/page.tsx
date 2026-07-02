import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { getOrgContext } from "@/server/services/org-service";
import {
  completeReceipt,
  markReceiptCommunicated,
  cancelReceipt,
} from "@/server/actions/receipts";
import { downloadDocument, uploadLinkedDocument } from "@/server/actions/documents";
import { fetchReceiptPdfFromAT } from "@/server/actions/at-integration";
import { prepareReceiptDataForPortal } from "@/server/services/at-connector-service";
import { PageHeader } from "@/components/layout/page-header";
import { ErrorBanner } from "@/components/error-banner";
import { ReceiptStatusBadge } from "@/components/status-badge";
import { ATCredentialsModal } from "@/components/at-credentials-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RECEIPT_MODE_LABELS, type ReceiptMode, type ReceiptStatus } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata = { title: "Recibo" };

export default async function ReceiptDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; at_error?: string; at_success?: string }>;
}) {
  const { id } = await params;
  const { error, at_error, at_success } = await searchParams;
  const { supabase, organizationId } = await getOrgContext();

  const { data: receipt } = await supabase
    .from("receipts")
    .select(
      "*, rents(properties(name), payment_date), owners(name, tax_number), leases(at_contract_number, lease_tenants(tenants(name, tax_number)))"
    )
    .eq("id", id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!receipt) notFound();

  const [{ data: documents }, { data: logs }] = await Promise.all([
    supabase.from("documents").select("*").eq("receipt_id", id).order("created_at", { ascending: false }),
    supabase
      .from("at_operation_logs")
      .select("*")
      .eq("receipt_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const rent = receipt.rents as unknown as { properties: { name: string } | null; payment_date: string | null } | null;
  const owner = receipt.owners as unknown as { name: string; tax_number: string | null } | null;
  const lease = receipt.leases as unknown as {
    at_contract_number: string | null;
    lease_tenants: { tenants: { name: string; tax_number: string | null } | null }[];
  } | null;
  const tenant = lease?.lease_tenants?.[0]?.tenants ?? null;

  const preparedData = prepareReceiptDataForPortal({
    ownerTaxNumber: owner?.tax_number ?? "(sem NIF registado)",
    tenantTaxNumber: tenant?.tax_number ?? "(sem NIF registado)",
    atContractNumber: lease?.at_contract_number ?? null,
    periodStart: receipt.period_start ?? "",
    periodEnd: receipt.period_end ?? "",
    amount: Number(receipt.amount),
    receivedDate: receipt.received_date ?? rent?.payment_date ?? "",
  });

  const status = receipt.status as ReceiptStatus;
  const completeAction = completeReceipt.bind(null, id);
  const communicatedAction = markReceiptCommunicated.bind(null, id);
  const cancelAction = cancelReceipt.bind(null, id);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <PageHeader
        title={`Recibo — ${rent?.properties?.name ?? ""}`}
        description={tenant?.name ?? undefined}
      >
        <ReceiptStatusBadge status={status} />
        {status !== "anulado" && (
          <form action={cancelAction}>
            <Button type="submit" variant="destructive">Anular recibo</Button>
          </form>
        )}
      </PageHeader>
      <ErrorBanner message={error ?? at_error} />
      {at_success && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {at_success}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Dados do recibo</CardTitle></CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Modo</dt>
                <dd>{RECEIPT_MODE_LABELS[receipt.mode as ReceiptMode]}</dd>
                <dt className="text-muted-foreground">Valor</dt>
                <dd className="font-semibold">{formatCurrency(receipt.amount)}</dd>
                <dt className="text-muted-foreground">N.º recibo AT</dt>
                <dd>{receipt.at_receipt_number ?? "—"}</dd>
                <dt className="text-muted-foreground">Data de recebimento</dt>
                <dd>{formatDate(receipt.received_date)}</dd>
                <dt className="text-muted-foreground">Período</dt>
                <dd>{formatDate(receipt.period_start)} – {formatDate(receipt.period_end)}</dd>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Dados para o Portal das Finanças</CardTitle></CardHeader>
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

          {(logs ?? []).length > 0 && (
            <Card>
              <CardHeader><CardTitle>Histórico de operações</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {(logs ?? []).map((l) => (
                    <li key={l.id} className="flex justify-between border-b border-border pb-2 last:border-0">
                      <span>{l.operation}</span>
                      <span className="text-muted-foreground">{formatDate(l.created_at)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {status === "por_emitir" && (
            <Card>
              <CardHeader><CardTitle>Concluir emissão</CardTitle></CardHeader>
              <CardContent>
                <form action={completeAction} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="at_receipt_number">N.º do recibo AT *</Label>
                    <Input id="at_receipt_number" name="at_receipt_number" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="received_date">Data de recebimento</Label>
                    <Input id="received_date" name="received_date" type="date" defaultValue={today} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="file">PDF do recibo</Label>
                    <Input id="file" name="file" type="file" accept="application/pdf" />
                  </div>
                  <Button type="submit" className="w-full">Marcar como emitido</Button>
                </form>
              </CardContent>
            </Card>
          )}

          {status === "emitido" && receipt.mode !== "integrado" && (
            <Card>
              <CardHeader><CardTitle>Comunicação à AT</CardTitle></CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                  Registo manual (bookkeeping) — não faz nenhuma chamada à AT. Para emissão real pelo
                  webservice oficial, use "Emitir recibo AT" na página da renda.
                </p>
                <form action={communicatedAction}>
                  <Button type="submit" className="w-full">Marcar como comunicado à AT</Button>
                </form>
              </CardContent>
            </Card>
          )}

          {receipt.mode === "integrado" && receipt.at_receipt_number && !receipt.at_pdf_document_id && (
            <Card>
              <CardHeader><CardTitle>PDF do recibo (via AT)</CardTitle></CardHeader>
              <CardContent>
                <p className="mb-3 text-sm text-muted-foreground">
                  Recibo emitido pelo webservice oficial (n.º {receipt.at_receipt_number}). Obtenha o PDF
                  diretamente da AT para o guardar no arquivo digital.
                </p>
                <ATCredentialsModal
                  action={fetchReceiptPdfFromAT.bind(null, id)}
                  triggerLabel="Obter PDF via AT"
                  title="Obter PDF do recibo"
                  description="Pede à AT o PDF deste recibo já emitido e guarda-o automaticamente no arquivo digital."
                />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>PDF do recibo</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {(documents ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem PDF anexado.</p>
              ) : (
                <ul className="space-y-2">
                  {(documents ?? []).map((d) => {
                    const dl = downloadDocument.bind(null, d.id);
                    return (
                      <li key={d.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate font-medium" title={d.original_filename}>{d.original_filename}</span>
                        <form action={dl}>
                          <Button variant="ghost" size="sm" type="submit" title="Descarregar">
                            <Download className="h-4 w-4" />
                          </Button>
                        </form>
                      </li>
                    );
                  })}
                </ul>
              )}

              <form action={uploadLinkedDocument} className="space-y-3 border-t border-border pt-4">
                <input type="hidden" name="receipt_id" value={id} />
                <input type="hidden" name="lease_id" value={receipt.lease_id ?? ""} />
                <input type="hidden" name="document_type" value="recibo_at" />
                <input type="hidden" name="redirect_to" value={`/receipts/${id}`} />
                <div className="space-y-1.5">
                  <Label htmlFor="doc_file">Anexar PDF</Label>
                  <Input id="doc_file" name="file" type="file" accept="application/pdf" required />
                </div>
                <Button type="submit" size="sm" className="w-full">Carregar</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
