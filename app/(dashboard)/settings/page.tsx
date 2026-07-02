import Link from "next/link";
import { Zap, Landmark, Building2 } from "lucide-react";
import { getOrgContext } from "@/server/services/org-service";
import { runAutomationsNow } from "@/server/actions/automations";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Configurações" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ automation?: string }>;
}) {
  const { automation } = await searchParams;
  const { supabase, organizationId, user, organizations } = await getOrgContext();

  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", organizationId)
    .single();

  const { data: members } = await supabase
    .from("organization_members")
    .select("role, is_active, profiles:user_id(full_name, email)")
    .eq("organization_id", organizationId);

  return (
    <div>
      <PageHeader title="Configurações" description="Organização, membros e automatismos." />
      {automation && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Automatismos executados: {automation}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Organização</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Nome</dt>
              <dd className="font-medium">{org?.name}</dd>
              <dt className="text-muted-foreground">NIF</dt>
              <dd>{org?.tax_number ?? "—"}</dd>
              <dt className="text-muted-foreground">País</dt>
              <dd>{org?.country ?? "Portugal"}</dd>
            </dl>
            <Link href="/settings/organizations" className="mt-4 inline-block">
              <Button variant="outline" size="sm">
                <Building2 className="h-4 w-4" />
                {organizations.length > 1 ? `Trocar organização (${organizations.length})` : "Gerir organizações"}
              </Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Membros</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {(members ?? []).map((m, i) => {
                const profile = m.profiles as unknown as { full_name: string | null; email: string | null } | null;
                return (
                  <li key={i} className="flex justify-between">
                    <span>{profile?.full_name || profile?.email || "—"}</span>
                    <span className="text-muted-foreground">{m.role}</span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">
              Sessão atual: {user.email}
            </p>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Automatismos</CardTitle>
            <CardDescription>
              Todos os dias às 06:00 (Vercel Cron), a plataforma gera as rendas em falta dos contratos
              ativos, marca rendas vencidas como em atraso e recalcula os alertas. Pode forçar a
              execução agora, sem esperar pelo próximo ciclo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={runAutomationsNow}>
              <Button type="submit"><Zap className="h-4 w-4" /> Executar automatismos agora</Button>
            </form>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Integração AT</CardTitle>
            <CardDescription>
              Comunicação de contratos e emissão de recibos pelo webservice oficial da AT (SOAP/WSDL).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/settings/at-integration">
              <Button variant="outline"><Landmark className="h-4 w-4" /> Ver estado da integração</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
