import type { SupabaseClient } from "@supabase/supabase-js";

/** Opções partilhadas pelos formulários de despesa (imóveis, contratos, categorias). */
export async function loadExpenseFormOptions(
  supabase: SupabaseClient,
  organizationId: string
) {
  const [propertiesRes, leasesRes, categoriesRes, suppliersRes] = await Promise.all([
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
    // categorias globais (organization_id null) + da organização
    supabase
      .from("expense_categories")
      .select("id, name, organization_id")
      .or(`organization_id.is.null,organization_id.eq.${organizationId}`)
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
    categories: (categoriesRes.data ?? []).map((c) => ({ id: c.id, name: c.name })),
    suppliers: suppliersRes.data ?? [],
  };
}
