import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LEASE_TYPE_LABELS } from "@/lib/types";

interface Option {
  id: string;
  name: string;
}

export function LeaseForm({
  action,
  properties,
  owners,
  tenants,
}: {
  action: (formData: FormData) => Promise<void>;
  properties: Option[];
  owners: Option[];
  tenants: Option[];
}) {
  return (
    <form action={action} className="max-w-3xl space-y-6">
      <fieldset className="space-y-4 rounded-lg border border-border bg-card p-5">
        <legend className="px-1 text-sm font-semibold">Partes e imóvel</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="property_id">Imóvel *</Label>
            <Select id="property_id" name="property_id" required defaultValue="">
              <option value="" disabled>— Selecionar imóvel —</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tenant_id">Inquilino *</Label>
            <Select id="tenant_id" name="tenant_id" required defaultValue="">
              <option value="" disabled>— Selecionar inquilino —</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="owner_id">Proprietário</Label>
            <Select id="owner_id" name="owner_id" defaultValue="">
              <option value="">— Sem associação —</option>
              {owners.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lease_type">Tipo de contrato</Label>
            <Select id="lease_type" name="lease_type" defaultValue="habitacao">
              {Object.entries(LEASE_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-lg border border-border bg-card p-5">
        <legend className="px-1 text-sm font-semibold">Duração</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="start_date">Data de início *</Label>
            <Input id="start_date" name="start_date" type="date" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="end_date">Data de fim</Label>
            <Input id="end_date" name="end_date" type="date" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="renewal_months">Prazo de renovação (meses)</Label>
            <Input id="renewal_months" name="renewal_months" type="number" min="1" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="auto_renewal" defaultChecked className="h-4 w-4" />
            Renovação automática
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-lg border border-border bg-card p-5">
        <legend className="px-1 text-sm font-semibold">Renda e condições financeiras</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="initial_rent">Renda mensal (€) *</Label>
            <Input id="initial_rent" name="initial_rent" type="number" step="0.01" min="0.01" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="due_day">Dia de vencimento *</Label>
            <Input id="due_day" name="due_day" type="number" min="1" max="31" defaultValue="1" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="deposit_amount">Caução (€)</Label>
            <Input id="deposit_amount" name="deposit_amount" type="number" step="0.01" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="withholding_tax" className="h-4 w-4" />
            Retenção na fonte
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="vat" className="h-4 w-4" />
            Sujeito a IVA
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-lg border border-border bg-card p-5">
        <legend className="px-1 text-sm font-semibold">Situação fiscal (AT)</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="reported_to_at" className="h-4 w-4" />
            Contrato comunicado à AT
          </label>
          <div className="space-y-1.5">
            <Label htmlFor="at_contract_number">N.º do contrato na AT</Label>
            <Input id="at_contract_number" name="at_contract_number" />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-lg border border-border bg-card p-5">
        <legend className="px-1 text-sm font-semibold">Estado e observações</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="status">Estado</Label>
            <Select id="status" name="status" defaultValue="ativo">
              <option value="rascunho">Rascunho</option>
              <option value="ativo">Ativo (gera rendas mensais)</option>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" name="notes" />
          </div>
        </div>
      </fieldset>

      <div className="flex gap-3">
        <Button type="submit">Criar contrato</Button>
        <Link href="/leases">
          <Button type="button" variant="outline">Cancelar</Button>
        </Link>
      </div>
    </form>
  );
}
