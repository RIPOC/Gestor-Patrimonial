/**
 * at-connector — módulo isolado de integração oficial com o webservice SOAP
 * da AT (arrendamento6.wsdl). Zero acesso à base de dados: recebe DTOs já
 * validados, devolve respostas tipadas + XML redigido para auditoria.
 *
 * Chamado exclusivamente a partir de server/services/at-connector-service.ts
 * (camada com acesso a dados). NUNCA importar este módulo em código de
 * cliente/browser.
 */

import { buildWsSecurityFields } from "./crypto";
import { getATConfig, isATFullyConfigured } from "./env";
import { postSoapRequest } from "./client";
import { redactSoapEnvelope } from "./redact";
import {
  buildGetReceiptEnvelope,
  buildIssueReceiptEnvelope,
  buildRegisterContractEnvelope,
  parseContractRegistrationResponse,
  parseReceiptGetResponse,
  parseReceiptIssueResponse,
} from "./soap-xml";
import { validateContractRequest, validateReceiptRequest, validateCredentialsUsername } from "./validators";
import type {
  ATContractRegistrationRequest,
  ATContractRegistrationResponse,
  ATCredentials,
  ATErrorDetail,
  ATReceiptGetRequest,
  ATReceiptGetResponse,
  ATReceiptIssueRequest,
  ATReceiptIssueResponse,
} from "./types";

export * from "./types";
export { getATConfig, isATFullyConfigured } from "./env";
export { isValidNif } from "./nif";
export { validateContractRequest, validateReceiptRequest, validateCredentialsUsername } from "./validators";
export { mapLeaseToContractRequest, mapRentToReceiptRequest } from "./mapping";
export { describeATResponseCode, isAuthErrorCode } from "./codes";
export { redactSoapEnvelope, hashPayload } from "./redact";

export interface ATCallOutcome<T> {
  success: boolean;
  response: T | null;
  requestXmlRedacted: string | null;
  responseXmlRedacted: string | null;
  httpStatus: number | null;
  errorType: "validation" | "network" | "timeout" | "http" | null;
  errorMessage: string | null;
  validationErrors: ATErrorDetail[] | null;
  durationMs: number;
  mock: boolean;
}

async function call<TReq, TRes>(
  operation: "registarDadosContrato" | "emitirRecibo" | "obterRecibo",
  credentials: ATCredentials,
  buildEnvelope: (security: ReturnType<typeof buildWsSecurityFields>, req: TReq) => string,
  parseResponse: (xml: string) => TRes,
  request: TReq,
  preValidationErrors: ATErrorDetail[]
): Promise<ATCallOutcome<TRes>> {
  const start = Date.now();
  const config = getATConfig();

  const usernameErrors = validateCredentialsUsername(credentials.username);
  const allErrors = [...preValidationErrors, ...usernameErrors];
  if (allErrors.length > 0) {
    return {
      success: false,
      response: null,
      requestXmlRedacted: null,
      responseXmlRedacted: null,
      httpStatus: null,
      errorType: "validation",
      errorMessage: "Dados inválidos — ver validationErrors",
      validationErrors: allErrors,
      durationMs: Date.now() - start,
      mock: config.environment === "mock",
    };
  }

  if (!isATFullyConfigured(config) && config.environment !== "mock") {
    return {
      success: false,
      response: null,
      requestXmlRedacted: null,
      responseXmlRedacted: null,
      httpStatus: null,
      errorType: "validation",
      errorMessage: "Integração AT não configurada (certificado/chave pública em falta)",
      validationErrors: null,
      durationMs: Date.now() - start,
      mock: false,
    };
  }

  // Credenciais e Ks só existem nesta função — nunca saem daqui em claro.
  const security = isATFullyConfigured(config)
    ? buildWsSecurityFields({
        username: credentials.username,
        password: credentials.password,
        authPublicKeyPem: config.authPublicKeyPem!,
      })
    : { username: credentials.username, nonceBase64: "[MOCK]", passwordBase64: "[MOCK]", passwordDigestBase64: "[MOCK]", created: new Date().toISOString() };

  const envelopeXml = buildEnvelope(security, request);
  const requestXmlRedacted = redactSoapEnvelope(envelopeXml);

  const result = await postSoapRequest(config, operation, envelopeXml);

  if (!result.ok || !result.responseXml) {
    return {
      success: false,
      response: null,
      requestXmlRedacted,
      responseXmlRedacted: null,
      httpStatus: result.httpStatus,
      errorType: result.errorType,
      errorMessage: result.errorMessage,
      validationErrors: null,
      durationMs: result.durationMs,
      mock: config.environment === "mock",
    };
  }

  const response = parseResponse(result.responseXml);

  return {
    success: true,
    response,
    requestXmlRedacted,
    responseXmlRedacted: redactSoapEnvelope(result.responseXml),
    httpStatus: result.httpStatus,
    errorType: null,
    errorMessage: null,
    validationErrors: null,
    durationMs: result.durationMs,
    mock: config.environment === "mock",
  };
}

export async function registerContract(
  credentials: ATCredentials,
  request: ATContractRegistrationRequest
): Promise<ATCallOutcome<ATContractRegistrationResponse>> {
  return call(
    "registarDadosContrato",
    credentials,
    buildRegisterContractEnvelope,
    parseContractRegistrationResponse,
    request,
    validateContractRequest(request)
  );
}

export async function issueReceipt(
  credentials: ATCredentials,
  request: ATReceiptIssueRequest
): Promise<ATCallOutcome<ATReceiptIssueResponse>> {
  return call(
    "emitirRecibo",
    credentials,
    buildIssueReceiptEnvelope,
    parseReceiptIssueResponse,
    request,
    validateReceiptRequest(request)
  );
}

export async function getReceiptPdf(
  credentials: ATCredentials,
  request: ATReceiptGetRequest
): Promise<ATCallOutcome<ATReceiptGetResponse>> {
  return call(
    "obterRecibo",
    credentials,
    buildGetReceiptEnvelope,
    parseReceiptGetResponse,
    request,
    []
  );
}
