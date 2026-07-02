import { Building2 } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createOrganization } from "@/server/actions/organizations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ErrorBanner } from "@/components/error-banner";

export const metadata = { title: "Criar organização" };

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Se já tem organização, seguir para o dashboard
  const { data: membership } = await supabase
    .from("organization_members")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (membership) redirect("/dashboard");

  // Se o utilizador corresponde a um inquilino, encaminhar para o portal
  const { data: tenantId } = await supabase.rpc("claim_tenant_profile");
  if (tenantId) redirect("/portal");

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2 text-primary">
            <Building2 className="h-6 w-6" />
            <span className="font-bold">Gestor Patrimonial Online</span>
          </div>
          <CardTitle>Criar organização</CardTitle>
          <CardDescription>
            A organização agrupa os seus imóveis, contratos e documentos. Os dados
            de cada organização são totalmente isolados (multi-tenant).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ErrorBanner message={error} />
          <form action={createOrganization} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome da organização</Label>
              <Input
                id="name"
                name="name"
                required
                placeholder="Ex.: Património Familiar Silva"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tax_number">NIF (opcional)</Label>
              <Input id="tax_number" name="tax_number" maxLength={9} />
            </div>
            <Button type="submit" className="w-full">
              Criar e continuar
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
