import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { ErrorBanner } from "@/components/error-banner";
import { MaintenanceForm } from "@/components/forms/maintenance-form";
import { updateMaintenanceCase } from "@/server/actions/maintenance";
import { getOrgContext } from "@/server/services/org-service";
import { loadMaintenanceFormOptions } from "@/server/services/maintenance-service";
import type { MaintenanceCase } from "@/lib/types";

export const metadata = { title: "Editar ocorrência" };

export default async function EditMaintenancePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const { supabase, organizationId } = await getOrgContext();

  const { data: maintenanceCase } = await supabase
    .from("maintenance_cases")
    .select("*")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!maintenanceCase) notFound();

  const options = await loadMaintenanceFormOptions(supabase, organizationId);
  const updateAction = updateMaintenanceCase.bind(null, id);

  return (
    <div>
      <PageHeader title={`Editar: ${maintenanceCase.title}`} />
      <ErrorBanner message={error} />
      <MaintenanceForm
        action={updateAction}
        maintenanceCase={maintenanceCase as MaintenanceCase}
        {...options}
      />
    </div>
  );
}
