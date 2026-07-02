import Link from "next/link";
import { LogOut, Bell, Settings } from "lucide-react";
import { signOut } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { OrgSwitcher } from "@/components/layout/org-switcher";
import type { OrgMembership } from "@/server/services/org-service";

export function Topbar({
  organizations,
  currentOrganizationId,
  userEmail,
  unreadCount,
}: {
  organizations: OrgMembership[];
  currentOrganizationId: string;
  userEmail: string | null;
  unreadCount: number;
}) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-5">
      <div className="flex items-center gap-2">
        <OrgSwitcher organizations={organizations} currentOrganizationId={currentOrganizationId} />
        <Link
          href="/settings/organizations"
          title="Gerir organizações"
          className="text-muted-foreground hover:text-foreground"
        >
          <Button variant="ghost" size="sm" type="button">
            <Settings className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
      <div className="flex items-center gap-3">
        <Link href="/notifications" className="relative" title="Notificações">
          <Button variant="ghost" size="sm" type="button">
            <Bell className="h-4 w-4" />
          </Button>
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>
        <span className="hidden text-sm text-muted-foreground sm:inline">
          {userEmail}
        </span>
        <form action={signOut}>
          <Button variant="ghost" size="sm" type="submit" title="Terminar sessão">
            <LogOut className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </header>
  );
}
