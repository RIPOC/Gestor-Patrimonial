import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrgContext } from "@/server/services/org-service";
import { createUnit, deleteProperty } from "@/server/actions/properties";
import { getPropertyFiscalState } from "@/server/services/report-service";
import { PageHeader } from "@/components/layout/page-header";
import { ErrorBanner } from "@/components/error-banner";
import { DeleteButton } from "@/components/delete-button";
import { PropertyStatusBadge, LeaseStatusBadge, RentStatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import {
  DOCUMENT_TYPE_LABELS,
  LEASE_TYPE_LABELS,
  PROPERTY_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
  type DocumentType,
  type LeaseStatus,
  type LeaseType,
  type PropertyStatus,
  type PropertyType,
  type RentStatus,
} from "@/lib/types";

export const metadata = { title: "Imóvel" };

const TABS = [
  { key: "summary", label: "Resumo" },
  { key: "units", label: "Frações" },
  { key: "leases", label: "Contratos" },
  { key: "rents", label: "Rendas" },
  { key: "expenses", label: "Despesas" },
  { key: "documents", label: "Documentos" },
  { key: "fiscal", label: "Fiscal" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default async function PropertyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; error?: string }>;
}) {
  const { id } = await params;
  const { tab: tabParam, error } = await searchParams;
  const tab: TabKey = (TABS.find((t) => t.key === tabParam)?.key ?? "summary") as TabKey;

  const { supabase, organizationId } = await getOrgContext();

  const { data: property } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!property) notFound();

  const [unitsRes, leasesRes, rentsRes, expensesRes, documentsRes, ownersRes] =
    await Promise.all([
      supabase.from("property_units").select("*").eq("property_id", id).order("name"),
      supabase
        .from("leases")
        .select("*, lease_tenants(tenants(id, name))")
        .eq("property_id", id)
        .order("start_date", { ascending: false }),
      supabase
        .from("rents")
        .select("*")
        .eq("property_id", id)
        .order("due_date", { ascending: false })
        .limit(24),
      supabase
        .from("expenses")
        .select("*, expense_categories(name)")
        .eq("property_id", id)
        .order("expense_date", { ascending: false })
        .limit(24),
      supabase
        .from("documents")
        .select("*")
        .eq("property_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("owner_properties")
        .select("ownership_percentage, owners(id, name)")
        .eq("property_id", id),
    ]);

  const units = unitsRes.data ?? [];
  const leases = leasesRes.data ?? [];
  const rents = rentsRes.data ?? [];
  const expenses = expensesRes.data ?? [];
  const documents = documentsRes.data ?? [];
  const ownerLinks = ownersRes.data ?? [];

  const fiscalState =
    tab === "fiscal" ? await getPropertyFiscalState(supabase, organizationId, id) : null;

  const createUnitAction = createUnit.bind(null, id);

  return (
    <div>
      <PageHeader
        title={property.name}
        description={[property.address, property.municipality].filter(Boolean).join(" · ") || undefined}
      >
        <PropertyStatusBadge status={property.status as PropertyStatus} />
        <Link href={`/properties/${id}/edit`}>
          <Button variant="outline">Editar</Button>
        </Link>
        <DeleteButton
          action={deleteProperty.bind(null, id)}
          confirmMessage={`Eliminar o imóvel "${property.name}"? Esta ação não pode ser desfeita.`}
        />
      </PageHeader>
      <ErrorBanner message={error} />

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/properties/${id}?tab=${t.key}`}
            className={cn(
              "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "summary" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Dados do imóvel</CardTitle></CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Código interno</dt>
                <dd className="font-mono">{property.internal_code ?? "—"}</dd>
                <dt className="text-muted-foreground">Tipo</dt>
                <dd>{PROPERTY_TYPE_LABELS[property.property_type as PropertyType]}</dd>
                <dt className="text-muted-foreground">Artigo matricial</dt>
                <dd>{property.matrix_article ?? "—"}</dd>
                <dt className="text-muted-foreground">Fração</dt>
                <dd>{property.fraction ?? "—"}</dd>
                <dt className="text-muted-foreground">Área</dt>
                <dd>{property.area_m2 ? `${property.area_m2} m²` : "—"}</dd>
                <dt className="text-muted-foreground">Freguesia</dt>
                <dd>{property.parish ?? "—"}</dd>
                <dt className="text-muted-foreground">Distrito</dt>
                <dd>{property.district ?? "—"}</dd>
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Valores</CardTitle></CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">VPT</dt>
                <dd>{formatCurrency(property.taxable_value)}</dd>
                <dt className="text-muted-foreground">Data de aquisição</dt>
                <dd>{formatDate(property.acquisition_date)}</dd>
                <dt className="text-muted-foreground">Valor de aquisição</dt>
                <dd>{formatCurrency(property.acquisition_value)}</dd>
                <dt className="text-muted-foreground">Valor estimado</dt>
                <dd>{formatCurrency(property.estimated_value)}</dd>
                <dt className="text-muted-foreground">Condomínio mensal</dt>
                <dd>{formatCurrency(property.condo_fee_monthly)}</dd>
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Certificados e seguros</CardTitle></CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Certificado energético</dt>
                <dd>{property.energy_certificate ?? "—"}</dd>
                <dt className="text-muted-foreground">Validade</dt>
                <dd>{formatDate(property.energy_certificate_expiry)}</dd>
                <dt className="text-muted-foreground">Licença de utilização</dt>
                <dd>{property.usage_license ?? "—"}</dd>
                <dt className="text-muted-foreground">Seguro</dt>
                <dd>{property.insurance_policy ?? "—"}</dd>
                <dt className="text-muted-foreground">Validade do seguro</dt>
                <dd>{formatDate(property.insurance_expiry)}</dd>
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Proprietários</CardTitle></CardHeader>
            <CardContent>
              {ownerLinks.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem proprietários associados.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {ownerLinks.map((link, i) => {
                    const owner = link.owners as unknown as { id: string; name: string } | null;
                    return (
                      <li key={i} className="flex justify-between">
                        <span>{owner?.name ?? "—"}</span>
                        <span className="font-medium">{Number(link.ownership_percentage)}%</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "units" && (
        <div className="space-y-6">
          {units.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Este imóvel ainda não tem frações registadas.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Designação</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {units.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-mono text-xs">{u.internal_code ?? "—"}</TableCell>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>{PROPERTY_TYPE_LABELS[u.unit_type as PropertyType]}</TableCell>
                    <TableCell>{u.area_m2 ? `${u.area_m2} m²` : "—"}</TableCell>
                    <TableCell><PropertyStatusBadge status={u.status as PropertyStatus} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <Card className="max-w-2xl">
            <CardHeader><CardTitle>Adicionar fração</CardTitle></CardHeader>
            <CardContent>
              <form action={createUnitAction} className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="unit_name">Designação *</Label>
                  <Input id="unit_name" name="name" required placeholder="Ex.: Fração B — 1.º Dto" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="unit_code">Código interno</Label>
                  <Input id="unit_code" name="internal_code" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="unit_type">Tipo</Label>
                  <Select id="unit_type" name="unit_type" defaultValue="apartamento">
                    {Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="unit_area">Área (m²)</Label>
                  <Input id="unit_area" name="area_m2" type="number" step="0.01" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="unit_status">Estado</Label>
                  <Select id="unit_status" name="status" defaultValue="devoluto">
                    {Object.entries(PROPERTY_STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button type="submit">Adicionar fração</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "leases" && (
        leases.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem contratos para este imóvel.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Inquilino(s)</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Fim</TableHead>
                <TableHead>Renda</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leases.map((l) => {
                const tenantNames = (l.lease_tenants ?? [])
                  .map((lt: { tenants: { name: string } | null }) => lt.tenants?.name)
                  .filter(Boolean)
                  .join(", ");
                return (
                  <TableRow key={l.id}>
                    <TableCell>
                      <Link href={`/leases/${l.id}`} className="font-medium text-primary hover:underline">
                        {tenantNames || "(sem inquilino)"}
                      </Link>
                    </TableCell>
                    <TableCell>{LEASE_TYPE_LABELS[l.lease_type as LeaseType]}</TableCell>
                    <TableCell>{formatDate(l.start_date)}</TableCell>
                    <TableCell>{formatDate(l.end_date)}</TableCell>
                    <TableCell>{formatCurrency(l.current_rent)}</TableCell>
                    <TableCell><LeaseStatusBadge status={l.status as LeaseStatus} /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )
      )}

      {tab === "rents" && (
        rents.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem rendas registadas para este imóvel.</p>
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
              {rents.map((r) => (
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
        )
      )}

      {tab === "expenses" && (
        expenses.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem despesas registadas para este imóvel.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((e) => {
                const cat = e.expense_categories as unknown as { name: string } | null;
                return (
                  <TableRow key={e.id}>
                    <TableCell>{formatDate(e.expense_date)}</TableCell>
                    <TableCell>{e.description}</TableCell>
                    <TableCell>{cat?.name ?? "—"}</TableCell>
                    <TableCell>{formatCurrency(e.amount_total)}</TableCell>
                    <TableCell>
                      <RentStatusBadge status={e.status === "pago" ? "paga" : "por_cobrar"} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )
      )}

      {tab === "documents" && (
        documents.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Sem documentos para este imóvel.</p>
            <Link href="/documents"><Button variant="outline">Ir para o Arquivo Digital</Button></Link>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ficheiro</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Data do documento</TableHead>
                <TableHead>Carregado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.original_filename}</TableCell>
                  <TableCell>{DOCUMENT_TYPE_LABELS[d.document_type as DocumentType]}</TableCell>
                  <TableCell>{formatDate(d.document_date)}</TableCell>
                  <TableCell>{formatDate(d.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      )}

      {tab === "fiscal" && fiscalState && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Situação fiscal</CardTitle></CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Contrato comunicado à AT</dt>
                <dd>
                  {fiscalState.active_lease_reported === null
                    ? "— (sem contrato ativo)"
                    : fiscalState.active_lease_reported
                      ? "Sim"
                      : "Não"}
                </dd>
                <dt className="text-muted-foreground">N.º contrato AT</dt>
                <dd>{fiscalState.at_contract_number ?? "—"}</dd>
                <dt className="text-muted-foreground">Recibos emitidos</dt>
                <dd>{fiscalState.receipts_issued}</dd>
                <dt className="text-muted-foreground">Recibos por emitir</dt>
                <dd className={fiscalState.receipts_pending > 0 ? "font-medium text-amber-600" : ""}>
                  {fiscalState.receipts_pending}
                </dd>
                <dt className="text-muted-foreground">Despesas sem documento</dt>
                <dd className={fiscalState.expenses_without_document > 0 ? "font-medium text-amber-600" : ""}>
                  {fiscalState.expenses_without_document}
                </dd>
                <dt className="text-muted-foreground">Total de despesas</dt>
                <dd>{formatCurrency(fiscalState.expenses_total)}</dd>
                <dt className="text-muted-foreground">Seguro registado</dt>
                <dd>{fiscalState.insurance_registered ? "Sim" : "Não"}</dd>
                <dt className="text-muted-foreground">Validade do seguro</dt>
                <dd>{formatDate(fiscalState.insurance_expiry)}</dd>
                <dt className="text-muted-foreground">Certificado energético válido</dt>
                <dd>{fiscalState.energy_certificate_valid ? "Sim" : "Não"}</dd>
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Alertas fiscais</CardTitle></CardHeader>
            <CardContent>
              {fiscalState.alerts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem alertas — situação fiscal em dia.</p>
              ) : (
                <ul className="space-y-2">
                  {fiscalState.alerts.map((a) => (
                    <li key={a}>
                      <Badge tone="purple">{a}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
