import Link from "next/link";
import { Users } from "lucide-react";
import { getOrgContext } from "@/server/services/org-service";
import { deleteOwner, toggleOwnerActive } from "@/server/actions/owners";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBanner } from "@/components/error-banner";
import { DeleteButton } from "@/components/delete-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OWNER_TYPE_LABELS, type Owner } from "@/lib/types";

export const metadata = { title: "Proprietários" };

export default async function OwnersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { supabase, organizationId } = await getOrgContext();

  const { data: owners } = await supabase
    .from("owners")
    .select("*")
    .eq("organization_id", organizationId)
    .order("name");

  const list = (owners ?? []) as Owner[];

  return (
    <div>
      <PageHeader
        title="Proprietários"
        description="Pessoas e entidades detentoras dos imóveis."
        actionLabel="Novo proprietário"
        actionHref="/owners/new"
      />
      <ErrorBanner message={error} />

      {list.length === 0 ? (
        <EmptyState
          icon={<Users className="h-10 w-10" />}
          title="Ainda não existem proprietários"
          description="Comece por registar o primeiro proprietário para depois associar imóveis e contratos."
          actionLabel="Criar proprietário"
          actionHref="/owners/new"
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
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((owner) => (
              <TableRow key={owner.id}>
                <TableCell>
                  <Link
                    href={`/owners/${owner.id}/edit`}
                    className="font-medium text-primary hover:underline"
                  >
                    {owner.name}
                  </Link>
                </TableCell>
                <TableCell>{owner.tax_number ?? "—"}</TableCell>
                <TableCell>{OWNER_TYPE_LABELS[owner.owner_type]}</TableCell>
                <TableCell>{owner.email ?? "—"}</TableCell>
                <TableCell>{owner.phone ?? "—"}</TableCell>
                <TableCell>
                  <Badge tone={owner.is_active ? "green" : "gray"}>
                    {owner.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <form action={toggleOwnerActive.bind(null, owner.id, !owner.is_active)}>
                      <Button type="submit" variant="outline" size="sm">
                        {owner.is_active ? "Desativar" : "Ativar"}
                      </Button>
                    </form>
                    <DeleteButton
                      action={deleteOwner.bind(null, owner.id)}
                      confirmMessage={`Eliminar o proprietário "${owner.name}"? Esta ação não pode ser desfeita.`}
                      size="sm"
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
