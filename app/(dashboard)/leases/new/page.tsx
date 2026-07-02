import { PageHeader } from "@/components/layout/page-header";
import { ErrorBanner } from "@/components/error-banner";
import { LeaseForm } from "@/components/forms/lease-form";
import { createLease } from "@/server/actions/leases";
import { getOrgContext } from "@/server/services/org-service";

export const metadata = { title: "Novo contrato" };

export default async function NewLeasePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { supabase, organizationId } = await getOrgContext();

  const [propertiesRes, ownersRes, tenantsRes] = await Promise.all([
    supabase
      .from("properties")
      .select("id, name")
      .eq("organization_id", organizationId)
      .order("name"),
    supabase
      .from("owners")
      .select("id, name")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("tenants")
      .select("id, name")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .order("name"),
  ]);

  return (
    <div>
      <PageHeader
        title="Novo contrato"
        description="Um contrato ativo gera automaticamente as rendas mensais até 12 meses à frente."
      />
      <ErrorBanner message={error} />
      <LeaseForm
        action={createLease}
        properties={propertiesRes.data ?? []}
        owners={ownersRes.data ?? []}
        tenants={tenantsRes.data ?? []}
      />
    </div>
  );
}
