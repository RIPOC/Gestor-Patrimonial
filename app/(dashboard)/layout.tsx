import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import {
  getOrgContextOrNull,
  getTenantContextOrNull,
} from "@/server/services/org-service";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getOrgContextOrNull();

  if (!ctx) {
    // Utilizador sem organização: se for inquilino, vai para o portal
    const tenantCtx = await getTenantContextOrNull();
    redirect(tenantCtx ? "/portal" : "/onboarding");
  }

  const { count: unreadCount } = await ctx.supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", ctx.user.id)
    .eq("is_read", false);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          organizationName={ctx.organizationName}
          userEmail={ctx.user.email ?? null}
          unreadCount={unreadCount ?? 0}
        />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
