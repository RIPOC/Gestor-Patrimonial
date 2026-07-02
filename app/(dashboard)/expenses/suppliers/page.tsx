import Link from "next/link";
import { Truck } from "lucide-react";
import { getOrgContext } from "@/server/services/org-service";
import { toggleSupplierActive } from "@/server/actions/suppliers";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { Supplier } from "@/lib/types";

export const metadata = { title: "Fornecedores" };

export default async function SuppliersPage() {
  const { supabase, organizationId } = await getOrgContext();

  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("*")
    .eq("organization_id", organizationId)
    .order("name");

  const list = (suppliers ?? []) as Supplier[];

  return (
    <div>
      <PageHeader
        title="Fornecedores"
        description="Prestadores de serviços e fornecedores associados a despesas e ocorrências."
        actionLabel="Novo fornecedor"
        actionHref="/expenses/suppliers/new"
      >
        <Link href="/expenses">
          <Button variant="outline">← Despesas</Button>
        </Link>
      </PageHeader>

      {list.length === 0 ? (
        <EmptyState
          icon={<Truck className="h-10 w-10" />}
          title="Ainda não existem fornecedores"
          description="Registe fornecedores para os associar rapidamente a despesas e ocorrências."
          actionLabel="Criar fornecedor"
          actionHref="/expenses/suppliers/new"
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>NIF</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((s) => {
              const toggleAction = toggleSupplierActive.bind(null, s.id, !s.is_active);
              return (
                <TableRow key={s.id}>
                  <TableCell>
                    <Link href={`/expenses/suppliers/${s.id}/edit`} className="font-medium text-primary hover:underline">
                      {s.name}
                    </Link>
                  </TableCell>
                  <TableCell>{s.tax_number ?? "—"}</TableCell>
                  <TableCell>{s.email ?? "—"}</TableCell>
                  <TableCell>{s.phone ?? "—"}</TableCell>
                  <TableCell>
                    <form action={toggleAction}>
                      <button type="submit">
                        <Badge tone={s.is_active ? "green" : "gray"}>
                          {s.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </button>
                    </form>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
