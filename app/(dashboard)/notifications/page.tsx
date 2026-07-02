import Link from "next/link";
import { Bell, Check } from "lucide-react";
import { getOrgContext } from "@/server/services/org-service";
import { markNotificationRead, markAllNotificationsRead } from "@/server/actions/automations";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Notificações" };

export default async function NotificationsPage() {
  const { supabase, user } = await getOrgContext();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const list = notifications ?? [];
  const hasUnread = list.some((n) => !n.is_read);

  return (
    <div>
      <PageHeader title="Notificações" description="Alertas gerados automaticamente pela plataforma.">
        {hasUnread && (
          <form action={markAllNotificationsRead}>
            <Button type="submit" variant="outline">Marcar todas como lidas</Button>
          </form>
        )}
      </PageHeader>

      {list.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-10 w-10" />}
          title="Sem notificações"
          description="As notificações aparecem aqui quando os automatismos diários detetam alertas novos."
        />
      ) : (
        <ul className="space-y-2">
          {list.map((n) => {
            const markRead = markNotificationRead.bind(null, n.id);
            const content = (
              <div className="flex-1">
                <p className="font-medium">{n.title}</p>
                {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{formatDate(n.created_at)}</p>
              </div>
            );
            return (
              <li
                key={n.id}
                className={`flex items-center gap-3 rounded-lg border border-border p-4 ${n.is_read ? "bg-card" : "bg-blue-50"}`}
              >
                {!n.is_read && <Badge tone="blue">Novo</Badge>}
                {n.link ? (
                  <Link href={n.link} className="flex-1 hover:underline">{content}</Link>
                ) : (
                  content
                )}
                {!n.is_read && (
                  <form action={markRead}>
                    <Button type="submit" variant="ghost" size="sm" title="Marcar como lida">
                      <Check className="h-4 w-4" />
                    </Button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
