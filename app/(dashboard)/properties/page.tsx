import Link from "next/link";
import { Building2, FileUp } from "lucide-react";
import { getOrgContext } from "@/server/services/org-service";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBanner } from "@/components/error-banner";
import { PropertyStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PROPERTY_TYPE_LABELS, type Property } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Imóveis" };

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { supabase, organizationId } = await getOrgContext();

  const { data: properties } = await supabase
    .from("properties")
    .select("*")
    .eq("organization_id", organizationId)
    .order("name");

  const list = (properties ?? []) as Property[];

  return (
    <div>
      <PageHeader
        title="Imóveis"
        description="Carteira de imóveis e frações."
        actionLabel="Novo imóvel"
        actionHref="/properties/new"
      >
        <Link href="/properties/import-caderneta">
          <Button variant="outline">
            <FileUp className="h-4 w-4" /> Importar caderneta predial
          </Button>
        </Link>
      </PageHeader>
      <ErrorBanner message={error} />

      {list.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-10 w-10" />}
          title="Ainda não existem imóveis"
          description="Registe o primeiro imóvel da carteira para começar a gerir contratos e rendas."
          actionLabel="Criar imóvel"
          actionHref="/properties/new"
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Designação</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Concelho</TableHead>
              <TableHead>VPT</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-xs">{p.internal_code ?? "—"}</TableCell>
                <TableCell>
                  <Link
                    href={`/properties/${p.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {p.name}
                  </Link>
                </TableCell>
                <TableCell>{PROPERTY_TYPE_LABELS[p.property_type]}</TableCell>
                <TableCell>{p.municipality ?? "—"}</TableCell>
                <TableCell>{formatCurrency(p.taxable_value)}</TableCell>
                <TableCell>
                  <PropertyStatusBadge status={p.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
