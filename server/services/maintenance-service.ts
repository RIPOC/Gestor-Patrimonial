import type { SupabaseClient } from "@supabase/supabase-js";

/** Opções partilhadas pelos formulários de ocorrência (imóveis, contratos, inquilinos, fornecedores). */
export async function loadMaintenanceFormOptions(
  supabase: SupabaseClient,
  organizationId: string
) {
  const [propertiesRes, leasesRes, tenantsRes, suppliersRes] = await Promise.all([
    supabase
      .from("properties")
      .select("id, name")
      .eq("organization_id", organizationId)
      .order("name"),
    supabase
      .from("leases")
      .select("id, properties(name), lease_tenants(tenants(name))")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
    supabase
      .from("tenants")
      .select("id, name")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("suppliers")
      .select("id, name")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .order("name"),
  ]);

  const leases = (leasesRes.data ?? []).map((l) => {
    const prop = l.properties as unknown as { name: string } | null;
    const leaseTenants = (l.lease_tenants ?? []) as unknown as {
      tenants: { name: string } | null;
    }[];
    const tenantNames = leaseTenants
      .map((lt) => lt.tenants?.name)
      .filter(Boolean)
      .join(", ");
    return { id: l.id, name: `${prop?.name ?? "?"} — ${tenantNames || "sem inquilino"}` };
  });

  return {
    properties: propertiesRes.data ?? [],
    leases,
    tenants: tenantsRes.data ?? [],
    suppliers: suppliersRes.data ?? [],
  };
}

/** Próximo estado lógico sugerido no fluxo de ocorrências. */
const STATUS_FLOW: Record<string, string | null> = {
  aberta: "em_analise",
  em_analise: "orcamentada",
  orcamentada: "aprovada",
  aprovada: "em_execucao",
  em_execucao: "concluida",
  concluida: null,
  cancelada: null,
};

export function nextMaintenanceStatus(current: string): string | null {
  return STATUS_FLOW[current] ?? null;
}
