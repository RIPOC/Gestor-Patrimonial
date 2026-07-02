import { PageHeader } from "@/components/layout/page-header";
import { ErrorBanner } from "@/components/error-banner";
import { MaintenanceForm } from "@/components/forms/maintenance-form";
import { createMaintenanceCase } from "@/server/actions/maintenance";
import { getOrgContext } from "@/server/services/org-service";
import { loadMaintenanceFormOptions } from "@/server/services/maintenance-service";

export const metadata = { title: "Nova ocorrência" };

export default async function NewMaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { supabase, organizationId } = await getOrgContext();
  const options = await loadMaintenanceFormOptions(supabase, organizationId);

  return (
    <div>
      <PageHeader title="Nova ocorrência" />
      <ErrorBanner message={error} />
      <MaintenanceForm action={createMaintenanceCase} {...options} />
    </div>
  );
}
