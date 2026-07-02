/**
 * Construção e leitura das mensagens SOAP do webservice de arrendamento da AT.
 * Namespaces confirmados por leitura direta de arrendamento6.wsdl:
 *
 *   S   = http://schemas.xmlsoap.org/soap/envelope/
 *   wss = http://schemas.xmlsoap.org/ws/2002/12/secext
 *   at  = http://at.pt/wsp/auth
 *   sch = https://servicos.portaldasfinancas.gov.pt/arrendamento/schemas
 *
 * Estilo document/literal — o SOAP:Body contém diretamente o elemento do
 * pedido (ex.: <registarDadosContratoRequest>), qualificado no namespace
 * `sch` (elementFormDefault="qualified" no XSD aplica-se a todos os
 * elementos-filho, não só ao de topo).
 *
 * Nunca concatenar XML manualmente: usa-se xmlbuilder2 (escaping automático)
 * para construir e fast-xml-parser para interpretar as respostas.
 */

import { create } from "xmlbuilder2";
import { XMLParser } from "fast-xml-parser";
import type { WsSecurityFields } from "./crypto";
import type {
  ATContractRegistrationRequest,
  ATContractRegistrationResponse,
  ATErrorDetail,
  ATReceiptGetRequest,
  ATReceiptGetResponse,
  ATReceiptIssueRequest,
  ATReceiptIssueResponse,
} from "./types";

const NS_SOAP = "http://schemas.xmlsoap.org/soap/envelope/";
const NS_WSS = "http://schemas.xmlsoap.org/ws/2002/12/secext";
const NS_AT = "http://at.pt/wsp/auth";
const NS_SCH = "https://servicos.portaldasfinancas.gov.pt/arrendamento/schemas";

/** Remove chaves com valor undefined recursivamente (xmlbuilder2 não lida bem com undefined). */
function compact<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(compact) as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue;
      out[k] = compact(v);
    }
    return out as T;
  }
  return value;
}

function xsBool(v: boolean | undefined): string | undefined {
  return v === undefined ? undefined : v ? "true" : "false";
}

// -----------------------------------------------------------------------------
// SOAP:Header
// -----------------------------------------------------------------------------

function buildSecurityHeaderObject(fields: WsSecurityFields) {
  return {
    "S:Header": {
      "wss:Security": {
        "@xmlns:wss": NS_WSS,
        "@xmlns:at": NS_AT,
        "@at:Version": "2",
        "wss:UsernameToken": {
          "wss:Username": fields.username,
          "wss:Password": {
            "@Digest": fields.passwordDigestBase64,
            "#": fields.passwordBase64,
          },
          "wss:Nonce": fields.nonceBase64,
          "wss:Created": fields.created,
        },
      },
    },
  };
}

// -----------------------------------------------------------------------------
// SOAP:Body — registarDadosContrato
// -----------------------------------------------------------------------------

function buildContractRequestBody(req: ATContractRegistrationRequest) {
  return {
    "sch:registarDadosContratoRequest": compact({
      "@xmlns:sch": NS_SCH,
      "sch:nifDeclarante": req.nifDeclarante,
      "sch:referencia": req.referencia,
      "sch:tipo": req.tipo,
      "sch:finalidade": req.finalidade,
      "sch:dataInicio": req.dataInicio,
      "sch:dataTermo": req.dataTermo,
      "sch:renovavel": xsBool(req.renovavel),
      "sch:imoveis": {
        "sch:imovel": req.imoveis.map((im) => ({
          "sch:distrito": im.distrito,
          "sch:concelho": im.concelho,
          "sch:freguesia": im.freguesia,
          "sch:tipo": im.tipo,
          "sch:seccao": im.seccao,
          "sch:artigo": im.artigo,
          "sch:fracao": im.fracao,
          "sch:arvCol": im.arvCol,
          "sch:codigoPostal": im.codigoPostal,
          "sch:unidadeFuncional": im.unidadeFuncional,
          "sch:localidade": im.localidade,
          "sch:morada": im.morada,
          "sch:numeroLote": im.numeroLote,
          "sch:andar": im.andar,
          "sch:parteArrendada": im.parteArrendada,
          "sch:parteComum": xsBool(im.parteComum),
          "sch:bemOmisso": xsBool(im.bemOmisso),
        })),
      },
      "sch:locadores": {
        "sch:locador": req.locadores.map((l) => ({
          "sch:nif": l.nif,
          "sch:quotaParte": l.quotaParte,
          "sch:regimeCasamento": l.regimeCasamento,
          "sch:nifConjuge": l.nifConjuge,
          "sch:beneficio": l.beneficio,
        })),
      },
      "sch:locatarios": {
        "sch:locatario": req.locatarios.map((t) => ({
          "sch:nif": t.nif,
          "sch:docIdentificacao": t.docIdentificacao,
          "sch:nomeEstrangeiro": t.nomeEstrangeiro,
          "sch:pais": t.pais,
          "sch:retencaoFonte": t.retencaoFonte,
        })),
      },
      "sch:valorRenda": String(req.valorRenda),
      "sch:valorDespesas": req.valorDespesas != null ? String(req.valorDespesas) : undefined,
      "sch:valorRendaMaxima": req.valorRendaMaxima != null ? String(req.valorRendaMaxima) : undefined,
      "sch:periodoRenda": req.periodoRenda,
      "sch:locadoresPrevios": req.locadoresPrevios?.length
        ? { "sch:locadorPrevio": req.locadoresPrevios.map((p) => ({ "sch:nif": p.nif })) }
        : undefined,
      "sch:observacoes": req.observacoes,
      "sch:nifAutorizado": req.nifAutorizado,
    }),
  };
}

// -----------------------------------------------------------------------------
// SOAP:Body — emitirRecibo
// -----------------------------------------------------------------------------

function buildReceiptRequestBody(req: ATReceiptIssueRequest) {
  return {
    "sch:emitirReciboRequest": compact({
      "@xmlns:sch": NS_SCH,
      "sch:numeroContrato": String(req.numeroContrato),
      "sch:versaoContrato": req.versaoContrato != null ? String(req.versaoContrato) : undefined,
      "sch:nifEmitente": req.nifEmitente,
      "sch:locadores": {
        "sch:locador": req.locadores.map((l) => ({ "sch:nif": l.nif })),
      },
      "sch:locatarios": {
        "sch:locatario": req.locatarios.map((t) => ({
          "sch:nif": t.nif,
          "sch:docIdentificacao": t.docIdentificacao,
          "sch:pais": t.pais,
          "sch:retencaoFonte": t.retencaoFonte,
        })),
      },
      "sch:tipo": req.tipo,
      "sch:dataInicio": req.dataInicio,
      "sch:dataFim": req.dataFim,
      "sch:tipoImportancia": req.tipoImportancia,
      "sch:valor": String(req.valor),
      "sch:herdeiros": req.herdeiros?.length
        ? {
            "sch:herdeiro": req.herdeiros.map((h) => ({
              "sch:nif": h.nif,
              "sch:quotaParte": h.quotaParte,
              "sch:nifHeranca": h.nifHeranca,
            })),
          }
        : undefined,
      "sch:dataRecebimento": req.dataRecebimento,
    }),
  };
}

// -----------------------------------------------------------------------------
// SOAP:Body — obterRecibo
// -----------------------------------------------------------------------------

function buildGetReceiptRequestBody(req: ATReceiptGetRequest) {
  return {
    "sch:obterReciboRequest": {
      "@xmlns:sch": NS_SCH,
      "sch:numeroContrato": String(req.numeroContrato),
      "sch:numeroRecibo": String(req.numeroRecibo),
    },
  };
}

// -----------------------------------------------------------------------------
// Envelope completo
// -----------------------------------------------------------------------------

function buildEnvelope(security: WsSecurityFields, body: Record<string, unknown>): string {
  const obj = {
    "S:Envelope": {
      "@xmlns:S": NS_SOAP,
      ...buildSecurityHeaderObject(security),
      "S:Body": body,
    },
  };
  return create(obj).end({ headless: false, prettyPrint: false });
}

export function buildRegisterContractEnvelope(
  security: WsSecurityFields,
  req: ATContractRegistrationRequest
): string {
  return buildEnvelope(security, buildContractRequestBody(req));
}

export function buildIssueReceiptEnvelope(
  security: WsSecurityFields,
  req: ATReceiptIssueRequest
): string {
  return buildEnvelope(security, buildReceiptRequestBody(req));
}

export function buildGetReceiptEnvelope(
  security: WsSecurityFields,
  req: ATReceiptGetRequest
): string {
  return buildEnvelope(security, buildGetReceiptRequestBody(req));
}

// -----------------------------------------------------------------------------
// Parsing das respostas
// -----------------------------------------------------------------------------

const parser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,
  isArray: (name) => name === "erro" || name === "locador" || name === "locatario" || name === "imovel" || name === "herdeiro",
});

function findDeep(obj: unknown, key: string): unknown {
  if (obj == null || typeof obj !== "object") return undefined;
  const record = obj as Record<string, unknown>;
  if (key in record) return record[key];
  for (const value of Object.values(record)) {
    const found = findDeep(value, key);
    if (found !== undefined) return found;
  }
  return undefined;
}

function parseErrors(node: unknown): ATErrorDetail[] | undefined {
  const errosNode = findDeep(node, "erros");
  if (!errosNode) return undefined;
  const list = findDeep(errosNode, "erro");
  const arr = Array.isArray(list) ? list : list ? [list] : [];
  return arr.map((e) => {
    const rec = e as Record<string, unknown>;
    return {
      campo: typeof rec.campo === "string" ? rec.campo : undefined,
      mensagem: String(rec.mensagem ?? ""),
    };
  });
}

export function parseContractRegistrationResponse(xml: string): ATContractRegistrationResponse {
  const parsed = parser.parse(xml);
  const node = findDeep(parsed, "registarDadosContratoResponse");
  const rec = (node ?? {}) as Record<string, unknown>;
  return {
    codigo: Number(rec.codigo),
    mensagem: rec.mensagem != null ? String(rec.mensagem) : undefined,
    numeroContrato: rec.numeroContrato != null ? Number(rec.numeroContrato) : undefined,
    erros: parseErrors(node),
  };
}

export function parseReceiptIssueResponse(xml: string): ATReceiptIssueResponse {
  const parsed = parser.parse(xml);
  const node = findDeep(parsed, "emitirReciboResponse");
  const rec = (node ?? {}) as Record<string, unknown>;
  return {
    codigo: Number(rec.codigo),
    mensagem: rec.mensagem != null ? String(rec.mensagem) : undefined,
    numeroRecibo: rec.numeroRecibo != null ? Number(rec.numeroRecibo) : undefined,
    erros: parseErrors(node),
  };
}

export function parseReceiptGetResponse(xml: string): ATReceiptGetResponse {
  const parsed = parser.parse(xml);
  const node = findDeep(parsed, "obterReciboResponse");
  const rec = (node ?? {}) as Record<string, unknown>;
  return {
    codigo: Number(rec.codigo),
    mensagem: rec.mensagem != null ? String(rec.mensagem) : undefined,
    recibo: rec.recibo != null ? String(rec.recibo) : undefined,
    erros: parseErrors(node),
  };
}
