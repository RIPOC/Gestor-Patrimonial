# Gestor Patrimonial Online

Plataforma SaaS de **gestão de arrendamentos em Portugal** — imóveis, frações, proprietários, inquilinos, contratos, rendas, recibos AT, despesas e arquivo digital. Multi-tenant, com Row Level Security e documentos privados acedidos apenas por signed URLs.

## Stack

- **Next.js 15** (App Router) + **TypeScript** + **Tailwind CSS 4**
- **Supabase**: Auth, Postgres (RLS), Storage (buckets privados)
- Componentes UI próprios no estilo shadcn/ui (`components/ui`)
- Validação com **Zod**; lógica de negócio em `server/services`

## Setup

1. Criar um projeto em [supabase.com](https://supabase.com).
2. No **SQL Editor** do Supabase, executar por ordem:
   - `supabase/migrations/00001_initial_schema.sql`
   - `supabase/migrations/00002_storage.sql`

   (ou, com a CLI: `supabase db push`)
3. Copiar `.env.example` para `.env.local` e preencher:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```
4. Instalar e arrancar:
   ```
   npm install
   npm run dev
   ```
5. Abrir http://localhost:3000 → criar conta → criar organização → começar a usar.

> Sem `.env.local` configurado, a aplicação mostra a página `/setup` com estas instruções.

## Arquitetura

```
app/
  (auth)/login, (auth)/signup     autenticação (Supabase Auth)
  onboarding/                     criação da organização (multi-tenant)
  setup/                          instruções quando faltam credenciais
  (dashboard)/
    dashboard/                    KPIs: rendas do mês, atrasos, devolutos, ...
    owners/                       proprietários (CRUD)
    properties/                   imóveis + frações; detalhe com tabs
    tenants/                      inquilinos (CRUD)
    leases/                       contratos; ativo => gera rendas mensais
    rents/                        rendas geradas (listagem)
    documents/                    Arquivo Digital (upload, SHA-256, signed URLs)
    payments|receipts|expenses|
    maintenance|reports           placeholders das fases 3-7 (schema pronto)
components/
  ui/                             botões, inputs, tabelas, badges, cards...
  layout/                         sidebar, topbar, page-header
  forms/                          formulários por módulo
lib/
  supabase/                       clients (browser/server/middleware) + env
  validators/                     schemas Zod
  types.ts                        tipos de domínio + labels PT
server/
  services/                       org, rendas, documentos, at-connector
  actions/                        server actions (auth, CRUD, upload)
supabase/
  migrations/                     schema completo (28 tabelas, RLS, triggers)
```

### Segurança (multi-tenant)

- Todas as tabelas de negócio têm `organization_id` + **RLS ativo**.
- Funções `is_org_member()` / `can_edit_org()` centralizam as políticas.
- Inquilinos (via `tenants.user_id`) só leem os próprios contratos/rendas e documentos marcados `is_shared_with_tenant`.
- Bucket `documents` é **privado**; o 2.º segmento do path é o `organization_id` e as políticas do Storage validam-no. Download apenas por **signed URL** (5 min).
- Cada documento guarda **hash SHA-256** para controlo de integridade e campos preparados para OCR futuro.

### Regras de negócio implementadas

- Contrato **ativo** gera rendas mensais (idempotente, até 12 meses à frente) e marca o imóvel como *arrendado*.
- Terminar contrato: anula rendas futuras não cobradas e devolve o imóvel a *devoluto* se não houver outro contrato ativo.
- Renda com vencimento passado nasce *em atraso*; `outstanding_amount` é coluna calculada.
- Recibos AT: estrutura para modos **manual / assistido / integrado** — sem scraping, sem guardar senhas do Portal das Finanças (`server/services/at-connector-service.ts`, logs em `at_operation_logs`).

## Roadmap (fases)

| Fase | Âmbito | Estado |
|------|--------|--------|
| 1 | Fundação: auth, organizações, RLS, layout, dashboard | ✅ |
| 2 | Proprietários, imóveis, frações, inquilinos, contratos | ✅ |
| 3 | Pagamentos parciais, conta corrente, alertas de atraso | schema pronto |
| 4 | Arquivo digital (upload, hash, signed URLs, filtros) | ✅ base |
| 5 | Despesas + ocorrências/manutenção | schema pronto |
| 6 | Recibos AT assistidos | serviço preparado |
| 7 | Relatórios e mapa Anexo F | schema pronto |
| 8 | Portais inquilino/contabilista | políticas RLS prontas |
| 9 | Automatizações (cron, emails) | — |
| 10 | OCR, Open Banking, webservice AT | campos preparados |

## Deploy

- **Vercel**: importar o repositório, definir as variáveis `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Automatismos futuros: Vercel Cron ou Supabase Scheduled Functions.
