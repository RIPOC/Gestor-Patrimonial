import { redirect } from "next/navigation";
import { Home, LogOut } from "lucide-react";
import {
  getTenantContextOrNull,
  getOrgContextOrNull,
} from "@/server/services/org-service";
import { signOut } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tenantCtx = await getTenantContextOrNull();

  if (!tenantCtx) {
    // Não é inquilino: se for gestor/admin vai para o dashboard, senão login
    const orgCtx = await getOrgContextOrNull();
    redirect(orgCtx ? "/dashboard" : "/login");
  }

  return (
    <div className="min-h-screen">
      <header className="flex h-14 items-center justify-between border-b border-border bg-card px-5">
        <div className="flex items-center gap-2">
          <Home className="h-5 w-5 text-primary" />
          <span className="text-sm font-bold">Portal do Inquilino</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {tenantCtx.tenantName}
          </span>
          <form action={signOut}>
            <Button variant="ghost" size="sm" type="submit" title="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-6">{children}</main>
    </div>
  );
}
