import Link from "next/link";
import { Building2 } from "lucide-react";
import { createAdditionalOrganization } from "@/server/actions/organizations";
import { PageHeader } from "@/components/layout/page-header";
import { ErrorBanner } from "@/components/error-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const metadata = { title: "Nova organização" };

export default async function NewOrganizationPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div>
      <PageHeader title="Nova organização">
        <Link href="/settings/organizations">
          <Button variant="outline">← Organizações</Button>
        </Link>
      </PageHeader>
      <ErrorBanner message={error} />

      <Card className="max-w-md">
        <CardHeader>
          <div className="mb-1 flex items-center gap-2 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <CardTitle>Criar organização</CardTitle>
          <CardDescription>
            Fica automaticamente como administrador desta nova organização, com dados
            totalmente separados das restantes. Podes trocar entre organizações a qualquer
            momento no topo da aplicação.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createAdditionalOrganization} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome da organização</Label>
              <Input id="name" name="name" required placeholder="Ex.: Património Silva & Filhos" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tax_number">NIF (opcional)</Label>
              <Input id="tax_number" name="tax_number" maxLength={9} />
            </div>
            <Button type="submit" className="w-full">Criar e mudar para esta</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
