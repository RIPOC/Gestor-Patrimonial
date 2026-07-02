import { PageHeader } from "@/components/layout/page-header";
import { ErrorBanner } from "@/components/error-banner";
import { ExpenseForm } from "@/components/forms/expense-form";
import { createExpense } from "@/server/actions/expenses";
import { getOrgContext } from "@/server/services/org-service";
import { loadExpenseFormOptions } from "@/server/services/expense-service";

export const metadata = { title: "Nova despesa" };

export default async function NewExpensePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { supabase, organizationId } = await getOrgContext();
  const options = await loadExpenseFormOptions(supabase, organizationId);

  return (
    <div>
      <PageHeader title="Nova despesa" />
      <ErrorBanner message={error} />
      <ExpenseForm action={createExpense} {...options} />
    </div>
  );
}
