import Link from "next/link";
import { Check, PlusCircle } from "lucide-react";
import { getOrgContext } from "@/server/services/org-service";
import { switchOrganization } from "@/server/actions/organizations";
import { PageHeader } from "@/components/layout/page-header";
import { ErrorBanner } from "@/components/error-banner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MEMBER_ROLE_LABELS } from "@/lib/types";

export const metadata = { title: "Organizações" };

export default async function OrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { organizations, organizationId } = await getOrgContext();

  return (
    <div>
      <PageHeader
        title="Organizações"
        description="Cada organização tem os seus dados totalmente isolados — imóveis, contratos, documentos e utilizadores próprios."
        actionLabel="Nova organização"
        actionHref="/settings/organizations/new"
      >
        <Link href="/settings">
          <Button variant="outline">← Configurações</Button>
        </Link>
      </PageHeader>
      <ErrorBanner message={error} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {organizations.map((org) => {
          const isActive = org.organizationId === organizationId;
          const switchAction = switchOrganization.bind(null);
          return (
            <Card key={org.organizationId} className={isActive ? "border-primary" : undefined}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{org.organizationName}</CardTitle>
                  {isActive && <Badge tone="green"><Check className="mr-1 h-3 w-3" />Ativa</Badge>}
                </div>
                <CardDescription>{MEMBER_ROLE_LABELS[org.role as keyof typeof MEMBER_ROLE_LABELS] ?? org.role}</CardDescription>
              </CardHeader>
              <CardContent>
                {!isActive && (
                  <form action={switchAction}>
                    <input type="hidden" name="organization_id" value={org.organizationId} />
                    <Button type="submit" variant="outline" size="sm" className="w-full">
                      Mudar para esta
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          );
        })}

        <Link href="/settings/organizations/new">
          <Card className="flex h-full min-h-[140px] items-center justify-center border-dashed transition-colors hover:border-primary hover:bg-muted/40">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <PlusCircle className="h-6 w-6" />
              <span className="text-sm font-medium">Nova organização</span>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
