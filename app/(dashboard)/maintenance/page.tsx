import Link from "next/link";
import { Wrench } from "lucide-react";
import { getOrgContext } from "@/server/services/org-service";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBanner } from "@/components/error-banner";
import { Badge } from "@/components/ui/badge";
import { MaintenanceStatusBadge } from "@/components/status-badge";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  MAINTENANCE_PRIORITY_LABELS,
  MAINTENANCE_STATUS_LABELS,
  type MaintenancePriority,
  type MaintenanceStatus,
} from "@/lib/types";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Ocorrências" };

const PRIORITY_TONE: Record<MaintenancePriority, "gray" | "blue" | "yellow" | "red"> = {
  baixa: "gray",
  media: "blue",
  alta: "yellow",
  urgente: "red",
};

export default async function MaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; status?: string; property?: string }>;
}) {
  const { error, status: statusFilter, property: propertyFilter } = await searchParams;
  const { supabase, organizationId } = await getOrgContext();

  let query = supabase
    .from("maintenance_cases")
    .select("*, properties(id, name)")
    .eq("organization_id", organizationId)
    .order("opened_at", { ascending: false });

  if (statusFilter) query = query.eq("status", statusFilter);
  if (propertyFilter) query = query.eq("property_id", propertyFilter);

  const [casesRes, propertiesRes] = await Promise.all([
    query,
    supabase.from("properties").select("id, name").eq("organization_id", organizationId).order("name"),
  ]);

  const cases = casesRes.data ?? [];
  const properties = propertiesRes.data ?? [];
  const openCount = cases.filter((c) => !["concluida", "cancelada"].includes(c.status)).length;

  return (
    <div>
      <PageHeader
        title="Ocorrências e Manutenção"
        description="Avarias, obras, vistorias e reparações."
        actionLabel="Nova ocorrência"
        actionHref="/maintenance/new"
      />
      <ErrorBanner message={error} />

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="property">Imóvel</Label>
          <Select id="property" name="property" defaultValue={propertyFilter ?? ""} className="w-56">
            <option value="">Todos</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="status">Estado</Label>
          <Select id="status" name="status" defaultValue={statusFilter ?? ""} className="w-48">
            <option value="">Todos</option>
            {Object.entries(MAINTENANCE_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
        </div>
        <Button type="submit" variant="outline">Filtrar</Button>
      </form>

      {cases.length === 0 ? (
        <EmptyState
          icon={<Wrench className="h-10 w-10" />}
          title="Sem ocorrências"
          description="Registe avarias, obras e vistorias por imóvel."
          actionLabel="Criar ocorrência"
          actionHref="/maintenance/new"
        />
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            {cases.length} ocorrência(s) · <span className="font-semibold text-foreground">{openCount}</span> em curso
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Imóvel</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Abertura</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cases.map((c) => {
                const prop = c.properties as unknown as { id: string; name: string } | null;
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link href={`/maintenance/${c.id}`} className="font-medium text-primary hover:underline">
                        {c.title}
                      </Link>
                    </TableCell>
                    <TableCell>{prop?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge tone={PRIORITY_TONE[c.priority as MaintenancePriority]}>
                        {MAINTENANCE_PRIORITY_LABELS[c.priority as MaintenancePriority]}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(c.opened_at)}</TableCell>
                    <TableCell><MaintenanceStatusBadge status={c.status as MaintenanceStatus} /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  );
}
