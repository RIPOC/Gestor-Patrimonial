/**
 * Criptografia WS-Security exigida pela AT (manual, secção 4.1 — SOAP:Header).
 *
 *   Nonce    = Base64( RSA_pub(Ks) )
 *   Password = Base64( AES-128-ECB-PKCS5( SenhaPF, Ks ) )
 *   Digest   = Base64( AES-128-ECB-PKCS5( SHA1(Ks + Created + SenhaPF), Ks ) )
 *   Created  = timestamp UTC ISO 8601, não cifrado
 *
 * Ks é uma chave AES-128 aleatória de 16 bytes, gerada de novo em CADA pedido
 * — nunca reutilizar entre invocações (o manual proíbe explicitamente).
 *
 * Nota sobre padding RSA: o manual não especifica o esquema de padding.
 * Usamos PKCS#1 v1.5 (comportamento por omissão de "RSA/ECB/PKCS1Padding" em
 * Java, a stack típica deste tipo de webservice da AT). Isto tem de ser
 * confirmado contra o ambiente de testes assim que existirem credenciais —
 * ver docs/at-arrendamento/CHECKLIST.md.
 */

import crypto from "node:crypto";

export interface WsSecurityFields {
  username: string;
  nonceBase64: string;
  passwordBase64: string;
  passwordDigestBase64: string;
  created: string;
}

function generateSymmetricKey(): Buffer {
  return crypto.randomBytes(16);
}

function aes128EcbEncrypt(key: Buffer, data: Buffer): Buffer {
  const cipher = crypto.createCipheriv("aes-128-ecb", key, null);
  // autoPadding (default true) = PKCS5/PKCS7 padding, exatamente o exigido.
  return Buffer.concat([cipher.update(data), cipher.final()]);
}

function rsaEncryptSymmetricKey(publicKeyPem: string, ks: Buffer): Buffer {
  return crypto.publicEncrypt(
    { key: publicKeyPem, padding: crypto.constants.RSA_PKCS1_PADDING },
    ks
  );
}

/**
 * Constrói os campos do WS-Security UsernameToken para um único pedido SOAP.
 * As credenciais só existem nesta função e no chamador imediato — nunca são
 * devolvidas ao cliente, persistidas ou registadas em log.
 */
export function buildWsSecurityFields(params: {
  username: string;
  password: string;
  authPublicKeyPem: string;
}): WsSecurityFields {
  const ks = generateSymmetricKey();
  const created = new Date().toISOString(); // UTC, ISO 8601 — ex: 2026-01-01T19:20:30.450Z

  const nonceBase64 = rsaEncryptSymmetricKey(params.authPublicKeyPem, ks).toString("base64");

  const passwordBase64 = aes128EcbEncrypt(
    ks,
    Buffer.from(params.password, "utf8")
  ).toString("base64");

  const digestInput = Buffer.concat([
    ks,
    Buffer.from(created, "utf8"),
    Buffer.from(params.password, "utf8"),
  ]);
  const sha1Digest = crypto.createHash("sha1").update(digestInput).digest();
  const passwordDigestBase64 = aes128EcbEncrypt(ks, sha1Digest).toString("base64");

  return { username: params.username, nonceBase64, passwordBase64, passwordDigestBase64, created };
}
