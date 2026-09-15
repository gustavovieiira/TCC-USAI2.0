# Diário de Desenvolvimento — USAI 2.0

> Registro resumido do que foi construído, por quê, e **onde encontrar no código**. Serve de apoio para
> as orientações e para a prova de autoria (o professor pergunta sobre decisões e o código precisa ser
> localizado rapidamente).

---

## 2026-09-15 — Correção: CI quebrando no teste de refresh token

**O que aconteceu:** o primeiro push para `main` quebrou o pipeline do GitHub Actions (só nele — local
passava). O teste de `AuthService.refresh` em
`apps/backend/tests/modules/auth/auth.service.test.ts` assinava o refresh token de teste com o valor
literal `'dev-refresh-secret'` — que é o *fallback* hardcoded dentro de
`apps/backend/src/modules/auth/auth.service.ts` (`getSecrets()`), usado só quando a variável de ambiente
não existe. Local não tinha `JWT_REFRESH_SECRET` setada (então caía no fallback e o teste passava por
coincidência); o `ci.yml` define `JWT_REFRESH_SECRET: ci-refresh-secret` para o job inteiro, então em CI
o serviço assinava/validava com outro segredo e o teste falhava.

**Correção:** o teste agora fixa `process.env.JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` para um valor
conhecido num `beforeAll`, em vez de depender do que estiver (ou não) definido no ambiente que roda o
teste. Deixa de existir dependência implícita do fallback interno do serviço.

**Lição para a prova de autoria:** nunca deixar um teste passar "por acidente" dependendo de uma
variável de ambiente não controlada — sempre fixar o estado que o teste precisa.

**Status:** CI verde em `main` e `develop` — https://github.com/gustavovieiira/TCC-USAI2.0/actions

---

## 2026-09-14 — M0: Fundação do projeto

**O que foi feito:**

- Repositório: [github.com/gustavovieiira/TCC-USAI2.0](https://github.com/gustavovieiira/TCC-USAI2.0) (público).
- Monorepo com npm workspaces: `apps/backend` (API) e `apps/frontend` (SPA).
- Configuração de qualidade na raiz: ESLint + Prettier + Husky (lint-staged no pre-commit).
- **Backend** (Node.js + Express + TypeScript + Prisma + MySQL):
  - Schema do banco (`apps/backend/prisma/schema.prisma`) com os modelos do RFC: `Condominio`, `User`,
    `Item`, `ItemImagem`, `Locacao`, `Pagamento`, `Mensagem`, `SolicitacaoSaque`, `LogAuditoria`.
  - Camada `common/` (`apps/backend/src/common/`): cliente Prisma singleton (`prisma.ts`), logger
    estruturado com Winston (`logger.ts`), erros de domínio tipados (`errors.ts`:
    `AppError/NotFoundError/UnauthorizedError/ForbiddenError/ConflictError`), middleware global de erro
    (`errorHandler.ts`), guarda de autenticação JWT + RBAC (`authGuard.ts`), wrapper para rotas async
    (`asyncHandler.ts`).
  - Métricas Prometheus (`apps/backend/src/metrics/`): registry (`registry.ts`) e middleware que mede
    duração de cada requisição HTTP (`metricsMiddleware.ts`), expostas em `GET /metrics`.
  - App Express (`apps/backend/src/app.ts`) monta `/health`, `/metrics` e `/api/auth`.
  - **Módulo de autenticação** (`apps/backend/src/modules/auth/`) — implementa RF01, RF02, RF03 e RN03
    do RFC:
    - `auth.service.ts` — `AuthService` com `cadastrarMorador` (valida link+PIN do condomínio, impede
      e-mail duplicado, faz hash da senha com bcrypt, emite JWT), `login` (valida credenciais) e
      `refresh` (renova access token a partir do refresh token).
    - `auth.schemas.ts` — validação de entrada com Zod.
    - `auth.controller.ts` / `auth.routes.ts` — expõe `POST /api/auth/cadastro`, `/login`, `/refresh`.
  - **Testes (TDD)** em `apps/backend/tests/`:
    - `modules/auth/auth.service.test.ts` — cobre cadastro (sucesso, condomínio inexistente/inativo,
      PIN errado, e-mail duplicado, senha sempre em hash), login (sucesso, e-mail inexistente, senha
      errada) e refresh (token válido/ inválido). Usa um mock manual do Prisma (sem banco real).
    - `app/health.test.ts` — testa `/health` e `/metrics` com Supertest.
  - `Dockerfile` multi-stage do backend em `apps/backend/Dockerfile`.
- **Frontend**: scaffold inicial via Vite (`apps/frontend`), template React + TypeScript. Tailwind e
  estrutura de `features/` ainda **pendentes** (próximo passo).

**Por que essas decisões:**

- Regras de negócio ficam em `services/` (não no controller) propositalmente — é o que o playbook do
  professor chama de "arquitetura modular" e é o que permite testar a lógica sem precisar de HTTP nem
  banco real (mock do Prisma nos testes).
- `errors.ts` com classes de erro tipadas em vez de `throw new Error(string)` — o `errorHandler.ts`
  central sabe transformar cada uma no status HTTP certo, sem `try/catch` repetido em cada controller.
- Prometheus/Grafana e não um APM pago — é item obrigatório do playbook ("observabilidade") e roda de
  graça em Docker junto com o resto.

**Onde mexer a seguir:** `apps/frontend/src` (Tailwind + páginas de cadastro/login), depois
`docker-compose.yml` na raiz para subir tudo junto (mysql + backend + frontend).

---

<!-- Novas entradas sempre no topo, com data. -->
