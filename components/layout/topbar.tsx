import Link from "next/link";
import { LogOut, Building2, Bell } from "lucide-react";
import { signOut } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";

export function Topbar({
  organizationName,
  userEmail,
  unreadCount,
}: {
  organizationName: string | null;
  userEmail: string | null;
  unreadCount: number;
}) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Building2 className="h-4 w-4" />
        <span className="font-medium text-foreground">
          {organizationName ?? "Sem organização"}
        </span>
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
