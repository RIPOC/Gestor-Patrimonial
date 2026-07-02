import Link from "next/link";
import { UserRound } from "lucide-react";
import { getOrgContext } from "@/server/services/org-service";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBanner } from "@/components/error-banner";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { TENANT_TYPE_LABELS, type Tenant } from "@/lib/types";

export const metadata = { title: "Inquilinos" };

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { supabase, organizationId } = await getOrgContext();

  const { data: tenants } = await supabase
    .from("tenants")
    .select("*")
    .eq("organization_id", organizationId)
    .order("name");

  const list = (tenants ?? []) as Tenant[];

  return (
    <div>
      <PageHeader
        title="Inquilinos"
        description="Pessoas e entidades com contratos de arrendamento."
        actionLabel="Novo inquilino"
        actionHref="/tenants/new"
      />
      <ErrorBanner message={error} />

      {list.length === 0 ? (
        <EmptyState
          icon={<UserRound className="h-10 w-10" />}
          title="Ainda não existem inquilinos"
          description="Registe inquilinos para os poder associar a contratos de arrendamento."
          actionLabel="Criar inquilino"
          actionHref="/tenants/new"
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>NIF</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  <Link href={`/tenants/${t.id}`} className="font-medium text-primary hover:underline">
                    {t.name}
                  </Link>
                </TableCell>
                <TableCell>{t.tax_number ?? "—"}</TableCell>
                <TableCell>{TENANT_TYPE_LABELS[t.tenant_type]}</TableCell>
                <TableCell>{t.email ?? "—"}</TableCell>
                <TableCell>{t.phone ?? "—"}</TableCell>
                <TableCell>
                  <Badge tone={t.is_active ? "green" : "gray"}>
                    {t.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
