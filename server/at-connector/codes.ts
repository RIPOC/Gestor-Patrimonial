/** Catálogo de códigos de resposta do webservice AT (manual, secção 4.2). */
export const AT_AUTH_ERROR_MESSAGES: Record<number, string> = {
  1: "Utilizador não preenchido",
  2: "Tamanho do utilizador incorreto",
  3: "NIF inválido",
  4: "Utilizador com formato inválido",
  5: "Subutilizador com formato inválido",
  6: "Senha não preenchida",
  7: "Codificação Base64 inválida",
  8: "Cifra da chave pública inválida",
  9: "Formato do campo Created inválido",
  10: "Validade da credencial expirada",
  11: "Chave simétrica inválida",
  12: "Chave simétrica repetida",
  13: "Estrutura da senha inválida",
  16: "Não foi possível decifrar o campo Created",
  17: "Não foi possível decifrar o campo Password",
  18: "Não foi possível decifrar o campo Digest",
  19: "Data de criação do pedido não preenchida",
  20: "Chave do pedido não preenchida",
  33: "Pedido SOAP inválido",
  99: "Erro na validação da senha (senha errada, acesso suspenso, etc.)",
};

export const AT_SERVICE_ERROR_MESSAGES: Record<number, string> = {
  [-1]: "Existem erros ou alertas nos dados enviados",
  [-99]: "Erro interno do webservice da AT",
};

/** Mensagem amigável para o código devolvido pela AT (0 = sucesso). */
export function describeATResponseCode(codigo: number): string {
  if (codigo === 0) return "Sucesso";
  return (
    AT_AUTH_ERROR_MESSAGES[codigo] ??
    AT_SERVICE_ERROR_MESSAGES[codigo] ??
    `Código de resposta desconhecido (${codigo})`
  );
}

/** Indica se o código corresponde a um erro de autenticação (Header), não de dados (Body). */
export function isAuthErrorCode(codigo: number): boolean {
  return codigo in AT_AUTH_ERROR_MESSAGES;
}
