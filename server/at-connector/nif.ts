/**
 * Validação de NIF português (pessoa singular/coletiva) — dígito de controlo
 * módulo 11, conforme algoritmo público do Ministério das Finanças.
 */
export function isValidNif(nif: string | null | undefined): boolean {
  if (!nif) return false;
  const digits = nif.trim();
  if (!/^\d{9}$/.test(digits)) return false;

  const firstDigit = Number(digits[0]);
  // Primeiro dígito válido para NIF/NIPC português
  if (![1, 2, 3, 5, 6, 7, 8, 9].includes(firstDigit)) return false;

  let sum = 0;
  for (let i = 0; i < 8; i++) {
    sum += Number(digits[i]) * (9 - i);
  }
  const remainder = sum % 11;
  const checkDigit = remainder < 2 ? 0 : 11 - remainder;

  return checkDigit === Number(digits[8]);
}

export function assertValidNif(nif: string | null | undefined, field: string): string | null {
  if (!isValidNif(nif)) {
    return `${field}: NIF inválido`;
  }
  return null;
}
