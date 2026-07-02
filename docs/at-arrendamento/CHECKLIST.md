# Checklist de adesão à integração AT — Arrendamento

Módulo: `server/at-connector/` (protocolo isolado) + `server/services/at-integration-service.ts` (orquestração).
Documentos de referência nesta pasta: `Comunicacao_contratos_arrendamento_emissao_recibo_renda.pdf` (manual oficial) e `arrendamento6.wsdl`.

## Estado atual (Sprint 1)

- [x] DTOs TypeScript fiéis ao WSDL (`types.ts`) — incluindo as duas divergências reais entre WSDL e manual encontradas na leitura (ver comentário no topo de `types.ts`).
- [x] Validações prévias (NIF, datas, campos obrigatórios) — `validators.ts`, `nif.ts`.
- [x] Criptografia WS-Security (Nonce/Password/Digest AES+RSA+SHA1) — `crypto.ts`.
- [x] Construção do envelope SOAP e *parsing* das 3 respostas — `soap-xml.ts` (xmlbuilder2 + fast-xml-parser, sem concatenação manual de XML).
- [x] Redação de logs (nunca senha/nonce/digest/header completo) — `redact.ts`.
- [x] Migrations Supabase (`at_integrations`, `at_contract_submissions`, `at_receipt_submissions`, colunas AT em `properties`/`owners`/`owner_properties`/`lease_tenants`/`leases`/`receipts`) + RLS.
- [x] Modo mock local (`AT_ENV=mock`, omisso) — todas as 3 operações funcionam sem qualquer chamada de rede.
- [x] Bloqueio de duplicados: índice único parcial `at_receipt_submissions_one_active_per_rent`.
- [x] UI: estado da integração (`/settings/at-integration`), "Comunicar contrato" no contrato, "Emitir recibo AT" na renda, "Obter PDF via AT" no recibo — todas atrás de um modal que pede as credenciais no momento e nunca as guarda.

## Por fazer antes de testar contra a AT (Sprint 2)

- [ ] **Enviar o email de adesão** (modelo abaixo) para `asi-cd@at.gov.pt`.
- [ ] Guardar a **chave pública do Sistema de Autenticação** recebida em `AT_AUTH_PUBLIC_KEY_PEM` (PEM).
- [ ] Gerar o CSR (RSA 2048 bits, sem acentos/caracteres especiais):
  ```
  openssl req -new -subj "/C=PT/ST=<distrito>/L=<localidade>/O=<empresa>/OU=Informatica/CN=<NIF>/emailAddress=<email>" -newkey rsa:2048 -nodes -out <NIF>.csr -keyout <NIF>.key
  ```
- [ ] Submeter o CSR à AT e aguardar o certificado assinado (`<NIF>.crt`).
- [ ] Empacotar em PFX:
  ```
  openssl pkcs12 -export -in <NIF>.crt -inkey <NIF>.key -out <NIF>.pfx
  ```
- [ ] Codificar o PFX em Base64 e definir `AT_CLIENT_CERT_PFX_BASE64` + `AT_CLIENT_CERT_PFX_PASSWORD` (nunca commitar; usar secret manager do Vercel/Supabase).
- [ ] Definir `AT_ENV=test` e confirmar `AT_TEST_ENDPOINT`.
- [ ] **Confirmar o padding RSA do Nonce contra o ambiente de testes** — o manual não especifica explicitamente; o código assume PKCS#1 v1.5 (`crypto.ts`). Se a AT rejeitar com código 8 ("Cifra da chave pública inválida"), este é o primeiro ponto a rever.
- [ ] Testar `registarDadosContrato` com um contrato de baixo risco.
- [ ] Testar `emitirRecibo`.
- [ ] Testar `obterRecibo` e confirmar que o PDF chega corretamente ao arquivo digital.
- [ ] Registar utilizador/senha de teste (ex.: `555555555 + SENHA`) fornecidos pela AT.

## Antes de produção (Sprint 3 / Fase 7 do manual)

- [ ] Aderir formalmente ao serviço em *Site e-fatura → Produtores de Software → Aderir ao Serviço* (aceitar termos e condições).
- [ ] Obter o certificado de **produção** assinado pela AT.
- [ ] Mudar `AT_ENV=production`, `AT_PROD_ENDPOINT`, novo PFX.
- [ ] Validar manualmente no Portal das Finanças que um contrato/recibo de teste em produção aparece corretamente.
- [ ] Confirmar alerta de expiração do certificado (validade: 12 meses) — `at_integrations.certificate_expires_at`.
- [ ] Plano de rollback: os modos manual/assistido continuam sempre disponíveis, independentemente do estado da integração.

## Modelo de email (adaptar `<NIF>`, `<NOME>`)

```
TO: asi-cd@at.gov.pt
Subject: Obtenção do certificado SSL para testes e chave pública do sistema de Autenticação - NIF <NIF>

Exmos. Senhores,

O Produtor de Software <NOME> (NIF <NIF>) vem por este meio solicitar o envio dos
seguintes elementos para desenvolvimento e testes da comunicação de contratos e
emissão de recibos via Webservice:

  - Chave pública do Sistema de Autenticação do Portal das Finanças;
  - Certificado SSL para comunicação com o endereço de testes de Webservices.

Estes elementos serão utilizados por este produtor de software para incluir no
seguinte programa:

  Designação Software: Gestor Patrimonial Online
  Certificado AT/DGCI: <se aplicável>

Aguardamos a vossa resposta.

Com os melhores cumprimentos,
<NOME>
<NIF>
<CONTACTO>
<EMAIL>
```

## Notas de segurança (nunca esquecer)

- A senha do Portal das Finanças **nunca** é guardada — só existe em memória durante a chamada (`server/actions/at-integration.ts`), lida diretamente do `FormData` do modal de credenciais.
- Nunca commitar `AT_CLIENT_CERT_PFX_BASE64`, `AT_CLIENT_CERT_PFX_PASSWORD` nem `AT_AUTH_PUBLIC_KEY_PEM` — só em variáveis de ambiente do servidor.
- `redactSoapEnvelope()` remove sempre o `S:Header` antes de qualquer XML ir para `at_contract_submissions`/`at_receipt_submissions`.
- Nunca chamar `server/at-connector/*` a partir de código de cliente — é um módulo server-only.
