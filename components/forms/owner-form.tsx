import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { OWNER_TYPE_LABELS, type Owner } from "@/lib/types";
import Link from "next/link";

export function OwnerForm({
  action,
  owner,
}: {
  action: (formData: FormData) => Promise<void>;
  owner?: Owner;
}) {
  return (
    <form action={action} className="max-w-2xl space-y-6">
      <fieldset className="space-y-4 rounded-lg border border-border bg-card p-5">
        <legend className="px-1 text-sm font-semibold">Identificação</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="name">Nome *</Label>
            <Input id="name" name="name" required defaultValue={owner?.name} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tax_number">NIF</Label>
            <Input
              id="tax_number"
              name="tax_number"
              maxLength={9}
              defaultValue={owner?.tax_number ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="owner_type">Tipo de proprietário</Label>
            <Select
              id="owner_type"
              name="owner_type"
              defaultValue={owner?.owner_type ?? "pessoa_singular"}
            >
              {Object.entries(OWNER_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-lg border border-border bg-card p-5">
        <legend className="px-1 text-sm font-semibold">Contactos e morada</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="address">Morada</Label>
            <Input id="address" name="address" defaultValue={owner?.address ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="postal_code">Código postal</Label>
            <Input id="postal_code" name="postal_code" defaultValue={owner?.postal_code ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="city">Localidade</Label>
            <Input id="city" name="city" defaultValue={owner?.city ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="country">País</Label>
            <Input id="country" name="country" defaultValue={owner?.country ?? "Portugal"} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={owner?.email ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" name="phone" defaultValue={owner?.phone ?? ""} />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-lg border border-border bg-card p-5">
        <legend className="px-1 text-sm font-semibold">Dados financeiros e fiscais</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="iban">IBAN</Label>
            <Input id="iban" name="iban" defaultValue={owner?.iban ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tax_regime">Regime fiscal</Label>
            <Input
              id="tax_regime"
              name="tax_regime"
              placeholder="Ex.: Categoria F"
              defaultValue={owner?.tax_regime ?? ""}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" name="notes" defaultValue={owner?.notes ?? ""} />
          </div>
        </div>
      </fieldset>

      <div className="flex gap-3">
        <Button type="submit">{owner ? "Guardar alterações" : "Criar proprietário"}</Button>
        <Link href="/owners">
          <Button type="button" variant="outline">
            Cancelar
          </Button>
        </Link>
      </div>
    </form>
  );
}
