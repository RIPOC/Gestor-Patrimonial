import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { ErrorBanner } from "@/components/error-banner";
import { TenantForm } from "@/components/forms/tenant-form";
import { updateTenant } from "@/server/actions/tenants";
import { getOrgContext } from "@/server/services/org-service";
import type { Tenant } from "@/lib/types";

export const metadata = { title: "Editar inquilino" };

export default async function EditTenantPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const { supabase, organizationId } = await getOrgContext();

  const { data: tenant } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!tenant) notFound();

  const updateAction = updateTenant.bind(null, id);

  return (
    <div>
      <PageHeader title={`Editar: ${tenant.name}`} />
      <ErrorBanner message={error} />
      <TenantForm action={updateAction} tenant={tenant as Tenant} />
    </div>
  );
}
