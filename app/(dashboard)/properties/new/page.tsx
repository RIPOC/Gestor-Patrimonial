import { PageHeader } from "@/components/layout/page-header";
import { ErrorBanner } from "@/components/error-banner";
import { PropertyForm } from "@/components/forms/property-form";
import { createProperty } from "@/server/actions/properties";
import { getOrgContext } from "@/server/services/org-service";

export const metadata = { title: "Novo imóvel" };

export default async function NewPropertyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { supabase, organizationId } = await getOrgContext();

  const { data: owners } = await supabase
    .from("owners")
    .select("id, name")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .order("name");

  return (
    <div>
      <PageHeader title="Novo imóvel" />
      <ErrorBanner message={error} />
      <PropertyForm action={createProperty} owners={owners ?? []} />
    </div>
  );
}
