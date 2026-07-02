import { Download, FolderArchive } from "lucide-react";
import { getOrgContext } from "@/server/services/org-service";
import { uploadDocument, downloadDocument } from "@/server/actions/documents";
import { PageHeader } from "@/components/layout/page-header";
import { ErrorBanner } from "@/components/error-banner";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { DOCUMENT_TYPE_LABELS, type DocumentType } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Arquivo Digital" };

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; property?: string; type?: string }>;
}) {
  const { error, property: propertyFilter, type: typeFilter } = await searchParams;
  const { supabase, organizationId } = await getOrgContext();

  let query = supabase
    .from("documents")
    .select("*, properties(id, name)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (propertyFilter) query = query.eq("property_id", propertyFilter);
  if (typeFilter) query = query.eq("document_type", typeFilter);

  const [documentsRes, propertiesRes, leasesRes, tenantsRes] = await Promise.all([
    query,
    supabase.from("properties").select("id, name").eq("organization_id", organizationId).order("name"),
    supabase
      .from("leases")
      .select("id, properties(name), lease_tenants(tenants(name))")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
    supabase.from("tenants").select("id, name").eq("organization_id", organizationId).order("name"),
  ]);

  const documents = documentsRes.data ?? [];
  const properties = propertiesRes.data ?? [];
  const tenants = tenantsRes.data ?? [];
  const leases = (leasesRes.data ?? []).map((l) => {
    const prop = l.properties as unknown as { name: string } | null;
    const leaseTenants = (l.lease_tenants ?? []) as unknown as {
      tenants: { name: string } | null;
    }[];
    const tenantNames = leaseTenants
      .map((lt) => lt.tenants?.name)
      .filter(Boolean)
      .join(", ");
    return { id: l.id, label: `${prop?.name ?? "?"} — ${tenantNames || "sem inquilino"}` };
  });

  return (
    <div>
      <PageHeader
        title="Arquivo Digital"
        description="Documentos privados com hash SHA-256 e acesso por links temporários (signed URLs)."
      />
      <ErrorBanner message={error} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1 self-start">
          <CardHeader>
            <CardTitle>Carregar documento</CardTitle>
            <CardDescription>
              O ficheiro é guardado num bucket privado — nunca fica público.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={uploadDocument} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="file">Ficheiro * (máx. 25 MB)</Label>
                <Input id="file" name="file" type="file" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="document_type">Tipo de documento *</Label>
                <Select id="document_type" name="document_type" required defaultValue="outro">
                  {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="property_id">Imóvel</Label>
                <Select id="property_id" name="property_id" defaultValue="">
                  <option value="">— Sem associação —</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lease_id">Contrato</Label>
                <Select id="lease_id" name="lease_id" defaultValue="">
                  <option value="">— Sem associação —</option>
                  {leases.map((l) => (
                    <option key={l.id} value={l.id}>{l.label}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tenant_id">Inquilino</Label>
                <Select id="tenant_id" name="tenant_id" defaultValue="">
                  <option value="">— Sem associação —</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="document_date">Data do documento</Label>
                <Input id="document_date" name="document_date" type="date" />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="is_shared_with_tenant" className="h-4 w-4" />
                Partilhar com o inquilino
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="is_shared_with_accountant" className="h-4 w-4" />
                Partilhar com o contabilista
              </label>
              <Button type="submit" className="w-full">Carregar</Button>
            </form>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          {/* Filtros */}
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="filter_property">Filtrar por imóvel</Label>
              <Select id="filter_property" name="property" defaultValue={propertyFilter ?? ""} className="w-56">
                <option value="">Todos</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="filter_type">Filtrar por tipo</Label>
              <Select id="filter_type" name="type" defaultValue={typeFilter ?? ""} className="w-56">
                <option value="">Todos</option>
                {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </div>
            <Button type="submit" variant="outline">Filtrar</Button>
          </form>

          {documents.length === 0 ? (
            <EmptyState
              icon={<FolderArchive className="h-10 w-10" />}
              title="Arquivo vazio"
              description="Carregue contratos, recibos, faturas, certificados e outros documentos. Cada ficheiro guarda hash SHA-256 para controlo de integridade."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ficheiro</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Imóvel</TableHead>
                  <TableHead>Tamanho</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Partilha</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((d) => {
                  const prop = d.properties as unknown as { name: string } | null;
                  const downloadAction = downloadDocument.bind(null, d.id);
                  return (
                    <TableRow key={d.id}>
                      <TableCell className="max-w-52 truncate font-medium" title={d.original_filename}>
                        {d.original_filename}
                      </TableCell>
                      <TableCell>
                        {DOCUMENT_TYPE_LABELS[d.document_type as DocumentType]}
                      </TableCell>
                      <TableCell>{prop?.name ?? "—"}</TableCell>
                      <TableCell>{formatBytes(d.file_size)}</TableCell>
                      <TableCell>{formatDate(d.document_date ?? d.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {d.is_shared_with_tenant && <Badge tone="blue">Inquilino</Badge>}
                          {d.is_shared_with_accountant && <Badge tone="purple">Contab.</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <form action={downloadAction}>
                          <Button variant="ghost" size="sm" type="submit" title="Descarregar (signed URL)">
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
        </div>
      </div>
    </div>
  );
}
