"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FileUp, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  parseCadernetaFile,
  importCadernetaData,
  type CadernetaPreviewResult,
  type ImportCadernetaOwnerDecision,
  type ImportCadernetaPropertyPayload,
} from "@/server/actions/caderneta";
import { PROPERTY_TYPE_LABELS, PROPERTY_STATUS_LABELS, type PropertyType, type PropertyStatus } from "@/lib/types";

export function CadernetaImportForm() {
  const router = useRouter();
  const [step, setStep] = React.useState<"upload" | "review">("upload");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [preview, setPreview] = React.useState<CadernetaPreviewResult | null>(null);

  const [properties, setProperties] = React.useState<ImportCadernetaPropertyPayload[]>([]);
  const [owners, setOwners] = React.useState<ImportCadernetaOwnerDecision[]>([]);
  const [sourceFile, setSourceFile] = React.useState<File | null>(null);

  const percentageSum = owners.reduce((sum, o) => sum + (o.ownershipPercentage || 0), 0);
  const percentageOk = owners.length === 0 || Math.abs(percentageSum - 100) <= 0.5;

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const file = formData.get("file") as File | null;
    const result = await parseCadernetaFile(formData);
    setLoading(false);

    if (!result.ok || !result.parsed) {
      setError(result.error ?? "Não foi possível processar o ficheiro.");
      return;
    }

    setPreview(result);
    setSourceFile(file);

    const p = result.parsed;
    setProperties(
      (result.candidateProperties ?? []).map((c) => ({
        key: c.key,
        selected: true,
        existingPropertyId: c.existingPropertyId,
        updateExisting: !!c.existingPropertyId,
        name: c.name,
        propertyType: c.propertyType,
        status: "inativo",
        internalCode: null,
        areaM2: c.areaM2,
        taxableValue: c.taxableValue,
        fraction: c.fraction,
        matrixArticle: p.matrixArticle,
        matrixSection: p.matrixSection,
        matrixType: p.matrixType,
        district: p.districtName,
        municipality: p.municipalityName,
        parish: p.parishName,
        address: p.address,
        postalCode: p.postalCode,
        acquisitionDate: null,
        acquisitionValue: null,
        estimatedValue: null,
        energyCertificate: null,
        energyCertificateExpiry: null,
        usageLicense: null,
        insurancePolicy: null,
        insuranceExpiry: null,
        condoFeeMonthly: null,
        notes: null,
      }))
    );

    setOwners(
      (result.ownerMatches ?? []).map((o) => ({
        taxNumber: o.taxNumber,
        name: o.name,
        address: o.address,
        existingOwnerId: o.existingOwnerId,
        createNew: !o.existingOwnerId,
        ownershipPercentage: o.ownershipPercentage ?? 100,
      }))
    );

    setStep("review");
  }

  async function handleImport() {
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.set("payload", JSON.stringify({ properties, owners }));
    if (sourceFile) formData.set("file", sourceFile);

    const result = await importCadernetaData(formData);
    setLoading(false);

    if (!result.ok) {
      setError(result.error ?? "Erro ao importar dados.");
      return;
    }

    router.push(result.propertyIds?.[0] ? `/properties/${result.propertyIds[0]}` : "/properties");
  }

  if (step === "upload") {
    return (
      <div className="max-w-xl rounded-lg border border-border bg-card p-6">
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="file">Caderneta predial (PDF)</Label>
            <Input id="file" name="file" type="file" accept="application/pdf" required />
            <p className="text-xs text-muted-foreground">
              Aceita cadernetas urbanas e rústicas exportadas do Portal das Finanças.
            </p>
          </div>
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
            {loading ? "A analisar..." : "Analisar caderneta"}
          </Button>
        </form>
      </div>
    );
  }

  const parsed = preview?.parsed;

  return (
    <div className="max-w-4xl space-y-6">
      {parsed && parsed.warnings.length > 0 && (
        <div className="space-y-1 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {parsed.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {w}
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <fieldset className="space-y-4 rounded-lg border border-border bg-card p-5">
        <legend className="px-1 text-sm font-semibold">
          Imóveis identificados ({parsed?.documentType === "rustica" ? "rústica" : "urbana"} — artigo{" "}
          {parsed?.matrixArticle})
        </legend>
        <div className="space-y-4">
          {properties.map((p, idx) => (
            <div key={p.key} className="rounded-md border border-border p-4">
              <div className="mb-3 flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={p.selected}
                    onChange={(e) =>
                      setProperties((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, selected: e.target.checked } : x))
                      )
                    }
                  />
                  {p.fraction ? `Fração ${p.fraction}` : "Imóvel"}
                </label>
                {p.existingPropertyId ? (
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={p.updateExisting}
                        onChange={(e) =>
                          setProperties((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, updateExisting: e.target.checked } : x))
                          )
                        }
                      />
                      Atualizar VPT/área/localização
                    </label>
                    <Badge tone="blue">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Já existe
                    </Badge>
                  </div>
                ) : (
                  <Badge tone="green">Novo imóvel</Badge>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Designação</Label>
                  <Input
                    value={p.name}
                    onChange={(e) =>
                      setProperties((prev) => prev.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo</Label>
                  <Select
                    value={p.propertyType}
                    onChange={(e) =>
                      setProperties((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, propertyType: e.target.value as PropertyType } : x))
                      )
                    }
                  >
                    {Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Área (m²)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={p.areaM2 ?? ""}
                    onChange={(e) =>
                      setProperties((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, areaM2: e.target.value ? Number(e.target.value) : null } : x))
                      )
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>VPT (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={p.taxableValue ?? ""}
                    onChange={(e) =>
                      setProperties((prev) =>
                        prev.map((x, i) =>
                          i === idx ? { ...x, taxableValue: e.target.value ? Number(e.target.value) : null } : x
                        )
                      )
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Distrito / Concelho / Freguesia</Label>
                  <p className="pt-1.5 text-sm text-muted-foreground">
                    {p.district} / {p.municipality} / {p.parish}
                  </p>
                </div>
              </div>

              <details className="mt-3 border-t border-border pt-3">
                <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                  Mais detalhes (código interno, estado, aquisição, seguros, notas…)
                </summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Código interno</Label>
                    <Input
                      value={p.internalCode ?? ""}
                      onChange={(e) =>
                        setProperties((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, internalCode: e.target.value || null } : x))
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Estado</Label>
                    <Select
                      value={p.status}
                      onChange={(e) =>
                        setProperties((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, status: e.target.value as PropertyStatus } : x))
                        )
                      }
                    >
                      {Object.entries(PROPERTY_STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Condomínio mensal (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={p.condoFeeMonthly ?? ""}
                      onChange={(e) =>
                        setProperties((prev) =>
                          prev.map((x, i) =>
                            i === idx ? { ...x, condoFeeMonthly: e.target.value ? Number(e.target.value) : null } : x
                          )
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Data de aquisição</Label>
                    <Input
                      type="date"
                      value={p.acquisitionDate ?? ""}
                      onChange={(e) =>
                        setProperties((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, acquisitionDate: e.target.value || null } : x))
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Valor de aquisição (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={p.acquisitionValue ?? ""}
                      onChange={(e) =>
                        setProperties((prev) =>
                          prev.map((x, i) =>
                            i === idx ? { ...x, acquisitionValue: e.target.value ? Number(e.target.value) : null } : x
                          )
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Valor estimado atual (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={p.estimatedValue ?? ""}
                      onChange={(e) =>
                        setProperties((prev) =>
                          prev.map((x, i) =>
                            i === idx ? { ...x, estimatedValue: e.target.value ? Number(e.target.value) : null } : x
                          )
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Certificado energético</Label>
                    <Input
                      placeholder="Ex.: SCE123456 / classe B"
                      value={p.energyCertificate ?? ""}
                      onChange={(e) =>
                        setProperties((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, energyCertificate: e.target.value || null } : x))
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Validade do certificado</Label>
                    <Input
                      type="date"
                      value={p.energyCertificateExpiry ?? ""}
                      onChange={(e) =>
                        setProperties((prev) =>
                          prev.map((x, i) =>
                            i === idx ? { ...x, energyCertificateExpiry: e.target.value || null } : x
                          )
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Licença de utilização</Label>
                    <Input
                      value={p.usageLicense ?? ""}
                      onChange={(e) =>
                        setProperties((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, usageLicense: e.target.value || null } : x))
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Apólice de seguro</Label>
                    <Input
                      value={p.insurancePolicy ?? ""}
                      onChange={(e) =>
                        setProperties((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, insurancePolicy: e.target.value || null } : x))
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Validade do seguro</Label>
                    <Input
                      type="date"
                      value={p.insuranceExpiry ?? ""}
                      onChange={(e) =>
                        setProperties((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, insuranceExpiry: e.target.value || null } : x))
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-3">
                    <Label>Observações</Label>
                    <Input
                      value={p.notes ?? ""}
                      onChange={(e) =>
                        setProperties((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, notes: e.target.value || null } : x))
                        )
                      }
                    />
                  </div>
                </div>
              </details>
            </div>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-lg border border-border bg-card p-5">
        <legend className="px-1 text-sm font-semibold">Titulares / proprietários</legend>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Soma das quotas-parte:</span>
          <Badge tone={percentageOk ? "green" : "red"}>{percentageSum.toFixed(2)}%</Badge>
          {!percentageOk && <span className="text-red-700">deveria somar 100%</span>}
        </div>
        <div className="space-y-3">
          {owners.map((o, idx) => (
            <div key={o.taxNumber} className="rounded-md border border-border p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-medium">
                  {o.name} <span className="text-muted-foreground">— NIF {o.taxNumber}</span>
                </div>
                {o.existingOwnerId ? (
                  <Badge tone="blue">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Proprietário já existe
                  </Badge>
                ) : (
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={o.createNew}
                      onChange={(e) =>
                        setOwners((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, createNew: e.target.checked } : x))
                        )
                      }
                    />
                    Criar novo proprietário
                  </label>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Quota-parte (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={o.ownershipPercentage}
                    onChange={(e) =>
                      setOwners((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, ownershipPercentage: Number(e.target.value) } : x))
                      )
                    }
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Morada</Label>
                  <p className="pt-1.5 text-sm text-muted-foreground">{o.address ?? "—"}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </fieldset>

      <div className="flex gap-3">
        <Button onClick={handleImport} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          {loading ? "A importar..." : "Confirmar e importar"}
        </Button>
        <Button type="button" variant="outline" onClick={() => setStep("upload")} disabled={loading}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
