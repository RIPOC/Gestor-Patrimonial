/**
 * Transporte HTTPS do webservice AT — certificado cliente (PFX), timeout
 * configurável, sem retry automático (nunca repetir emitirRecibo por engano).
 *
 * Em modo mock (sem certificado configurado) devolve respostas simuladas,
 * sem qualquer chamada de rede — é o modo por omissão enquanto o produtor de
 * software não tiver recebido o certificado de testes da AT.
 */

import https from "node:https";
import type { ATConfig } from "./env";
import { isATFullyConfigured } from "./env";
import type { ATOperation } from "./types";

export interface SoapCallResult {
  ok: boolean;
  httpStatus: number | null;
  responseXml: string | null;
  errorType: "network" | "timeout" | "http" | null;
  errorMessage: string | null;
  durationMs: number;
}

function mockResponseFor(operation: ATOperation): string {
  const ns = "https://servicos.portaldasfinancas.gov.pt/arrendamento/schemas";
  if (operation === "registarDadosContrato") {
    return `<S:Envelope xmlns:S="http://schemas.xmlsoap.org/soap/envelope/"><S:Body><registarDadosContratoResponse xmlns="${ns}"><codigo>0</codigo><mensagem>[MOCK] Documento registado com sucesso.</mensagem><numeroContrato>900000001</numeroContrato></registarDadosContratoResponse></S:Body></S:Envelope>`;
  }
  if (operation === "emitirRecibo") {
    return `<S:Envelope xmlns:S="http://schemas.xmlsoap.org/soap/envelope/"><S:Body><emitirReciboResponse xmlns="${ns}"><codigo>0</codigo><mensagem>[MOCK] Documento registado com sucesso.</mensagem><numeroRecibo>800000001</numeroRecibo></emitirReciboResponse></S:Body></S:Envelope>`;
  }
  const emptyPdfBase64 = Buffer.from("%PDF-1.4 [MOCK]").toString("base64");
  return `<S:Envelope xmlns:S="http://schemas.xmlsoap.org/soap/envelope/"><S:Body><obterReciboResponse xmlns="${ns}"><codigo>0</codigo><mensagem>[MOCK]</mensagem><recibo>${emptyPdfBase64}</recibo></obterReciboResponse></S:Body></S:Envelope>`;
}

/** Executa o pedido SOAP contra a AT (ou devolve mock se não configurado). */
export async function postSoapRequest(
  config: ATConfig,
  operation: ATOperation,
  envelopeXml: string
): Promise<SoapCallResult> {
  const start = Date.now();

  if (!isATFullyConfigured(config)) {
    return {
      ok: true,
      httpStatus: 200,
      responseXml: mockResponseFor(operation),
      errorType: null,
      errorMessage: null,
      durationMs: Date.now() - start,
    };
  }

  return new Promise((resolve) => {
    const url = new URL(config.endpoint);

    const agent = new https.Agent({
      pfx: Buffer.from(config.clientCertPfxBase64!, "base64"),
      passphrase: config.clientCertPfxPassword!,
      rejectUnauthorized: true,
    });

    const bodyBuffer = Buffer.from(envelopeXml, "utf-8");

    const req = https.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: "POST",
        agent,
        timeout: config.soapTimeoutMs,
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          SOAPAction: "",
          "Content-Length": bodyBuffer.length,
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const responseXml = Buffer.concat(chunks).toString("utf-8");
          resolve({
            ok: (res.statusCode ?? 500) < 400,
            httpStatus: res.statusCode ?? null,
            responseXml,
            errorType: (res.statusCode ?? 500) >= 400 ? "http" : null,
            errorMessage: null,
            durationMs: Date.now() - start,
          });
        });
      }
    );

    req.on("timeout", () => {
      req.destroy();
      resolve({
        ok: false,
        httpStatus: null,
        responseXml: null,
        errorType: "timeout",
        errorMessage: `Sem resposta da AT em ${config.soapTimeoutMs}ms`,
        durationMs: Date.now() - start,
      });
    });

    req.on("error", (err) => {
      resolve({
        ok: false,
        httpStatus: null,
        responseXml: null,
        errorType: "network",
        errorMessage: err.message,
        durationMs: Date.now() - start,
      });
    });

    req.write(bodyBuffer);
    req.end();
  });
}
