import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TENANT_TYPE_LABELS, type Tenant } from "@/lib/types";

export function TenantForm({
  action,
  tenant,
}: {
  action: (formData: FormData) => Promise<void>;
  tenant?: Tenant;
}) {
  return (
    <form action={action} className="max-w-2xl space-y-6">
      <fieldset className="space-y-4 rounded-lg border border-border bg-card p-5">
        <legend className="px-1 text-sm font-semibold">Identificação</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="name">Nome *</Label>
            <Input id="name" name="name" required defaultValue={tenant?.name} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tax_number">NIF</Label>
            <Input id="tax_number" name="tax_number" maxLength={9} defaultValue={tenant?.tax_number ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tenant_type">Tipo de entidade</Label>
            <Select id="tenant_type" name="tenant_type" defaultValue={tenant?.tenant_type ?? "particular"}>
              {Object.entries(TENANT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="id_document">Documento de identificação</Label>
            <Input id="id_document" name="id_document" defaultValue={tenant?.id_document ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="legal_representative">Representante legal</Label>
            <Input id="legal_representative" name="legal_representative" defaultValue={tenant?.legal_representative ?? ""} />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-lg border border-border bg-card p-5">
        <legend className="px-1 text-sm font-semibold">Contactos e morada</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="address">Morada</Label>
            <Input id="address" name="address" defaultValue={tenant?.address ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="postal_code">Código postal</Label>
            <Input id="postal_code" name="postal_code" defaultValue={tenant?.postal_code ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="city">Localidade</Label>
            <Input id="city" name="city" defaultValue={tenant?.city ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={tenant?.email ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" name="phone" defaultValue={tenant?.phone ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="iban">IBAN</Label>
            <Input id="iban" name="iban" defaultValue={tenant?.iban ?? ""} />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-lg border border-border bg-card p-5">
        <legend className="px-1 text-sm font-semibold">Fiador</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="guarantor_name">Nome do fiador</Label>
            <Input id="guarantor_name" name="guarantor_name" defaultValue={tenant?.guarantor_name ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="guarantor_tax_number">NIF do fiador</Label>
            <Input id="guarantor_tax_number" name="guarantor_tax_number" maxLength={9} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="guarantor_contact">Contacto do fiador</Label>
            <Input id="guarantor_contact" name="guarantor_contact" />
          </div>
        </div>
      </fieldset>

      <fieldset className="rounded-lg border border-border bg-card p-5">
        <legend className="px-1 text-sm font-semibold">Observações</legend>
        <Textarea name="notes" defaultValue={tenant?.notes ?? ""} />
      </fieldset>

      <div className="flex gap-3">
        <Button type="submit">{tenant ? "Guardar alterações" : "Criar inquilino"}</Button>
        <Link href="/tenants">
          <Button type="button" variant="outline">Cancelar</Button>
        </Link>
      </div>
    </form>
  );
}
