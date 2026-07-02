import type { SupabaseClient } from "@supabase/supabase-js";
import type { MaintenancePriority, ReminderType } from "@/lib/types";

function todayStr(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function daysFromNow(days: number): string {
  const d = new Date(Date.now() + days * 24 * 3600 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

interface ReminderTarget {
  entityId: string;
  dueDate: string | null;
  message: string;
}

/**
 * Sincroniza os lembretes de um tipo com o conjunto atual de entidades que os justificam:
 * cria os que faltam, resolve automaticamente os que já não se aplicam.
 * Idempotente — pode ser chamado tantas vezes quantas necessário (cron diário ou manual).
 */
async function syncReminders(
  supabase: SupabaseClient,
  organizationId: string,
  type: ReminderType,
  entityTable: string,
  priority: MaintenancePriority,
  targets: ReminderTarget[]
): Promise<{ created: number; resolved: number }> {
  const { data: existing } = await supabase
    .from("reminders")
    .select("id, entity_id")
    .eq("organization_id", organizationId)
    .eq("reminder_type", type)
    .eq("is_resolved", false);

  const existingIds = new Set((existing ?? []).map((r) => r.entity_id));
  const targetIds = new Set(targets.map((t) => t.entityId));

  const toCreate = targets.filter((t) => !existingIds.has(t.entityId));
  const toResolve = (existing ?? []).filter((r) => r.entity_id && !targetIds.has(r.entity_id));

  if (toCreate.length > 0) {
    await supabase.from("reminders").insert(
      toCreate.map((t) => ({
        organization_id: organizationId,
        reminder_type: type,
        priority,
        entity_table: entityTable,
        entity_id: t.entityId,
        due_date: t.dueDate,
        message: t.message,
      }))
    );
  }

  if (toResolve.length > 0) {
    await supabase
      .from("reminders")
      .update({ is_resolved: true, resolved_at: new Date().toISOString() })
      .in(
        "id",
        toResolve.map((r) => r.id)
      );
  }

  return { created: toCreate.length, resolved: toResolve.length };
}

/** Recalcula todos os lembretes da organização a partir do estado atual dos dados (secção 25). */
export async function recomputeReminders(supabase: SupabaseClient, organizationId: string) {
  const today = todayStr();
  const results: Record<string, { created: number; resolved: number }> = {};

  // Rendas em atraso
  const { data: overdueRents } = await supabase
    .from("rents")
    .select("id, due_date, outstanding_amount, properties(name)")
    .eq("organization_id", organizationId)
    .eq("status", "em_atraso");
  results.renda_atraso = await syncReminders(
    supabase,
    organizationId,
    "renda_atraso",
    "rents",
    "alta",
    (overdueRents ?? []).map((r) => ({
      entityId: r.id,
      dueDate: r.due_date,
      message: `Renda em atraso — ${(r.properties as unknown as { name: string } | null)?.name ?? "imóvel"}`,
    }))
  );

  // Recibos por emitir
  const { data: pendingReceipts } = await supabase
    .from("rents")
    .select("id, due_date, properties(name)")
    .eq("organization_id", organizationId)
    .in("status", ["paga", "parcialmente_paga"])
    .eq("receipt_issued", false);
  results.recibo_por_emitir = await syncReminders(
    supabase,
    organizationId,
    "recibo_por_emitir",
    "rents",
    "media",
    (pendingReceipts ?? []).map((r) => ({
      entityId: r.id,
      dueDate: r.due_date,
      message: `Recibo por emitir — ${(r.properties as unknown as { name: string } | null)?.name ?? "imóvel"}`,
    }))
  );

  // Contratos a terminar em 90 / 30 dias
  const { data: endingLeases } = await supabase
    .from("leases")
    .select("id, end_date, properties(name)")
    .eq("organization_id", organizationId)
    .eq("status", "ativo")
    .not("end_date", "is", null)
    .lte("end_date", daysFromNow(90));

  const ending90 = (endingLeases ?? []).filter((l) => l.end_date && l.end_date > daysFromNow(30));
  const ending30 = (endingLeases ?? []).filter((l) => l.end_date && l.end_date <= daysFromNow(30));

  results.contrato_fim_90 = await syncReminders(
    supabase,
    organizationId,
    "contrato_fim_90",
    "leases",
    "media",
    ending90.map((l) => ({
      entityId: l.id,
      dueDate: l.end_date,
      message: `Contrato a terminar em 90 dias — ${(l.properties as unknown as { name: string } | null)?.name ?? "imóvel"}`,
    }))
  );
  results.contrato_fim_30 = await syncReminders(
    supabase,
    organizationId,
    "contrato_fim_30",
    "leases",
    "alta",
    ending30.map((l) => ({
      entityId: l.id,
      dueDate: l.end_date,
      message: `Contrato a terminar em 30 dias — ${(l.properties as unknown as { name: string } | null)?.name ?? "imóvel"}`,
    }))
  );

  // Seguros a vencer (30 dias)
  const { data: expiringInsurance } = await supabase
    .from("properties")
    .select("id, name, insurance_expiry")
    .eq("organization_id", organizationId)
    .not("insurance_expiry", "is", null)
    .lte("insurance_expiry", daysFromNow(30))
    .gte("insurance_expiry", today);
  results.seguro_a_vencer = await syncReminders(
    supabase,
    organizationId,
    "seguro_a_vencer",
    "properties",
    "media",
    (expiringInsurance ?? []).map((p) => ({
      entityId: p.id,
      dueDate: p.insurance_expiry,
      message: `Seguro a vencer — ${p.name}`,
    }))
  );

  // Certificados energéticos expirados
  const { data: expiredCertificates } = await supabase
    .from("properties")
    .select("id, name, energy_certificate_expiry")
    .eq("organization_id", organizationId)
    .not("energy_certificate_expiry", "is", null)
    .lt("energy_certificate_expiry", today);
  results.certificado_expirado = await syncReminders(
    supabase,
    organizationId,
    "certificado_expirado",
    "properties",
    "alta",
    (expiredCertificates ?? []).map((p) => ({
      entityId: p.id,
      dueDate: p.energy_certificate_expiry,
      message: `Certificado energético expirado — ${p.name}`,
    }))
  );

  // Despesas por pagar há mais de 30 dias
  const { data: overdueExpenses } = await supabase
    .from("expenses")
    .select("id, description, expense_date")
    .eq("organization_id", organizationId)
    .eq("status", "por_pagar")
    .lte("expense_date", daysFromNow(-30));
  results.despesa_por_pagar = await syncReminders(
    supabase,
    organizationId,
    "despesa_por_pagar",
    "expenses",
    "media",
    (overdueExpenses ?? []).map((e) => ({
      entityId: e.id,
      dueDate: e.expense_date,
      message: `Despesa por pagar há mais de 30 dias — ${e.description}`,
    }))
  );

  // Ocorrências pendentes há mais de 14 dias
  const { data: staleMaintenance } = await supabase
    .from("maintenance_cases")
    .select("id, title, opened_at")
    .eq("organization_id", organizationId)
    .not("status", "in", "(concluida,cancelada)")
    .lte("opened_at", daysFromNow(-14));
  results.ocorrencia_pendente = await syncReminders(
    supabase,
    organizationId,
    "ocorrencia_pendente",
    "maintenance_cases",
    "media",
    (staleMaintenance ?? []).map((m) => ({
      entityId: m.id,
      dueDate: m.opened_at,
      message: `Ocorrência pendente há mais de 14 dias — ${m.title}`,
    }))
  );

  return results;
}
