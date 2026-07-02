import { PageHeader } from "@/components/layout/page-header";
import { ErrorBanner } from "@/components/error-banner";
import { TenantForm } from "@/components/forms/tenant-form";
import { createTenant } from "@/server/actions/tenants";

export const metadata = { title: "Novo inquilino" };

export default async function NewTenantPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div>
      <PageHeader title="Novo inquilino" />
      <ErrorBanner message={error} />
      <TenantForm action={createTenant} />
    </div>
  );
}
