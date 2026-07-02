import type { ATEnvironment } from "./types";

const TEST_ENDPOINT = "https://servicos.portaldasfinancas.gov.pt:709/ws/arrendamento";
const PROD_ENDPOINT = "https://servicos.portaldasfinancas.gov.pt:409/ws/arrendamento";

export interface ATConfig {
  environment: ATEnvironment;
  endpoint: string;
  soapTimeoutMs: number;
  clientCertPfxBase64: string | null;
  clientCertPfxPassword: string | null;
  authPublicKeyPem: string | null;
  logLevel: string;
}

/**
 * Lê a configuração da integração AT a partir do ambiente.
 * AT_ENV=mock (omisso) nunca contacta a AT — usado enquanto não existirem
 * certificado e credenciais de teste emitidos pela AT.
 */
export function getATConfig(): ATConfig {
  const environment = (process.env.AT_ENV as ATEnvironment) || "mock";

  const endpoint =
    process.env.AT_ENDPOINT_OVERRIDE ||
    (environment === "production"
      ? process.env.AT_PROD_ENDPOINT || PROD_ENDPOINT
      : process.env.AT_TEST_ENDPOINT || TEST_ENDPOINT);

  return {
    environment,
    endpoint,
    soapTimeoutMs: Number(process.env.AT_SOAP_TIMEOUT_MS) || 30000,
    clientCertPfxBase64: process.env.AT_CLIENT_CERT_PFX_BASE64 || null,
    clientCertPfxPassword: process.env.AT_CLIENT_CERT_PFX_PASSWORD || null,
    authPublicKeyPem: process.env.AT_AUTH_PUBLIC_KEY_PEM || null,
    logLevel: process.env.AT_LOG_LEVEL || "info",
  };
}

/** A integração só pode fazer chamadas reais se tiver certificado + chave pública da AT. */
export function isATFullyConfigured(config: ATConfig): boolean {
  return (
    config.environment !== "mock" &&
    Boolean(config.clientCertPfxBase64) &&
    Boolean(config.clientCertPfxPassword) &&
    Boolean(config.authPublicKeyPem)
  );
}
