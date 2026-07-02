import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { ErrorBanner } from "@/components/error-banner";
import { SupplierForm } from "@/components/forms/supplier-form";
import { updateSupplier } from "@/server/actions/suppliers";
import { getOrgContext } from "@/server/services/org-service";
import type { Supplier } from "@/lib/types";

export const metadata = { title: "Editar fornecedor" };

export default async function EditSupplierPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const { supabase, organizationId } = await getOrgContext();

  const { data: supplier } = await supabase
    .from("suppliers")
    .select("*")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!supplier) notFound();

  const updateAction = updateSupplier.bind(null, id);

  return (
    <div>
      <PageHeader title={`Editar: ${supplier.name}`} />
      <ErrorBanner message={error} />
      <SupplierForm action={updateAction} supplier={supplier as Supplier} />
    </div>
  );
}
