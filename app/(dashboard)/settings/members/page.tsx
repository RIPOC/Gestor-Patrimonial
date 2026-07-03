import Link from "next/link";
import { getOrgContext } from "@/server/services/org-service";
import { createInvite, deleteInvite } from "@/server/actions/organizations";
import { PageHeader } from "@/components/layout/page-header";
import { ErrorBanner } from "@/components/error-banner";
import { DeleteButton } from "@/components/delete-button";
import { InviteLink } from "@/components/invite-link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { MEMBER_ROLE_LABELS, type MemberRole } from "@/lib/types";

export const metadata = { title: "Membros" };

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { supabase, organizationId, organizations } = await getOrgContext();

  const currentRole = organizations.find((o) => o.organizationId === organizationId)?.role;
  const isAdmin = currentRole === "org_admin";

  const [membersRes, invitesRes] = await Promise.all([
    supabase
      .from("organization_members")
      .select("id, role, is_active, profiles:user_id(full_name, email)")
      .eq("organization_id", organizationId),
    supabase
      .from("organization_invites")
      .select("id, role, email, token, expires_at, accepted_at")
      .eq("organization_id", organizationId)
      .is("accepted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const members = membersRes.data ?? [];
  const invites = (invitesRes.data ?? []).filter((i) => new Date(i.expires_at) > new Date());

  return (
    <div>
      <PageHeader
        title="Membros"
        description="Pessoas com acesso a esta organização e convites por aceitar."
      >
        <Link href="/settings">
          <Button variant="outline">← Configurações</Button>
        </Link>
      </PageHeader>
      <ErrorBanner message={error} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Membros atuais</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {members.map((m) => {
                const profile = m.profiles as unknown as { full_name: string | null; email: string | null } | null;
                return (
                  <li key={m.id} className="flex items-center justify-between">
                    <span>{profile?.full_name || profile?.email || "—"}</span>
                    <span className="text-muted-foreground">
                      {MEMBER_ROLE_LABELS[m.role as MemberRole] ?? m.role}
                    </span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Convidar membro</CardTitle>
              <CardDescription>
                Gera um link de convite para esta organização. Sem envio automático de email —
                copie e partilhe o link com quem quer convidar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createInvite} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="role">Papel</Label>
                  <Select id="role" name="role" defaultValue="manager">
                    {Object.entries(MEMBER_ROLE_LABELS)
                      .filter(([value]) => value !== "tenant")
                      .map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email (opcional)</Label>
                  <Input id="email" name="email" type="email" placeholder="Restringe o convite a este email" />
                </div>
                <Button type="submit" className="w-full">Gerar convite</Button>
              </form>
            </CardContent>
          </Card>
        )}

        {isAdmin && (
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Convites por aceitar</CardTitle></CardHeader>
            <CardContent>
              {invites.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem convites pendentes.</p>
              ) : (
                <ul className="space-y-4">
                  {invites.map((inv) => (
                    <li key={inv.id} className="space-y-2 rounded-md border border-border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span>
                          {MEMBER_ROLE_LABELS[inv.role as MemberRole] ?? inv.role}
                          {inv.email ? ` — restrito a ${inv.email}` : ""}
                        </span>
                        <DeleteButton
                          action={deleteInvite.bind(null, inv.id)}
                          confirmMessage="Cancelar este convite?"
                          label="Cancelar"
                          size="sm"
                        />
                      </div>
                      <InviteLink token={inv.token} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
