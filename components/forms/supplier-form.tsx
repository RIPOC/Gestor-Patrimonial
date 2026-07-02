import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Supplier } from "@/lib/types";

export function SupplierForm({
  action,
  supplier,
}: {
  action: (formData: FormData) => Promise<void>;
  supplier?: Supplier;
}) {
  return (
    <form action={action} className="max-w-lg space-y-6">
      <fieldset className="space-y-4 rounded-lg border border-border bg-card p-5">
        <legend className="px-1 text-sm font-semibold">Fornecedor</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="name">Nome *</Label>
            <Input id="name" name="name" required defaultValue={supplier?.name} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tax_number">NIF</Label>
            <Input id="tax_number" name="tax_number" maxLength={9} defaultValue={supplier?.tax_number ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={supplier?.email ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" name="phone" defaultValue={supplier?.phone ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="iban">IBAN</Label>
            <Input id="iban" name="iban" defaultValue={supplier?.iban ?? ""} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" name="notes" defaultValue={supplier?.notes ?? ""} />
          </div>
        </div>
      </fieldset>

      <div className="flex gap-3">
        <Button type="submit">{supplier ? "Guardar alterações" : "Criar fornecedor"}</Button>
        <Link href="/expenses/suppliers">
          <Button type="button" variant="outline">Cancelar</Button>
        </Link>
      </div>
    </form>
  );
}
