import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ErrorBanner } from "@/components/error-banner";
import { ExpenseForm } from "@/components/forms/expense-form";
import { updateExpense, deleteExpense } from "@/server/actions/expenses";
import { downloadDocument, uploadLinkedDocument } from "@/server/actions/documents";
import { getOrgContext } from "@/server/services/org-service";
import { loadExpenseFormOptions } from "@/server/services/expense-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DOCUMENT_TYPE_LABELS, type DocumentType } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Editar despesa" };

export default async function EditExpensePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const { supabase, organizationId } = await getOrgContext();

  const { data: expense } = await supabase
    .from("expenses")
    .select("*")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!expense) notFound();

  const [options, documentsRes] = await Promise.all([
    loadExpenseFormOptions(supabase, organizationId),
    supabase
      .from("documents")
      .select("*")
      .eq("expense_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const documents = documentsRes.data ?? [];
  const updateAction = updateExpense.bind(null, id);
  const deleteAction = deleteExpense.bind(null, id);

  return (
    <div>
      <PageHeader title={`Editar despesa: ${expense.description}`}>
        <form action={deleteAction}>
          <Button variant="destructive" type="submit">Eliminar</Button>
        </form>
      </PageHeader>
      <ErrorBanner message={error} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ExpenseForm action={updateAction} expense={expense} {...options} />
        </div>

        <Card className="self-start">
          <CardHeader><CardTitle>Faturas e comprovativos</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem documentos anexados.</p>
            ) : (
              <ul className="space-y-2">
                {documents.map((d) => {
                  const dl = downloadDocument.bind(null, d.id);
                  return (
                    <li key={d.id} className="flex items-center justify-between gap-2 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium" title={d.original_filename}>{d.original_filename}</p>
                        <p className="text-xs text-muted-foreground">
                          {DOCUMENT_TYPE_LABELS[d.document_type as DocumentType]} · {formatDate(d.created_at)}
                        </p>
                      </div>
                      <form action={dl}>
                        <Button variant="ghost" size="sm" type="submit" title="Descarregar">
                          <Download className="h-4 w-4" />
                        </Button>
                      </form>
                    </li>
                  );
                })}
              </ul>
            )}

            <form action={uploadLinkedDocument} className="space-y-3 border-t border-border pt-4">
              <input type="hidden" name="expense_id" value={id} />
              <input type="hidden" name="property_id" value={expense.property_id ?? ""} />
              <input type="hidden" name="redirect_to" value={`/expenses/${id}/edit`} />
              <div className="space-y-1.5">
                <Label htmlFor="doc_file">Anexar fatura</Label>
                <Input id="doc_file" name="file" type="file" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="doc_type">Tipo</Label>
                <Select id="doc_type" name="document_type" defaultValue="fatura_despesa">
                  <option value="fatura_despesa">Fatura de despesa</option>
                  <option value="comprovativo_pagamento">Comprovativo de pagamento</option>
                  <option value="outro">Outro</option>
                </Select>
              </div>
              <Button type="submit" size="sm" className="w-full">Carregar</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
