import crypto from "node:crypto";

/**
 * Remove o SOAP:Header (autenticação) de um envelope XML antes de o guardar
 * para auditoria. Nunca persistir Username, Password, Digest, Nonce ou Created.
 */
export function redactSoapEnvelope(xml: string): string {
  return xml.replace(/<S:Header>[\s\S]*?<\/S:Header>/, "<S:Header>[REDACTED]</S:Header>");
}

/** Hash determinístico do payload (para deteção de duplicados/auditoria), nunca reversível. */
export function hashPayload(payload: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

/** Garante que nenhuma das chaves sensíveis aparece num objeto antes de ir para log/BD. */
const FORBIDDEN_LOG_KEYS = ["password", "senha", "nonce", "digest", "pfx", "pfxpassword"];

export function assertNoSensitiveKeys(obj: Record<string, unknown>): void {
  for (const key of Object.keys(obj)) {
    if (FORBIDDEN_LOG_KEYS.includes(key.toLowerCase())) {
      throw new Error(`Tentativa de registar campo sensível em log/BD: ${key}`);
    }
  }
}
