import Link from "next/link";
import {
  Euro,
  AlertTriangle,
  Building2,
  FileText,
  Receipt,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";
import { getOrgContext } from "@/server/services/org-service";
import { resolveReminder } from "@/server/actions/automations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { REMINDER_TYPE_LABELS, type ReminderType } from "@/lib/types";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { supabase, organizationId } = await getOrgContext();

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const in90days = new Date(now.getTime() + 90 * 24 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);

  const [
    rentsMonth,
    lateRents,
    leasesEnding,
    vacantProps,
    receiptsPending,
    activeLeases,
  ] = await Promise.all([
    supabase
      .from("rents")
      .select("total_amount, received_amount, status")
      .eq("organization_id", organizationId)
      .eq("year", year)
      .eq("month", month),
    supabase
      .from("rents")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .in("status", ["vencida", "em_atraso"]),
    supabase
      .from("leases")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "ativo")
      .not("end_date", "is", null)
      .lte("end_date", in90days),
    supabase
      .from("properties")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "devoluto"),
    supabase
      .from("rents")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .in("status", ["paga", "parcialmente_paga"])
      .eq("receipt_issued", false),
    supabase
      .from("leases")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "ativo"),
  ]);

  const rents = rentsMonth.data ?? [];
  const expected = rents
    .filter((r) => r.status !== "anulada")
    .reduce((sum, r) => sum + Number(r.total_amount), 0);
  const collected = rents.reduce((sum, r) => sum + Number(r.received_amount), 0);

  const { data: expensesMonth } = await supabase
    .from("expenses")
    .select("amount_total")
    .eq("organization_id", organizationId)
    .gte("expense_date", `${year}-${String(month).padStart(2, "0")}-01`);

  const expensesTotal = (expensesMonth ?? []).reduce(
    (sum, e) => sum + Number(e.amount_total),
    0
  );

  const { data: openReminders } = await supabase
    .from("reminders")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("is_resolved", false)
    .order("priority", { ascending: false })
    .order("due_date", { ascending: true })
    .limit(10);

  const cards = [
    {
      title: "Rendas previstas (mês)",
      value: formatCurrency(expected),
      icon: Euro,
      href: "/rents",
      tone: "text-primary",
    },
    {
      title: "Rendas cobradas (mês)",
      value: formatCurrency(collected),
      icon: TrendingUp,
      href: "/rents",
      tone: "text-green-600",
    },
    {
      title: "Rendas em atraso",
      value: String(lateRents.count ?? 0),
      icon: AlertTriangle,
      href: "/rents",
      tone: "text-red-600",
    },
    {
      title: "Despesas do mês",
      value: formatCurrency(expensesTotal),
      icon: Euro,
      href: "/expenses",
      tone: "text-amber-600",
    },
    {
      title: "Resultado líquido (mês)",
      value: formatCurrency(collected - expensesTotal),
      icon: TrendingUp,
      href: "/reports",
      tone: collected - expensesTotal >= 0 ? "text-green-600" : "text-red-600",
    },
    {
      title: "Contratos ativos",
      value: String(activeLeases.count ?? 0),
      icon: FileText,
      href: "/leases",
      tone: "text-primary",
    },
    {
      title: "Contratos a terminar (90 dias)",
      value: String(leasesEnding.count ?? 0),
      icon: FileText,
      href: "/leases",
      tone: "text-amber-600",
    },
    {
      title: "Imóveis devolutos",
      value: String(vacantProps.count ?? 0),
      icon: Building2,
      href: "/properties",
      tone: "text-slate-500",
    },
    {
      title: "Recibos por emitir",
      value: String(receiptsPending.count ?? 0),
      icon: Receipt,
      href: "/receipts",
      tone: "text-blue-600",
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Visão geral da carteira —{" "}
          {new Intl.DateTimeFormat("pt-PT", { month: "long", year: "numeric" }).format(now)}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ title, value, icon: Icon, href, tone }) => (
          <Link key={title} href={href}>
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="flex-row items-center justify-between pb-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${tone}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${tone}`}>{value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Alertas críticos
        </h2>
        {(openReminders ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem alertas em aberto.</p>
        ) : (
          <ul className="space-y-2">
            {(openReminders ?? []).map((r) => {
              const resolve = resolveReminder.bind(null, r.id);
              const tone: "red" | "yellow" | "purple" =
                r.priority === "urgente" || r.priority === "alta"
                  ? "red"
                  : r.priority === "media"
                    ? "yellow"
                    : "purple";
              return (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-2.5 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <Badge tone={tone}>{REMINDER_TYPE_LABELS[r.reminder_type as ReminderType]}</Badge>
                    <span>{r.message}</span>
                    {r.due_date && <span className="text-muted-foreground">{formatDate(r.due_date)}</span>}
                  </div>
                  <form action={resolve}>
                    <Button variant="ghost" size="sm" type="submit" title="Marcar como resolvido">
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Legenda de estados
        </h2>
        <div className="flex flex-wrap gap-2">
          <Badge tone="green">Pago</Badge>
          <Badge tone="yellow">Pendente</Badge>
          <Badge tone="red">Em atraso</Badge>
          <Badge tone="gray">Devoluto</Badge>
          <Badge tone="blue">Recibo por emitir</Badge>
          <Badge tone="purple">Ação fiscal pendente</Badge>
        </div>
      </div>
    </div>
  );
}
