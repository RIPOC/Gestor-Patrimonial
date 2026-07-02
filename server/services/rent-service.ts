import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Gera as rendas mensais de um contrato ativo desde o início do contrato
 * (ou do mês atual, se o início for anterior) até 12 meses à frente.
 * Idempotente: a constraint unique (lease_id, year, month) impede duplicados.
 */
export async function generateRentsForLease(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    leaseId: string;
    propertyId: string;
    unitId: string | null;
    ownerId: string | null;
    startDate: string;
    endDate: string | null;
    rentAmount: number;
    dueDay: number;
    createdBy: string | null;
    monthsAhead?: number;
  }
) {
  const monthsAhead = params.monthsAhead ?? 12;
  const start = new Date(params.startDate + "T00:00:00");
  const end = params.endDate ? new Date(params.endDate + "T00:00:00") : null;
  const today = new Date();

  const firstYear = start.getFullYear();
  const firstMonth = start.getMonth(); // 0-based

  const horizon = new Date(today.getFullYear(), today.getMonth() + monthsAhead, 1);

  const rows: Record<string, unknown>[] = [];
  let cursor = new Date(firstYear, firstMonth, 1);

  while (cursor <= horizon) {
    if (end && cursor > end) break;

    const year = cursor.getFullYear();
    const month = cursor.getMonth() + 1;
    const lastDayOfMonth = new Date(year, month, 0).getDate();
    const dueDay = Math.min(params.dueDay, lastDayOfMonth);
    // Datas construídas com componentes locais (evitar toISOString / desvio UTC)
    const pad = (n: number) => String(n).padStart(2, "0");
    const dueDate = `${year}-${pad(month)}-${pad(dueDay)}`;
    const periodStart = `${year}-${pad(month)}-01`;
    const periodEnd = `${year}-${pad(month)}-${pad(lastDayOfMonth)}`;

    const isPast = new Date(dueDate + "T23:59:59") < today;

    rows.push({
      organization_id: params.organizationId,
      lease_id: params.leaseId,
      property_id: params.propertyId,
      unit_id: params.unitId,
      owner_id: params.ownerId,
      year,
      month,
      period_start: periodStart,
      period_end: periodEnd,
      due_date: dueDate,
      base_amount: params.rentAmount,
      total_amount: params.rentAmount,
      status: isPast ? "em_atraso" : "por_cobrar",
      created_by: params.createdBy,
    });

    cursor = new Date(year, month, 1);
  }

  if (rows.length === 0) return { inserted: 0 };

  // upsert ignorando duplicados (rendas já existentes não são alteradas)
  const { error } = await supabase
    .from("rents")
    .upsert(rows, { onConflict: "lease_id,year,month", ignoreDuplicates: true });

  if (error) throw new Error(error.message);

  return { inserted: rows.length };
}
