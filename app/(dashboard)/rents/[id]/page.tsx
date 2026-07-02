import Link from "next/link";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { getOrgContext } from "@/server/services/org-service";
import { registerPayment, deletePayment, markRentPaid } from "@/server/actions/payments";
import { issueReceiptViaAT } from "@/server/actions/at-integration";
import { PageHeader } from "@/components/layout/page-header";
import { ErrorBanner } from "@/components/error-banner";
import { RentStatusBadge } from "@/components/status-badge";
import { ATCredentialsModal } from "@/components/at-credentials-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { RentStatus } from "@/lib/types";

export const metadata = { title: "Renda" };

const PAYMENT_METHODS: Record<string, string> = {
  transferencia: "Transferência bancária",
  numerario: "Numerário",
  cheque: "Cheque",
  debito_direto: "Débito direto",
  multibanco: "Multibanco",
  mbway: "MB Way",
  outro: "Outro",
};

export default async function RentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; at_error?: string; at_success?: string }>;
}) {
  const { id } = await params;
  const { error, at_error, at_success } = await searchParams;
  const { supabase, organizationId } = await getOrgContext();

  const { data: rent } = await supabase
    .from("rents")
    .select("*, properties(id, name), lease:leases(id, at_contract_number, lease_tenants(tenants(id, name)))")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!rent) notFound();

  const { data: payments } = await supabase
    .from("rent_payments")
    .select("*")
    .eq("rent_id", id)
    .order("payment_date", { ascending: false });

  const property = rent.properties as unknown as { id: string; name: string } | null;
  const leaseJoin = rent.lease as unknown as {
    id: string;
    at_contract_number: number | null;
    lease_tenants: { tenants: { id: string; name: string } | null }[];
  } | null;
  const tenantNames = (leaseJoin?.lease_tenants ?? [])
    .map((lt) => lt.tenants?.name)
    .filter(Boolean)
    .join(", ");

  const outstanding = Number(rent.total_amount) - Number(rent.received_amount);
  const pad = (n: number) => String(n).padStart(2, "0");
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const markPaidAction = markRentPaid.bind(null, id);

  return (
    <div>
      <PageHeader
        title={`Renda ${pad(rent.month)}/${rent.year}`}
        description={[property?.name, tenantNames].filter(Boolean).join(" · ") || undefined}
      >
        <RentStatusBadge status={rent.status as RentStatus} />
        {outstanding > 0 && rent.status !== "anulada" && (
          <form action={markPaidAction}>
            <Button type="submit">Marcar como paga</Button>
          </form>
        )}
      </PageHeader>
      <ErrorBanner message={error ?? at_error} />
      {at_success && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {at_success}
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-0"><CardTitle className="text-sm text-muted-foreground">Valor da renda</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(rent.total_amount)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-0"><CardTitle className="text-sm text-muted-foreground">Recebido</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">{formatCurrency(rent.received_amount)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-0"><CardTitle className="text-sm text-muted-foreground">Em dívida</CardTitle></CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${outstanding > 0 ? "text-red-600" : "text-green-600"}`}>
              {formatCurrency(outstanding)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-base font-semibold">Pagamentos</h2>
          {(payments ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ainda não há pagamentos registados para esta renda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Referência</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(payments ?? []).map((p) => {
                  const delAction = deletePayment.bind(null, p.id, id);
                  return (
                    <TableRow key={p.id}>
                      <TableCell>{formatDate(p.payment_date)}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(p.amount)}</TableCell>
                      <TableCell>{PAYMENT_METHODS[p.method] ?? p.method}</TableCell>
                      <TableCell>{p.reference ?? "—"}</TableCell>
                      <TableCell>
                        <form action={delAction}>
                          <Button variant="ghost" size="sm" type="submit" title="Anular pagamento">
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </form>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {rent.status !== "anulada" && outstanding > 0 && (
          <Card className="self-start">
            <CardHeader><CardTitle>Registar pagamento</CardTitle></CardHeader>
            <CardContent>
              <form action={registerPayment} className="space-y-4">
                <input type="hidden" name="rent_id" value={id} />
                <div className="space-y-1.5">
                  <Label htmlFor="amount">Valor (€) *</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    defaultValue={outstanding.toFixed(2)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="payment_date">Data *</Label>
                  <Input id="payment_date" name="payment_date" type="date" defaultValue={todayStr} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="method">Método</Label>
                  <Select id="method" name="method" defaultValue="transferencia">
                    {Object.entries(PAYMENT_METHODS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reference">Referência</Label>
                  <Input id="reference" name="reference" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea id="notes" name="notes" />
                </div>
                <Button type="submit" className="w-full">Registar pagamento</Button>
              </form>
            </CardContent>
          </Card>
        )}

        {outstanding <= 0 && rent.status !== "anulada" && !rent.receipt_issued && (
          <Card className="self-start">
            <CardHeader><CardTitle>Recibo AT (integrado)</CardTitle></CardHeader>
            <CardContent>
              {leaseJoin?.at_contract_number ? (
                <>
                  <p className="mb-3 text-sm text-muted-foreground">
                    Emite o recibo diretamente no webservice oficial da AT. Alternativa aos modos
                    manual/assistido em <Link href="/receipts" className="underline">Recibos AT</Link>.
                  </p>
                  <ATCredentialsModal
                    action={issueReceiptViaAT.bind(null, id, null)}
                    triggerLabel="Emitir recibo AT"
                    title="Emitir recibo AT"
                    description={`Contrato AT n.º ${leaseJoin.at_contract_number}. Confirme o valor e o período antes de emitir — não é possível anular automaticamente.`}
                  />
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  O contrato ainda não foi comunicado à AT.{" "}
                  <Link href={`/leases/${leaseJoin?.id}`} className="text-primary hover:underline">
                    Comunicar contrato primeiro →
                  </Link>
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
