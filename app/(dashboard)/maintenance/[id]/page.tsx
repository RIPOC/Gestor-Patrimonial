import Link from "next/link";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { getOrgContext } from "@/server/services/org-service";
import { updateMaintenanceStatus } from "@/server/actions/maintenance";
import { downloadDocument, uploadLinkedDocument } from "@/server/actions/documents";
import { nextMaintenanceStatus } from "@/server/services/maintenance-service";
import { PageHeader } from "@/components/layout/page-header";
import { ErrorBanner } from "@/components/error-banner";
import { MaintenanceStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DOCUMENT_TYPE_LABELS,
  MAINTENANCE_PRIORITY_LABELS,
  MAINTENANCE_STATUS_LABELS,
  type DocumentType,
  type MaintenancePriority,
  type MaintenanceStatus,
} from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata = { title: "Ocorrência" };

export default async function MaintenanceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const { supabase, organizationId } = await getOrgContext();

  const { data: maintenanceCase } = await supabase
    .from("maintenance_cases")
    .select("*, properties(id, name), tenants(id, name), suppliers(id, name)")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!maintenanceCase) notFound();

  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .eq("maintenance_case_id", id)
    .order("created_at", { ascending: false });

  const property = maintenanceCase.properties as unknown as { id: string; name: string } | null;
  const tenant = maintenanceCase.tenants as unknown as { id: string; name: string } | null;
  const supplier = maintenanceCase.suppliers as unknown as { id: string; name: string } | null;
  const status = maintenanceCase.status as MaintenanceStatus;
  const suggestedNext = nextMaintenanceStatus(status);
  const advanceAction = suggestedNext ? updateMaintenanceStatus.bind(null, id, suggestedNext) : null;
  const cancelAction = updateMaintenanceStatus.bind(null, id, "cancelada");

  return (
    <div>
      <PageHeader
        title={maintenanceCase.title}
        description={property?.name}
      >
        <MaintenanceStatusBadge status={status} />
        <Link href={`/maintenance/${id}/edit`}>
          <Button variant="outline">Editar</Button>
        </Link>
      </PageHeader>
      <ErrorBanner message={error} />

      {!["concluida", "cancelada"].includes(status) && (
        <div className="mb-6 flex flex-wrap gap-2">
          {advanceAction && (
            <form action={advanceAction}>
              <Button type="submit">
                Avançar para: {MAINTENANCE_STATUS_LABELS[suggestedNext as MaintenanceStatus]}
              </Button>
            </form>
          )}
          <form action={cancelAction}>
            <Button type="submit" variant="destructive">Cancelar ocorrência</Button>
          </form>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Detalhes</CardTitle></CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Prioridade</dt>
                <dd>{MAINTENANCE_PRIORITY_LABELS[maintenanceCase.priority as MaintenancePriority]}</dd>
                <dt className="text-muted-foreground">Data de abertura</dt>
                <dd>{formatDate(maintenanceCase.opened_at)}</dd>
                <dt className="text-muted-foreground">Data prevista</dt>
                <dd>{formatDate(maintenanceCase.expected_date)}</dd>
                <dt className="text-muted-foreground">Data de conclusão</dt>
                <dd>{formatDate(maintenanceCase.completed_at)}</dd>
                <dt className="text-muted-foreground">Inquilino</dt>
                <dd>{tenant?.name ?? "—"}</dd>
                <dt className="text-muted-foreground">Fornecedor</dt>
                <dd>{supplier?.name ?? "—"}</dd>
                <dt className="text-muted-foreground">Custo estimado</dt>
                <dd>{formatCurrency(maintenanceCase.estimated_cost)}</dd>
                <dt className="text-muted-foreground">Custo real</dt>
                <dd>{formatCurrency(maintenanceCase.actual_cost)}</dd>
              </dl>
              {maintenanceCase.description && (
                <div className="mt-4 border-t border-border pt-4">
                  <p className="text-sm text-muted-foreground">{maintenanceCase.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="self-start">
          <CardHeader><CardTitle>Fotos e documentos</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {(documents ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem ficheiros anexados.</p>
            ) : (
              <ul className="space-y-2">
                {(documents ?? []).map((d) => {
                  const dl = downloadDocument.bind(null, d.id);
                  return (
                    <li key={d.id} className="flex items-center justify-between gap-2 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium" title={d.original_filename}>{d.original_filename}</p>
                        <p className="text-xs text-muted-foreground">
                          {DOCUMENT_TYPE_LABELS[d.document_type as DocumentType]} · {formatDate(d.created_at)}
                        </p>
                      </div>
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
              <input type="hidden" name="maintenance_case_id" value={id} />
              <input type="hidden" name="property_id" value={maintenanceCase.property_id ?? ""} />
              <input type="hidden" name="redirect_to" value={`/maintenance/${id}`} />
              <div className="space-y-1.5">
                <Label htmlFor="doc_file">Carregar ficheiro</Label>
                <Input id="doc_file" name="file" type="file" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="doc_type">Tipo</Label>
                <Select id="doc_type" name="document_type" defaultValue="fotografia">
                  <option value="fotografia">Fotografia</option>
                  <option value="orcamento">Orçamento</option>
                  <option value="fatura_despesa">Fatura</option>
                  <option value="vistoria">Vistoria</option>
                  <option value="outro">Outro</option>
                </Select>
              </div>
              <Button type="submit" size="sm" className="w-full">Carregar</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
