import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { ErrorBanner } from "@/components/error-banner";
import { PropertyForm } from "@/components/forms/property-form";
import { updateProperty } from "@/server/actions/properties";
import { getOrgContext } from "@/server/services/org-service";
import type { Property } from "@/lib/types";

export const metadata = { title: "Editar imóvel" };

export default async function EditPropertyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const { supabase, organizationId } = await getOrgContext();

  const { data: property } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!property) notFound();

  const updateAction = updateProperty.bind(null, id);

  return (
    <div>
      <PageHeader title={`Editar: ${property.name}`} />
      <ErrorBanner message={error} />
      <PropertyForm action={updateAction} property={property as Property} />
    </div>
  );
}
