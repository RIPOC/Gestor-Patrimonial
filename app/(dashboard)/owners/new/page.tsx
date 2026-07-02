import { PageHeader } from "@/components/layout/page-header";
import { ErrorBanner } from "@/components/error-banner";
import { OwnerForm } from "@/components/forms/owner-form";
import { createOwner } from "@/server/actions/owners";

export const metadata = { title: "Novo proprietário" };

export default async function NewOwnerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div>
      <PageHeader title="Novo proprietário" />
      <ErrorBanner message={error} />
      <OwnerForm action={createOwner} />
    </div>
  );
}
