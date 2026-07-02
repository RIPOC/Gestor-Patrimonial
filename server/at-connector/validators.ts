import { isValidNif } from "./nif";
import type {
  ATContractRegistrationRequest,
  ATErrorDetail,
  ATReceiptIssueRequest,
} from "./types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const QUOTA_PARTE_RE = /^\d(\d{0,5}\/\d{1,6})?$/;

function err(campo: string, mensagem: string): ATErrorDetail {
  return { campo, mensagem };
}

/** Valida um pedido de comunicação de contrato antes de construir o SOAP. */
export function validateContractRequest(req: ATContractRegistrationRequest): ATErrorDetail[] {
  const errors: ATErrorDetail[] = [];

  if (!isValidNif(req.nifDeclarante)) errors.push(err("nifDeclarante", "NIF do declarante inválido"));
  if (!req.referencia || req.referencia.length > 40) {
    errors.push(err("referencia", "Referência obrigatória (máx. 40 caracteres)"));
  }
  if (!req.tipo) errors.push(err("tipo", "Tipo de contrato obrigatório"));
  if (!req.finalidade) errors.push(err("finalidade", "Finalidade obrigatória"));
  if (!DATE_RE.test(req.dataInicio)) errors.push(err("dataInicio", "Data de início obrigatória (YYYY-MM-DD)"));
  if (req.dataTermo && !DATE_RE.test(req.dataTermo)) {
    errors.push(err("dataTermo", "Data de termo em formato inválido (YYYY-MM-DD)"));
  }

  if (!req.imoveis || req.imoveis.length === 0) {
    errors.push(err("imoveis", "Pelo menos um imóvel é obrigatório"));
  } else {
    req.imoveis.forEach((imovel, i) => {
      const prefix = `imoveis[${i}]`;
      if (!imovel.distrito || imovel.distrito.length !== 2) errors.push(err(`${prefix}.distrito`, "Código de distrito deve ter 2 caracteres"));
      if (!imovel.concelho || imovel.concelho.length !== 2) errors.push(err(`${prefix}.concelho`, "Código de concelho deve ter 2 caracteres"));
      if (!imovel.freguesia || imovel.freguesia.length !== 2) errors.push(err(`${prefix}.freguesia`, "Código de freguesia deve ter 2 caracteres"));
      if (imovel.tipo !== "U" && imovel.tipo !== "R") errors.push(err(`${prefix}.tipo`, "Tipo de imóvel deve ser U ou R"));
      if (imovel.artigo && imovel.artigo.length > 7) errors.push(err(`${prefix}.artigo`, "Artigo excede 7 caracteres"));
      if (imovel.fracao && imovel.fracao.length > 5) errors.push(err(`${prefix}.fracao`, "Fração excede 5 caracteres"));
      if (imovel.codigoPostal && !/^\d{4}$/.test(imovel.codigoPostal)) errors.push(err(`${prefix}.codigoPostal`, "Código postal deve ter 4 dígitos, sem hífen"));
      if (imovel.unidadeFuncional && !/^\d{3}$/.test(imovel.unidadeFuncional)) errors.push(err(`${prefix}.unidadeFuncional`, "Unidade funcional deve ter 3 dígitos"));
    });
  }

  if (!req.locadores || req.locadores.length === 0) {
    errors.push(err("locadores", "Pelo menos um locador é obrigatório"));
  } else {
    req.locadores.forEach((locador, i) => {
      const prefix = `locadores[${i}]`;
      if (!isValidNif(locador.nif)) errors.push(err(`${prefix}.nif`, "NIF do locador inválido"));
      if (!locador.quotaParte || !QUOTA_PARTE_RE.test(locador.quotaParte)) {
        errors.push(err(`${prefix}.quotaParte`, 'Quota-parte inválida (ex.: "1", "1/2", "2/3")'));
      }
    });
  }

  if (!req.locatarios || req.locatarios.length === 0) {
    errors.push(err("locatarios", "Pelo menos um locatário é obrigatório"));
  } else {
    req.locatarios.forEach((locatario, i) => {
      const prefix = `locatarios[${i}]`;
      if (!locatario.pais) errors.push(err(`${prefix}.pais`, "País do locatário obrigatório"));
      if (locatario.pais === "PT" && !locatario.nif) {
        errors.push(err(`${prefix}.nif`, "NIF obrigatório para locatário português"));
      }
      if (locatario.pais !== "PT" && !locatario.docIdentificacao) {
        errors.push(err(`${prefix}.docIdentificacao`, "Documento de identificação obrigatório para locatário estrangeiro"));
      }
      if (locatario.nif && !isValidNif(locatario.nif)) {
        errors.push(err(`${prefix}.nif`, "NIF do locatário inválido"));
      }
    });
  }

  if (!(req.valorRenda > 0)) errors.push(err("valorRenda", "Valor da renda tem de ser positivo"));
  if (!req.periodoRenda) errors.push(err("periodoRenda", "Período de renda obrigatório"));

  return errors;
}

/** Valida um pedido de emissão de recibo antes de construir o SOAP. */
export function validateReceiptRequest(req: ATReceiptIssueRequest): ATErrorDetail[] {
  const errors: ATErrorDetail[] = [];

  if (!req.numeroContrato) errors.push(err("numeroContrato", "Número do contrato AT obrigatório"));
  if (!isValidNif(req.nifEmitente)) errors.push(err("nifEmitente", "NIF do emitente inválido"));

  if (!req.locadores || req.locadores.length === 0) {
    errors.push(err("locadores", "Pelo menos um locador é obrigatório"));
  } else {
    req.locadores.forEach((l, i) => {
      if (!isValidNif(l.nif)) errors.push(err(`locadores[${i}].nif`, "NIF do locador inválido"));
    });
  }

  if (!req.locatarios || req.locatarios.length === 0) {
    errors.push(err("locatarios", "Pelo menos um locatário é obrigatório"));
  } else {
    req.locatarios.forEach((t, i) => {
      const prefix = `locatarios[${i}]`;
      if (!t.pais) errors.push(err(`${prefix}.pais`, "País do locatário obrigatório"));
      if (t.pais === "PT" && !t.nif) errors.push(err(`${prefix}.nif`, "NIF obrigatório para locatário português"));
      if (t.nif && !isValidNif(t.nif)) errors.push(err(`${prefix}.nif`, "NIF do locatário inválido"));
    });
  }

  if (!req.tipo) errors.push(err("tipo", "Tipo de recibo obrigatório"));
  if (!DATE_RE.test(req.dataInicio)) errors.push(err("dataInicio", "Data de início do período obrigatória (YYYY-MM-DD)"));
  if (!DATE_RE.test(req.dataFim)) errors.push(err("dataFim", "Data de fim do período obrigatória (YYYY-MM-DD)"));
  if (!req.tipoImportancia) errors.push(err("tipoImportancia", "Tipo de importância obrigatório"));
  if (!(req.valor > 0)) errors.push(err("valor", "Valor tem de ser positivo"));
  if (!DATE_RE.test(req.dataRecebimento)) errors.push(err("dataRecebimento", "Data de recebimento obrigatória (YYYY-MM-DD)"));

  (req.herdeiros ?? []).forEach((h, i) => {
    const prefix = `herdeiros[${i}]`;
    if (!isValidNif(h.nif)) errors.push(err(`${prefix}.nif`, "NIF do herdeiro inválido"));
    if (!QUOTA_PARTE_RE.test(h.quotaParte)) errors.push(err(`${prefix}.quotaParte`, "Quota-parte do herdeiro inválida"));
    if (!isValidNif(h.nifHeranca)) errors.push(err(`${prefix}.nifHeranca`, "NIF da herança inválido"));
  });

  return errors;
}

export function validateCredentialsUsername(username: string): ATErrorDetail[] {
  const errors: ATErrorDetail[] = [];
  const match = /^(\d{9})\/(\d{1,6}|0000)$/.test(username) || /^\d{9}\/[a-zA-Z0-9]{1,6}$/.test(username);
  if (!username || !match) {
    errors.push(err("username", 'Utilizador inválido — formato esperado "NIF/UserId" (ex.: 555555555/0000)'));
  }
  return errors;
}
