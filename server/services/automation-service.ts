import type { SupabaseClient } from "@supabase/supabase-js";
import { generateRentsForLease } from "./rent-service";
import { recomputeReminders } from "./reminder-service";
import { notifyOrgManagers } from "./notification-service";

export interface AutomationSummary {
  rentsGenerated: number;
  rentsFlippedToOverdue: number;
  reminders: Record<string, { created: number; resolved: number }>;
  notificationsSent: number;
}

/**
 * Job mensal/diário (secção 25 e 37 — Fase 9):
 *  1. gera rendas em falta para contratos ativos (mantém sempre ~12 meses à frente);
 *  2. atualiza rendas vencidas sem pagamento para 'em_atraso';
 *  3. recalcula lembretes a partir do estado atual dos dados;
 *  4. notifica os gestores da organização sobre alertas críticos novos.
 * Idempotente — seguro para correr todos os dias.
 */
export async function runOrganizationAutomations(
  supabase: SupabaseClient,
  organizationId: string
): Promise<AutomationSummary> {
  // 1) Gerar rendas em falta para contratos ativos
  const { data: activeLeases } = await supabase
    .from("leases")
    .select("id, property_id, unit_id, owner_id, start_date, end_date, current_rent, due_day")
    .eq("organization_id", organizationId)
    .eq("status", "ativo");

  let rentsGenerated = 0;
  for (const lease of activeLeases ?? []) {
    const { inserted } = await generateRentsForLease(supabase, {
      organizationId,
      leaseId: lease.id,
      propertyId: lease.property_id,
      unitId: lease.unit_id,
      ownerId: lease.owner_id,
      startDate: lease.start_date,
      endDate: lease.end_date,
      rentAmount: Number(lease.current_rent),
      dueDay: lease.due_day,
      createdBy: null,
    });
    rentsGenerated += inserted;
  }

  // 2) Rendas vencidas sem pagamento -> em_atraso
  const pad = (n: number) => String(n).padStart(2, "0");
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  const { data: flipped } = await supabase
    .from("rents")
    .update({ status: "em_atraso" })
    .eq("organization_id", organizationId)
    .in("status", ["prevista", "por_cobrar"])
    .lt("due_date", todayStr)
    .select("id");

  const rentsFlippedToOverdue = flipped?.length ?? 0;

  // 3) Recalcular lembretes
  const reminders = await recomputeReminders(supabase, organizationId);
  const newAlerts = Object.values(reminders).reduce((sum, r) => sum + r.created, 0);

  // 4) Notificar gestores se houver alertas novos
  let notificationsSent = 0;
  if (newAlerts > 0) {
    await notifyOrgManagers(supabase, organizationId, {
      title: `${newAlerts} novo(s) alerta(s)`,
      body: "Existem novos alertas na gestão de arrendamentos. Consulte o dashboard.",
      link: "/dashboard",
    });
    notificationsSent = newAlerts;
  }

  return { rentsGenerated, rentsFlippedToOverdue, reminders, notificationsSent };
}
