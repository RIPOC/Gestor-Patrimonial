import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  MAINTENANCE_PRIORITY_LABELS,
  MAINTENANCE_STATUS_LABELS,
  type MaintenanceCase,
} from "@/lib/types";

interface Option {
  id: string;
  name: string;
}

export function MaintenanceForm({
  action,
  maintenanceCase,
  properties,
  leases,
  tenants,
  suppliers,
}: {
  action: (formData: FormData) => Promise<void>;
  maintenanceCase?: MaintenanceCase;
  properties: Option[];
  leases: Option[];
  tenants: Option[];
  suppliers: Option[];
}) {
  return (
    <form action={action} className="max-w-2xl space-y-6">
      <fieldset className="space-y-4 rounded-lg border border-border bg-card p-5">
        <legend className="px-1 text-sm font-semibold">Ocorrência</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="title">Título *</Label>
            <Input id="title" name="title" required defaultValue={maintenanceCase?.title} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" name="description" defaultValue={maintenanceCase?.description ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="priority">Prioridade</Label>
            <Select id="priority" name="priority" defaultValue={maintenanceCase?.priority ?? "media"}>
              {Object.entries(MAINTENANCE_PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="status">Estado</Label>
            <Select id="status" name="status" defaultValue={maintenanceCase?.status ?? "aberta"}>
              {Object.entries(MAINTENANCE_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-lg border border-border bg-card p-5">
        <legend className="px-1 text-sm font-semibold">Associação</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="property_id">Imóvel *</Label>
            <Select id="property_id" name="property_id" required defaultValue={maintenanceCase?.property_id ?? ""}>
              <option value="" disabled>— Selecionar imóvel —</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lease_id">Contrato</Label>
            <Select id="lease_id" name="lease_id" defaultValue={maintenanceCase?.lease_id ?? ""}>
              <option value="">— Nenhum —</option>
              {leases.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tenant_id">Inquilino</Label>
            <Select id="tenant_id" name="tenant_id" defaultValue={maintenanceCase?.tenant_id ?? ""}>
              <option value="">— Nenhum —</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="supplier_id">Fornecedor</Label>
            <Select id="supplier_id" name="supplier_id" defaultValue={maintenanceCase?.supplier_id ?? ""}>
              <option value="">— Nenhum —</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-lg border border-border bg-card p-5">
        <legend className="px-1 text-sm font-semibold">Datas e custos</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="opened_at">Data de abertura *</Label>
            <Input
              id="opened_at"
              name="opened_at"
              type="date"
              required
              defaultValue={maintenanceCase?.opened_at ?? new Date().toISOString().slice(0, 10)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="expected_date">Data prevista</Label>
            <Input id="expected_date" name="expected_date" type="date" defaultValue={maintenanceCase?.expected_date ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="estimated_cost">Custo estimado (€)</Label>
            <Input id="estimated_cost" name="estimated_cost" type="number" step="0.01" defaultValue={maintenanceCase?.estimated_cost ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="actual_cost">Custo real (€)</Label>
            <Input id="actual_cost" name="actual_cost" type="number" step="0.01" defaultValue={maintenanceCase?.actual_cost ?? ""} />
          </div>
        </div>
      </fieldset>

      <fieldset className="rounded-lg border border-border bg-card p-5">
        <legend className="px-1 text-sm font-semibold">Observações</legend>
        <Textarea name="notes" defaultValue={maintenanceCase?.notes ?? ""} />
      </fieldset>

      <div className="flex gap-3">
        <Button type="submit">{maintenanceCase ? "Guardar alterações" : "Criar ocorrência"}</Button>
        <Link href="/maintenance">
          <Button type="button" variant="outline">Cancelar</Button>
        </Link>
      </div>
    </form>
  );
}
