import Link from "next/link";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { getOrgContext } from "@/server/services/org-service";
import { getATIntegrationStatus } from "@/server/services/at-integration-service";
import { runATConnectivityTest } from "@/server/actions/at-integration";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Integração AT" };

const STATUS_LABELS: Record<string, string> = {
  not_configured: "Não configurada",
  configured: "Configurada",
  active: "Ativa",
  suspended: "Suspensa",
  error: "Erro",
};

export default async function ATIntegrationPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string }>;
}) {
  const { result } = await searchParams;
  const { supabase, organizationId } = await getOrgContext();

  const { data: org } = await supabase
    .from("organizations")
    .select("tax_number")
    .eq("id", organizationId)
    .single();

  const status = await getATIntegrationStatus(supabase, organizationId);

  return (
    <div>
      <PageHeader title="Integração AT" description="Comunicação de contratos e emissão de recibos pelo webservice oficial da AT.">
        <Link href="/settings">
          <Button variant="outline">← Configurações</Button>
        </Link>
      </PageHeader>

      {result && (
        <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          {result}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              {status.configured ? (
                <ShieldCheck className="h-5 w-5 text-green-600" />
              ) : (
                <ShieldAlert className="h-5 w-5 text-amber-600" />
              )}
              <CardTitle>Estado da integração</CardTitle>
            </div>
            <CardDescription>
              {status.environment === "mock"
                ? "Modo mock — nenhuma chamada real é feita à AT enquanto não houver certificado configurado."
                : `Ambiente: ${status.environment === "production" ? "Produção" : "Testes"}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Estado</dt>
              <dd><Badge tone={status.configured ? "green" : "yellow"}>{STATUS_LABELS[status.status] ?? status.status}</Badge></dd>
              <dt className="text-muted-foreground">Certificado carregado</dt>
              <dd>{status.configured ? "Sim" : "Não"}</dd>
              <dt className="text-muted-foreground">Validade do certificado</dt>
              <dd>{formatDate(status.certificateExpiresAt)}</dd>
              <dt className="text-muted-foreground">Chave pública da AT carregada</dt>
              <dd>{status.configured ? "Sim" : "Não"}</dd>
              <dt className="text-muted-foreground">Último teste</dt>
              <dd>{formatDate(status.lastTestAt)}</dd>
              <dt className="text-muted-foreground">Último sucesso</dt>
              <dd>{formatDate(status.lastSuccessAt)}</dd>
            </dl>

            <form action={runATConnectivityTest} className="mt-4 space-y-3 border-t border-border pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="taxpayer_nif">NIF do contribuinte</Label>
                <Input id="taxpayer_nif" name="taxpayer_nif" maxLength={9} defaultValue={org?.tax_number ?? ""} />
              </div>
              <Button type="submit" variant="outline">Testar conectividade</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Como ativar</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ol className="list-decimal space-y-2 pl-5">
              <li>Enviar email a <span className="font-mono">asi-cd@at.gov.pt</span> a pedir a chave pública do Sistema de Autenticação e o certificado SSL de testes (modelo em <span className="font-mono">docs/at-arrendamento/CHECKLIST.md</span>).</li>
              <li>Gerar o CSR (RSA 2048 bits) e submeter para assinatura pela AT.</li>
              <li>Configurar as variáveis de ambiente: <span className="font-mono">AT_ENV</span>, <span className="font-mono">AT_CLIENT_CERT_PFX_BASE64</span>, <span className="font-mono">AT_CLIENT_CERT_PFX_PASSWORD</span>, <span className="font-mono">AT_AUTH_PUBLIC_KEY_PEM</span>.</li>
              <li>Testar em ambiente de testes (<span className="font-mono">AT_ENV=test</span>) antes de passar a produção.</li>
              <li>Só depois de validado manualmente no Portal das Finanças, mudar para <span className="font-mono">AT_ENV=production</span> com o certificado de produção.</li>
            </ol>
            <p className="text-xs text-muted-foreground">
              Sem estas variáveis configuradas, a aplicação funciona em modo mock: os botões de comunicação de
              contrato e emissão de recibo AT ficam disponíveis para teste, mas nenhum dado sai para a AT.
              Os modos manual e assistido continuam sempre disponíveis, independentemente deste estado.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
