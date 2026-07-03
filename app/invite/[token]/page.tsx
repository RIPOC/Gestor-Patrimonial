import { Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { acceptInvite } from "@/server/actions/organizations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ErrorBanner } from "@/components/error-banner";
import { MEMBER_ROLE_LABELS, type MemberRole } from "@/lib/types";

export const metadata = { title: "Convite" };

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: preview } = (await supabase
    .rpc("get_invite_preview", { p_token: token })
    .maybeSingle()) as {
    data: { organization_name: string | null; role: MemberRole | null; is_valid: boolean } | null;
  };

  const isValid = preview?.is_valid && preview?.organization_name;
  const nextPath = `/invite/${token}`;

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2 text-primary">
            <Building2 className="h-6 w-6" />
            <span className="font-bold">Gestor Patrimonial Online</span>
          </div>
          <CardTitle>Convite</CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorBanner message={error} />

          {!isValid ? (
            <p className="text-sm text-muted-foreground">
              Este convite é inválido, já foi utilizado ou expirou. Peça um novo link a quem o
              convidou.
            </p>
          ) : (
            <>
              <CardDescription className="mb-6">
                Foi convidado para <strong>{preview!.organization_name}</strong> como{" "}
                <strong>
                  {MEMBER_ROLE_LABELS[preview!.role as MemberRole] ?? preview!.role}
                </strong>
                .
              </CardDescription>

              {user ? (
                <form action={acceptInvite.bind(null, token)}>
                  <Button type="submit" className="w-full">
                    Aceitar convite
                  </Button>
                </form>
              ) : (
                <div className="space-y-3">
                  <a href={`/signup?next=${encodeURIComponent(nextPath)}`} className="block">
                    <Button type="button" className="w-full">
                      Criar conta e aceitar
                    </Button>
                  </a>
                  <a href={`/login?next=${encodeURIComponent(nextPath)}`} className="block">
                    <Button type="button" variant="outline" className="w-full">
                      Já tenho conta — entrar
                    </Button>
                  </a>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
