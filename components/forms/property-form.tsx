import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  PROPERTY_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
  type Owner,
  type Property,
} from "@/lib/types";

export function PropertyForm({
  action,
  property,
  owners,
}: {
  action: (formData: FormData) => Promise<void>;
  property?: Property;
  owners?: Pick<Owner, "id" | "name">[];
}) {
  return (
    <form action={action} className="max-w-3xl space-y-6">
      <fieldset className="space-y-4 rounded-lg border border-border bg-card p-5">
        <legend className="px-1 text-sm font-semibold">Identificação</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="internal_code">Código interno</Label>
            <Input id="internal_code" name="internal_code" defaultValue={property?.internal_code ?? ""} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="name">Nome / designação *</Label>
            <Input id="name" name="name" required defaultValue={property?.name} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="property_type">Tipo de imóvel</Label>
            <Select id="property_type" name="property_type" defaultValue={property?.property_type ?? "apartamento"}>
              {Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="status">Estado</Label>
            <Select id="status" name="status" defaultValue={property?.status ?? "devoluto"}>
              {Object.entries(PROPERTY_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="area_m2">Área (m²)</Label>
            <Input id="area_m2" name="area_m2" type="number" step="0.01" defaultValue={property?.area_m2 ?? ""} />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-lg border border-border bg-card p-5">
        <legend className="px-1 text-sm font-semibold">Localização</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-3">
            <Label htmlFor="address">Morada</Label>
            <Input id="address" name="address" defaultValue={property?.address ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="postal_code">Código postal</Label>
            <Input id="postal_code" name="postal_code" defaultValue={property?.postal_code ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="parish">Freguesia</Label>
            <Input id="parish" name="parish" defaultValue={property?.parish ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="municipality">Concelho</Label>
            <Input id="municipality" name="municipality" defaultValue={property?.municipality ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="district">Distrito</Label>
            <Input id="district" name="district" defaultValue={property?.district ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="matrix_article">Artigo matricial</Label>
            <Input id="matrix_article" name="matrix_article" defaultValue={property?.matrix_article ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fraction">Fração</Label>
            <Input id="fraction" name="fraction" defaultValue={property?.fraction ?? ""} />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-lg border border-border bg-card p-5">
        <legend className="px-1 text-sm font-semibold">Valores e aquisição</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="taxable_value">Valor patrimonial tributário (€)</Label>
            <Input id="taxable_value" name="taxable_value" type="number" step="0.01" defaultValue={property?.taxable_value ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="acquisition_date">Data de aquisição</Label>
            <Input id="acquisition_date" name="acquisition_date" type="date" defaultValue={property?.acquisition_date ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="acquisition_value">Valor de aquisição (€)</Label>
            <Input id="acquisition_value" name="acquisition_value" type="number" step="0.01" defaultValue={property?.acquisition_value ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="estimated_value">Valor estimado atual (€)</Label>
            <Input id="estimated_value" name="estimated_value" type="number" step="0.01" defaultValue={property?.estimated_value ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="condo_fee_monthly">Condomínio mensal (€)</Label>
            <Input id="condo_fee_monthly" name="condo_fee_monthly" type="number" step="0.01" defaultValue={property?.condo_fee_monthly ?? ""} />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-lg border border-border bg-card p-5">
        <legend className="px-1 text-sm font-semibold">Certificados, licenças e seguros</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="energy_certificate">Certificado energético</Label>
            <Input id="energy_certificate" name="energy_certificate" placeholder="Ex.: SCE123456 / classe B" defaultValue={property?.energy_certificate ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="energy_certificate_expiry">Validade do certificado</Label>
            <Input id="energy_certificate_expiry" name="energy_certificate_expiry" type="date" defaultValue={property?.energy_certificate_expiry ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="usage_license">Licença de utilização</Label>
            <Input id="usage_license" name="usage_license" defaultValue={property?.usage_license ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="insurance_policy">Apólice de seguro</Label>
            <Input id="insurance_policy" name="insurance_policy" defaultValue={property?.insurance_policy ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="insurance_expiry">Validade do seguro</Label>
            <Input id="insurance_expiry" name="insurance_expiry" type="date" defaultValue={property?.insurance_expiry ?? ""} />
          </div>
        </div>
      </fieldset>

      {owners && !property && (
        <fieldset className="space-y-4 rounded-lg border border-border bg-card p-5">
          <legend className="px-1 text-sm font-semibold">Proprietário</legend>
          <div className="space-y-1.5">
            <Label htmlFor="owner_id">Associar proprietário (100%)</Label>
            <Select id="owner_id" name="owner_id" defaultValue="">
              <option value="">— Sem associação —</option>
              {owners.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </Select>
          </div>
        </fieldset>
      )}

      <fieldset className="rounded-lg border border-border bg-card p-5">
        <legend className="px-1 text-sm font-semibold">Observações</legend>
        <Textarea name="notes" defaultValue={property?.notes ?? ""} />
      </fieldset>

      <div className="flex gap-3">
        <Button type="submit">{property ? "Guardar alterações" : "Criar imóvel"}</Button>
        <Link href={property ? `/properties/${property.id}` : "/properties"}>
          <Button type="button" variant="outline">Cancelar</Button>
        </Link>
      </div>
    </form>
  );
}
