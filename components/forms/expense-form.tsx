import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Option {
  id: string;
  name: string;
}

interface ExpenseData {
  id?: string;
  property_id?: string | null;
  lease_id?: string | null;
  category_id?: string | null;
  supplier_id?: string | null;
  supplier_name?: string | null;
  supplier_tax_number?: string | null;
  expense_date?: string | null;
  description?: string;
  amount_net?: number | null;
  vat_amount?: number | null;
  amount_total?: number | null;
  is_tax_deductible?: boolean;
  status?: string;
  payment_date?: string | null;
}

export function ExpenseForm({
  action,
  expense,
  properties,
  leases,
  categories,
  suppliers,
}: {
  action: (formData: FormData) => Promise<void>;
  expense?: ExpenseData;
  properties: Option[];
  leases: Option[];
  categories: Option[];
  suppliers: Option[];
}) {
  return (
    <form action={action} className="max-w-2xl space-y-6">
      <fieldset className="space-y-4 rounded-lg border border-border bg-card p-5">
        <legend className="px-1 text-sm font-semibold">Despesa</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="description">Descrição *</Label>
            <Input id="description" name="description" required defaultValue={expense?.description ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="category_id">Categoria</Label>
            <Select id="category_id" name="category_id" defaultValue={expense?.category_id ?? ""}>
              <option value="">— Sem categoria —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="expense_date">Data da despesa *</Label>
            <Input id="expense_date" name="expense_date" type="date" required defaultValue={expense?.expense_date ?? ""} />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-lg border border-border bg-card p-5">
        <legend className="px-1 text-sm font-semibold">Associação (pelo menos uma)</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="property_id">Imóvel</Label>
            <Select id="property_id" name="property_id" defaultValue={expense?.property_id ?? ""}>
              <option value="">— Nenhum —</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lease_id">Contrato</Label>
            <Select id="lease_id" name="lease_id" defaultValue={expense?.lease_id ?? ""}>
              <option value="">— Nenhum —</option>
              {leases.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </Select>
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-lg border border-border bg-card p-5">
        <div className="flex items-center justify-between px-1">
          <legend className="text-sm font-semibold">Fornecedor</legend>
          <Link href="/expenses/suppliers" className="text-xs text-primary hover:underline">
            Gerir fornecedores →
          </Link>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="supplier_id">Fornecedor registado</Label>
          <Select id="supplier_id" name="supplier_id" defaultValue={expense?.supplier_id ?? ""}>
            <option value="">— Nenhum —</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="supplier_name">Nome do fornecedor (se não registado)</Label>
            <Input id="supplier_name" name="supplier_name" defaultValue={expense?.supplier_name ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="supplier_tax_number">NIF do fornecedor</Label>
            <Input id="supplier_tax_number" name="supplier_tax_number" maxLength={9} defaultValue={expense?.supplier_tax_number ?? ""} />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-lg border border-border bg-card p-5">
        <legend className="px-1 text-sm font-semibold">Valores</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="amount_net">Valor s/ IVA (€)</Label>
            <Input id="amount_net" name="amount_net" type="number" step="0.01" defaultValue={expense?.amount_net ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vat_amount">IVA (€)</Label>
            <Input id="vat_amount" name="vat_amount" type="number" step="0.01" defaultValue={expense?.vat_amount ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="amount_total">Valor total (€) *</Label>
            <Input id="amount_total" name="amount_total" type="number" step="0.01" min="0.01" required defaultValue={expense?.amount_total ?? ""} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="is_tax_deductible"
            className="h-4 w-4"
            defaultChecked={expense?.is_tax_deductible ?? true}
          />
          Dedutível fiscalmente
        </label>
      </fieldset>

      <fieldset className="space-y-4 rounded-lg border border-border bg-card p-5">
        <legend className="px-1 text-sm font-semibold">Estado de pagamento</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="status">Estado</Label>
            <Select id="status" name="status" defaultValue={expense?.status ?? "por_pagar"}>
              <option value="por_pagar">Por pagar</option>
              <option value="pago">Pago</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="payment_date">Data de pagamento</Label>
            <Input id="payment_date" name="payment_date" type="date" defaultValue={expense?.payment_date ?? ""} />
          </div>
        </div>
      </fieldset>

      <div className="flex gap-3">
        <Button type="submit">{expense?.id ? "Guardar alterações" : "Criar despesa"}</Button>
        <Link href="/expenses">
          <Button type="button" variant="outline">Cancelar</Button>
        </Link>
      </div>
    </form>
  );
}
