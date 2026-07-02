import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { ErrorBanner } from "@/components/error-banner";
import { OwnerForm } from "@/components/forms/owner-form";
import { updateOwner } from "@/server/actions/owners";
import { getOrgContext } from "@/server/services/org-service";
import type { Owner } from "@/lib/types";

export const metadata = { title: "Editar proprietário" };

export default async function EditOwnerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const { supabase, organizationId } = await getOrgContext();

  const { data: owner } = await supabase
    .from("owners")
    .select("*")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!owner) notFound();

  const updateAction = updateOwner.bind(null, id);

  return (
    <div>
      <PageHeader title={`Editar: ${owner.name}`} />
      <ErrorBanner message={error} />
      <OwnerForm action={updateAction} owner={owner as Owner} />
    </div>
  );
}
