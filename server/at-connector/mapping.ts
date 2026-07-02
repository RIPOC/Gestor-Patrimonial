import type {
  ATContractPurpose,
  ATContractRegistrationRequest,
  ATContractTenant,
  ATContractType,
  ATErrorDetail,
  ATLandlord,
  ATReceiptIssueRequest,
  ATReceiptTenant,
  ATReceiptType,
} from "./types";

/** Divide "XXXX-YYY" (formato postal português) nos dois campos exigidos pela AT. */
function splitPostalCode(postalCode: string | null): { codigoPostal?: string; unidadeFuncional?: string } {
  if (!postalCode) return {};
  const match = postalCode.replace(/\s/g, "").match(/^(\d{4})-?(\d{3})?$/);
  if (!match) return {};
  return { codigoPostal: match[1], unidadeFuncional: match[2] };
}

/** Deriva finalidade AT a partir do tipo de contrato interno (aproximação — confirmável/editável na UI). */
function inferPurpose(leaseType: string): ATContractPurpose {
  return leaseType === "habitacao" ? "H_PERM" : "N_HABI";
}

export interface PropertyForMapping {
  tax_district_code: string | null;
  tax_municipality_code: string | null;
  tax_parish_code: string | null;
  matrix_type: string | null;
  matrix_section: string | null;
  matrix_article: string | null;
  fraction: string | null;
  postal_code: string | null;
  address: string | null;
  municipality: string | null;
  at_lot_number: string | null;
  at_floor: string | null;
  at_rented_part: string | null;
  at_common_part: boolean;
  at_missing_registration: boolean;
}

export interface OwnerForMapping {
  tax_number: string | null;
  ownership_percentage: number;
  at_quota_parte: string | null;
  at_marriage_regime: "CO_GER" | "CO_ADQ" | null;
  at_spouse_tax_number: string | null;
  at_benefit_code: string | null;
}

export interface TenantForMapping {
  tax_number: string | null;
  id_document: string | null;
  at_country_code: string;
  at_retention_code: string | null;
  at_foreign_name: string | null;
}

export interface LeaseForContractMapping {
  reference: string;
  lease_type: string;
  start_date: string;
  end_date: string | null;
  auto_renewal: boolean;
  current_rent: number;
  nif_declarante: string;
  properties: PropertyForMapping[];
  owners: OwnerForMapping[];
  tenants: TenantForMapping[];
  authorized_tax_number: string | null;
  at_contract_type: ATContractType;
}

/** Deriva a quota-parte AT a partir da percentagem interna quando não há override explícito. */
function quotaParteFromPercentage(percentage: number, override: string | null): string {
  if (override) return override;
  if (percentage >= 100) return "1";
  // Aproxima a percentagem a uma fração simples de denominador 100
  const num = Math.round(percentage);
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(num, 100) || 1;
  return `${num / divisor}/${100 / divisor}`;
}

/**
 * Constrói o pedido registarDadosContrato a partir dos dados internos.
 * Devolve erros (dados em falta) em vez de lançar exceção — a UI mostra a
 * checklist antes de permitir a submissão ("Validar dados").
 */
export function mapLeaseToContractRequest(
  lease: LeaseForContractMapping
): { request: ATContractRegistrationRequest } | { errors: ATErrorDetail[] } {
  const errors: ATErrorDetail[] = [];

  if (lease.properties.length === 0) errors.push({ campo: "imoveis", mensagem: "Contrato sem imóvel associado" });
  const imoveis = lease.properties.map((p, i) => {
    const prefix = `imoveis[${i}]`;
    if (!p.tax_district_code || !p.tax_municipality_code || !p.tax_parish_code) {
      errors.push({
        campo: `${prefix}.localizacao`,
        mensagem: "Códigos de distrito/concelho/freguesia (AT) por preencher na ficha do imóvel",
      });
    }
    if (!p.matrix_type) {
      errors.push({ campo: `${prefix}.tipo`, mensagem: "Tipo de matriz (Urbano/Rústico) por preencher na ficha do imóvel" });
    }
    return {
      distrito: p.tax_district_code ?? "",
      concelho: p.tax_municipality_code ?? "",
      freguesia: p.tax_parish_code ?? "",
      tipo: (p.matrix_type as "U" | "R") ?? "U",
      seccao: p.matrix_section ?? undefined,
      artigo: p.matrix_article ?? undefined,
      fracao: p.fraction ?? undefined,
      ...splitPostalCode(p.postal_code),
      localidade: p.municipality ?? undefined,
      morada: p.address ?? undefined,
      numeroLote: p.at_lot_number ?? undefined,
      andar: p.at_floor ?? undefined,
      parteArrendada: p.at_rented_part ?? undefined,
      parteComum: p.at_common_part,
      bemOmisso: p.at_missing_registration,
    };
  });

  if (lease.owners.length === 0) errors.push({ campo: "locadores", mensagem: "Contrato sem proprietário associado" });
  const locadores: ATLandlord[] = lease.owners.map((o, i) => {
    if (!o.tax_number) errors.push({ campo: `locadores[${i}].nif`, mensagem: "Proprietário sem NIF preenchido" });
    return {
      nif: o.tax_number ?? "",
      quotaParte: quotaParteFromPercentage(o.ownership_percentage, o.at_quota_parte),
      regimeCasamento: o.at_marriage_regime ?? undefined,
      nifConjuge: o.at_spouse_tax_number ?? undefined,
      beneficio: (o.at_benefit_code as ATLandlord["beneficio"]) ?? undefined,
    };
  });

  if (lease.tenants.length === 0) errors.push({ campo: "locatarios", mensagem: "Contrato sem inquilino associado" });
  const locatarios: ATContractTenant[] = lease.tenants.map((t, i) => {
    const country = t.at_country_code || "PT";
    if (country === "PT" && !t.tax_number) {
      errors.push({ campo: `locatarios[${i}].nif`, mensagem: "Inquilino português sem NIF preenchido" });
    }
    if (country !== "PT" && !t.id_document) {
      errors.push({ campo: `locatarios[${i}].docIdentificacao`, mensagem: "Inquilino estrangeiro sem documento de identificação" });
    }
    return {
      nif: t.tax_number ?? undefined,
      docIdentificacao: t.id_document ?? undefined,
      nomeEstrangeiro: t.at_foreign_name ?? undefined,
      pais: country,
      retencaoFonte: (t.at_retention_code as ATContractTenant["retencaoFonte"]) ?? undefined,
    };
  });

  if (errors.length > 0) return { errors };

  return {
    request: {
      nifDeclarante: lease.nif_declarante,
      referencia: lease.reference.slice(0, 40),
      tipo: lease.at_contract_type,
      finalidade: inferPurpose(lease.lease_type),
      dataInicio: lease.start_date,
      dataTermo: lease.end_date ?? undefined,
      renovavel: lease.auto_renewal,
      imoveis,
      locadores,
      locatarios,
      valorRenda: lease.current_rent,
      periodoRenda: "MENSAL",
      nifAutorizado: lease.authorized_tax_number ?? undefined,
    },
  };
}

export interface RentForReceiptMapping {
  at_contract_number: number;
  at_contract_version: number | null;
  nif_emitente: string;
  owners_nifs: string[];
  tenants: TenantForMapping[];
  receipt_type: ATReceiptType;
  period_start: string;
  period_end: string;
  amount_type: "RENDAC" | "CAUCAO" | "ADIANT";
  amount: number;
  received_date: string;
}

export function mapRentToReceiptRequest(
  rent: RentForReceiptMapping
): { request: ATReceiptIssueRequest } | { errors: ATErrorDetail[] } {
  const errors: ATErrorDetail[] = [];

  if (!rent.at_contract_number) {
    errors.push({ campo: "numeroContrato", mensagem: "Contrato ainda não comunicado à AT — comunique o contrato primeiro" });
  }
  if (rent.owners_nifs.length === 0) errors.push({ campo: "locadores", mensagem: "Renda sem proprietário associado" });

  const locatarios: ATReceiptTenant[] = rent.tenants.map((t, i) => {
    const country = t.at_country_code || "PT";
    if (country === "PT" && !t.tax_number) {
      errors.push({ campo: `locatarios[${i}].nif`, mensagem: "Inquilino português sem NIF preenchido" });
    }
    return {
      nif: t.tax_number ?? undefined,
      docIdentificacao: t.id_document ?? undefined,
      pais: country,
      retencaoFonte: (t.at_retention_code as ATReceiptTenant["retencaoFonte"]) ?? undefined,
    };
  });
  if (rent.tenants.length === 0) errors.push({ campo: "locatarios", mensagem: "Renda sem inquilino associado" });

  if (errors.length > 0) return { errors };

  return {
    request: {
      numeroContrato: rent.at_contract_number,
      versaoContrato: rent.at_contract_version ?? undefined,
      nifEmitente: rent.nif_emitente,
      locadores: rent.owners_nifs.map((nif) => ({ nif })),
      locatarios,
      tipo: rent.receipt_type,
      dataInicio: rent.period_start,
      dataFim: rent.period_end,
      tipoImportancia: rent.amount_type,
      valor: rent.amount,
      dataRecebimento: rent.received_date,
    },
  };
}
