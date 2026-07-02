import { PageHeader } from "@/components/layout/page-header";
import { ErrorBanner } from "@/components/error-banner";
import { SupplierForm } from "@/components/forms/supplier-form";
import { createSupplier } from "@/server/actions/suppliers";

export const metadata = { title: "Novo fornecedor" };

export default async function NewSupplierPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div>
      <PageHeader title="Novo fornecedor" />
      <ErrorBanner message={error} />
      <SupplierForm action={createSupplier} />
    </div>
  );
}
