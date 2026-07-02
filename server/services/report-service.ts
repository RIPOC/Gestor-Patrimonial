import type { SupabaseClient } from "@supabase/supabase-js";

function todayStr(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function inDays(days: number): string {
  const d = new Date(Date.now() + days * 24 * 3600 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Contratos ativos a terminar dentro de N dias. */
export async function listLeasesEndingSoon(
  supabase: SupabaseClient,
  organizationId: string,
  days = 90
) {
  const { data } = await supabase
    .from("leases")
    .select("id, end_date, properties(name), lease_tenants(tenants(name))")
    .eq("organization_id", organizationId)
    .eq("status", "ativo")
    .not("end_date", "is", null)
    .lte("end_date", inDays(days))
    .order("end_date");

  return (data ?? []).map((l) => {
    const property = l.properties as unknown as { name: string } | null;
    const leaseTenants = (l.lease_tenants ?? []) as unknown as {
      tenants: { name: string } | null;
    }[];
    const tenantNames = leaseTenants.map((lt) => lt.tenants?.name).filter(Boolean).join(", ");
    return { id: l.id, end_date: l.end_date as string, property_name: property?.name ?? null, tenant_names: tenantNames };
  });
}

/** Imóveis sem contrato ativo. */
export async function listVacantProperties(supabase: SupabaseClient, organizationId: string) {
  const { data } = await supabase
    .from("properties")
    .select("id, name, municipality")
    .eq("organization_id", organizationId)
    .eq("status", "devoluto")
    .order("name");
  return data ?? [];
}

/** Inquilinos com rendas em dívida (vencida ou em atraso). */
export async function listTenantsWithDebt(supabase: SupabaseClient, organizationId: string) {
  const { data } = await supabase
    .from("rents")
    .select("outstanding_amount, due_date, leases(lease_tenants(tenants(id, name)))")
    .eq("organization_id", organizationId)
    .in("status", ["vencida", "em_atraso", "parcialmente_paga"]);

  const byTenant = new Map<string, { name: string; amount: number; oldestDue: string }>();
  for (const r of data ?? []) {
    const lease = r.leases as unknown as { lease_tenants: { tenants: { id: string; name: string } | null }[] } | null;
    for (const lt of lease?.lease_tenants ?? []) {
      const tenant = lt.tenants;
      if (!tenant) continue;
      const entry = byTenant.get(tenant.id) ?? { name: tenant.name, amount: 0, oldestDue: r.due_date as string };
      entry.amount += Number(r.outstanding_amount);
      if ((r.due_date as string) < entry.oldestDue) entry.oldestDue = r.due_date as string;
      byTenant.set(tenant.id, entry);
    }
  }
  return [...byTenant.entries()].map(([id, v]) => ({ id, ...v })).sort((a, b) => b.amount - a.amount);
}

/** Despesas sem documento anexado (fatura em falta). */
export async function listExpensesWithoutDocument(supabase: SupabaseClient, organizationId: string) {
  const [{ data: expenses }, { data: docs }] = await Promise.all([
    supabase
      .from("expenses")
      .select("id, description, expense_date, amount_total, properties(name)")
      .eq("organization_id", organizationId)
      .order("expense_date", { ascending: false })
      .limit(500),
    supabase.from("documents").select("expense_id").eq("organization_id", organizationId).not("expense_id", "is", null),
  ]);

  const withDoc = new Set((docs ?? []).map((d) => d.expense_id as string));
  return (expenses ?? [])
    .filter((e) => !withDoc.has(e.id))
    .map((e) => ({
      id: e.id,
      description: e.description,
      expense_date: e.expense_date,
      amount_total: Number(e.amount_total),
      property_name: (e.properties as unknown as { name: string } | null)?.name ?? null,
    }));
}

export interface PropertyFiscalState {
  property_id: string;
  active_lease_reported: boolean | null;
  at_contract_number: string | null;
  receipts_issued: number;
  receipts_pending: number;
  expenses_total: number;
  expenses_without_document: number;
  insurance_registered: boolean;
  insurance_expiry: string | null;
  energy_certificate_valid: boolean;
  energy_certificate_expiry: string | null;
  alerts: string[];
}

/** Estado Fiscal do Imóvel (secção 23 da especificação). */
export async function getPropertyFiscalState(
  supabase: SupabaseClient,
  organizationId: string,
  propertyId: string
): Promise<PropertyFiscalState> {
  const today = todayStr();

  const [{ data: property }, { data: activeLease }, { data: rents }, { data: expenses }, { data: docs }] =
    await Promise.all([
      supabase
        .from("properties")
        .select("insurance_policy, insurance_expiry, energy_certificate, energy_certificate_expiry")
        .eq("id", propertyId)
        .eq("organization_id", organizationId)
        .maybeSingle(),
      supabase
        .from("leases")
        .select("id, reported_to_at, at_contract_number")
        .eq("property_id", propertyId)
        .eq("organization_id", organizationId)
        .eq("status", "ativo")
        .maybeSingle(),
      supabase
        .from("rents")
        .select("id, receipt_issued, status")
        .eq("property_id", propertyId)
        .eq("organization_id", organizationId)
        .neq("status", "anulada"),
      supabase
        .from("expenses")
        .select("id, amount_total")
        .eq("property_id", propertyId)
        .eq("organization_id", organizationId),
      supabase.from("documents").select("expense_id").eq("property_id", propertyId).not("expense_id", "is", null),
    ]);

  const withDoc = new Set((docs ?? []).map((d) => d.expense_id as string));
  const expensesWithoutDoc = (expenses ?? []).filter((e) => !withDoc.has(e.id)).length;
  const expensesTotal = (expenses ?? []).reduce((s, e) => s + Number(e.amount_total), 0);

  const paidRents = (rents ?? []).filter((r) => ["paga", "parcialmente_paga"].includes(r.status));
  const receiptsIssued = paidRents.filter((r) => r.receipt_issued).length;
  const receiptsPending = paidRents.filter((r) => !r.receipt_issued).length;

  const insuranceRegistered = Boolean(property?.insurance_policy);
  const insuranceExpired = property?.insurance_expiry ? property.insurance_expiry < today : false;
  const energyValid = property?.energy_certificate
    ? !property.energy_certificate_expiry || property.energy_certificate_expiry >= today
    : false;

  const alerts: string[] = [];
  if (activeLease && !activeLease.reported_to_at) alerts.push("Contrato ativo não comunicado à AT");
  if (receiptsPending > 0) alerts.push(`${receiptsPending} recibo(s) por emitir`);
  if (expensesWithoutDoc > 0) alerts.push(`${expensesWithoutDoc} despesa(s) sem documento`);
  if (!insuranceRegistered) alerts.push("Sem seguro registado");
  if (insuranceExpired) alerts.push("Seguro expirado");
  if (!energyValid) alerts.push("Certificado energético inválido ou expirado");

  return {
    property_id: propertyId,
    active_lease_reported: activeLease ? activeLease.reported_to_at : null,
    at_contract_number: activeLease?.at_contract_number ?? null,
    receipts_issued: receiptsIssued,
    receipts_pending: receiptsPending,
    expenses_total: expensesTotal,
    expenses_without_document: expensesWithoutDoc,
    insurance_registered: insuranceRegistered,
    insurance_expiry: property?.insurance_expiry ?? null,
    energy_certificate_valid: energyValid,
    energy_certificate_expiry: property?.energy_certificate_expiry ?? null,
    alerts,
  };
}

export interface AnnualClosingRow {
  owner_id: string | null;
  owner_name: string;
  rents_total: number;
  expenses_total: number;
  net_result: number;
  receipts_issued: number;
  receipts_pending: number;
}

/** Fecho fiscal anual — totais por proprietário (secção 24). */
export async function getAnnualClosing(
  supabase: SupabaseClient,
  organizationId: string,
  year: number
): Promise<AnnualClosingRow[]> {
  const [{ data: rents }, { data: expenses }] = await Promise.all([
    supabase
      .from("rents")
      .select("received_amount, receipt_issued, status, owners(id, name)")
      .eq("organization_id", organizationId)
      .eq("year", year)
      .neq("status", "anulada"),
    supabase
      .from("expenses")
      .select("amount_total, owner_property:properties(owner_properties(owners(id, name)))")
      .eq("organization_id", organizationId)
      .gte("expense_date", `${year}-01-01`)
      .lte("expense_date", `${year}-12-31`),
  ]);

  const byOwner = new Map<string, AnnualClosingRow>();
  const getEntry = (id: string | null, name: string) => {
    const key = id ?? "sem_proprietario";
    let entry = byOwner.get(key);
    if (!entry) {
      entry = { owner_id: id, owner_name: name, rents_total: 0, expenses_total: 0, net_result: 0, receipts_issued: 0, receipts_pending: 0 };
      byOwner.set(key, entry);
    }
    return entry;
  };

  for (const r of rents ?? []) {
    const owner = r.owners as unknown as { id: string; name: string } | null;
    const entry = getEntry(owner?.id ?? null, owner?.name ?? "Sem proprietário associado");
    entry.rents_total += Number(r.received_amount);
    if (["paga", "parcialmente_paga"].includes(r.status)) {
      if (r.receipt_issued) entry.receipts_issued += 1;
      else entry.receipts_pending += 1;
    }
  }

  for (const e of expenses ?? []) {
    const propWrap = e.owner_property as unknown as { owner_properties: { owners: { id: string; name: string } | null }[] } | null;
    const ownerLinks = propWrap?.owner_properties ?? [];
    if (ownerLinks.length === 0) {
      const entry = getEntry(null, "Sem proprietário associado");
      entry.expenses_total += Number(e.amount_total);
      continue;
    }
    // Reparte a despesa igualmente pelos proprietários associados ao imóvel
    const share = Number(e.amount_total) / ownerLinks.length;
    for (const link of ownerLinks) {
      const owner = link.owners;
      const entry = getEntry(owner?.id ?? null, owner?.name ?? "Sem proprietário associado");
      entry.expenses_total += share;
    }
  }

  const rows = [...byOwner.values()];
  for (const row of rows) row.net_result = row.rents_total - row.expenses_total;
  return rows.sort((a, b) => a.owner_name.localeCompare(b.owner_name));
}
