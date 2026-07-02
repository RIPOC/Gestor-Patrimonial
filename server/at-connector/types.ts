/**
 * DTOs do webservice oficial da AT — Comunicação de contratos de arrendamento
 * e emissão de recibos de renda (arrendamento6.wsdl).
 *
 * Construídos por leitura direta do WSDL e do manual oficial (não copiados
 * cegamente de nenhuma especificação de terceiros). Duas notas importantes
 * onde WSDL e manual divergem:
 *
 * 1. O `locatario` de emitirReciboRequest NÃO tem o campo `nomeEstrangeiro`
 *    (esse campo só existe no `locatario` de registarDadosContratoRequest).
 * 2. O XSD do WSDL só lista RIRS01–RIRS04 para o `retencaoFonte` do recibo,
 *    mas o manual (versão 1.6, 29/07/2024) documenta também RIRS05 como
 *    válido para emissão de recibos. Mantemos as 5 opções no tipo; validar
 *    contra o ambiente de testes da AT antes de confiar cegamente nisto.
 */

// -----------------------------------------------------------------------------
// Enums partilhados
// -----------------------------------------------------------------------------

/** Tipo de contrato — inclui PROMES, que não existe no tipo de recibo. */
export type ATContractType = "ARREND" | "SUBARR" | "PROMES" | "CEDENC" | "ALUGUE";

/** Tipo de recibo — sem PROMES. */
export type ATReceiptType = "ARREND" | "SUBARR" | "CEDENC" | "ALUGUE";

export type ATContractPurpose = "H_PERM" | "H_NPER" | "N_HABI";

export type ATRentPeriod = "MENSAL" | "MENORM";

export type ATPropertyType = "U" | "R";

export type ATMarriageRegime = "CO_GER" | "CO_ADQ";

export type ATBenefitCode =
  | "BNF001" | "BNF002" | "BNF003" | "BNF004" | "BNF005" | "BNF006" | "BNF007" | "BNF008"
  | "BNF009" | "BNF010" | "BNF011" | "BNF012" | "BNF013" | "BNF014" | "BNF015" | "BNF016";

/** Retenção na fonte — válida no contrato (registarDadosContrato). */
export type ATContractRetentionCode = "RIRS01" | "RIRS02" | "RIRS03" | "RIRS04" | "RIRS05";

/** Retenção na fonte — válida no recibo. Ver nota 2 no cabeçalho do ficheiro. */
export type ATReceiptRetentionCode = "RIRS01" | "RIRS02" | "RIRS03" | "RIRS04" | "RIRS05";

export type ATReceiptAmountType = "RENDAC" | "CAUCAO" | "ADIANT";

/** Código ISO 3166-1 alfa-2 do país — a AT usa a sua própria lista fechada (ver WSDL). */
export type ATCountryCode = string;

// -----------------------------------------------------------------------------
// registarDadosContrato
// -----------------------------------------------------------------------------

export interface ATContractProperty {
  distrito: string; // 2 chars
  concelho: string; // 2 chars
  freguesia: string; // 2 chars
  tipo: ATPropertyType;
  seccao?: string; // max 7
  artigo?: string; // max 7
  fracao?: string; // max 5
  arvCol?: string; // max 3
  codigoPostal?: string; // 4 digits
  unidadeFuncional?: string; // 3 digits
  localidade?: string; // max 30
  morada?: string; // max 3000
  numeroLote?: string; // max 50
  andar?: string; // max 50
  parteArrendada?: string; // max 170
  parteComum?: boolean;
  bemOmisso?: boolean;
}

export interface ATLandlord {
  nif: string; // 9 digits
  quotaParte: string; // padrão: \d(\d{0,5}\/\d{1,6})?  ex: "1", "1/2", "2/3"
  regimeCasamento?: ATMarriageRegime;
  nifConjuge?: string;
  beneficio?: ATBenefitCode;
}

/** Locatário do CONTRATO — pode ter nomeEstrangeiro. */
export interface ATContractTenant {
  nif?: string;
  docIdentificacao?: string; // max 100
  nomeEstrangeiro?: string; // max 170
  pais: ATCountryCode;
  retencaoFonte?: ATContractRetentionCode;
}

export interface ATPreviousLandlord {
  nif: string;
}

export interface ATContractRegistrationRequest {
  nifDeclarante: string; // 9 digits
  referencia: string; // max 40
  tipo: ATContractType;
  finalidade: ATContractPurpose;
  dataInicio: string; // YYYY-MM-DD
  dataTermo?: string; // YYYY-MM-DD
  renovavel?: boolean;

  imoveis: ATContractProperty[]; // min 1
  locadores: ATLandlord[]; // min 1
  locatarios: ATContractTenant[]; // min 1

  valorRenda: number;
  valorDespesas?: number;
  valorRendaMaxima?: number;
  periodoRenda: ATRentPeriod;

  locadoresPrevios?: ATPreviousLandlord[];
  observacoes?: string; // max 3000
  nifAutorizado?: string;
}

export interface ATErrorDetail {
  campo?: string;
  mensagem: string;
}

export interface ATContractRegistrationResponse {
  codigo: number;
  mensagem?: string;
  numeroContrato?: number;
  erros?: ATErrorDetail[];
}

// -----------------------------------------------------------------------------
// emitirRecibo
// -----------------------------------------------------------------------------

/** Locatário do RECIBO — sem nomeEstrangeiro (diferente do locatário do contrato). */
export interface ATReceiptTenant {
  nif?: string;
  docIdentificacao?: string;
  pais: ATCountryCode;
  retencaoFonte?: ATReceiptRetentionCode;
}

export interface ATHerdeiro {
  nif: string;
  quotaParte: string;
  nifHeranca: string;
}

export interface ATReceiptIssueRequest {
  numeroContrato: number;
  versaoContrato?: number;
  nifEmitente: string;

  locadores: Array<{ nif: string }>;
  locatarios: ATReceiptTenant[];

  tipo: ATReceiptType;
  dataInicio: string; // YYYY-MM-DD
  dataFim: string; // YYYY-MM-DD
  tipoImportancia: ATReceiptAmountType;
  valor: number;

  herdeiros?: ATHerdeiro[];
  dataRecebimento: string; // YYYY-MM-DD
}

export interface ATReceiptIssueResponse {
  codigo: number;
  mensagem?: string;
  numeroRecibo?: number;
  erros?: ATErrorDetail[];
}

// -----------------------------------------------------------------------------
// obterRecibo
// -----------------------------------------------------------------------------

export interface ATReceiptGetRequest {
  numeroContrato: number;
  numeroRecibo: number;
}

/** O WSDL chama o campo `recibo` (base64Binary), não `reciboBase64`. */
export interface ATReceiptGetResponse {
  codigo: number;
  mensagem?: string;
  recibo?: string; // base64
  erros?: ATErrorDetail[];
}

// -----------------------------------------------------------------------------
// WS-Security / envelope
// -----------------------------------------------------------------------------

export interface ATCredentials {
  /** NIF do emitente + subutilizador, ex.: "555555555/0000". */
  username: string;
  /** Senha do Portal das Finanças — usar só em memória, nunca persistir. */
  password: string;
}

export type ATOperation = "registarDadosContrato" | "emitirRecibo" | "obterRecibo";

export type ATEnvironment = "test" | "production" | "mock";
