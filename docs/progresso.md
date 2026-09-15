# Diário de Desenvolvimento — USAI 2.0

> Registro resumido do que foi construído, por quê, e **onde encontrar no código**. Serve de apoio para
> as orientações e para a prova de autoria (o professor pergunta sobre decisões e o código precisa ser
> localizado rapidamente).

---

## 2026-09-15 — M2 (continuação): interface de Catálogo e Locações

**O que foi feito:** frontend completo para o que o backend do M2 já expunha — antes só dava pra testar
via curl.

- `apps/frontend/src/components/AppShell.tsx`: layout compartilhado (header com nav + logout) usado por
  todas as páginas autenticadas, pra não repetir esse header em cada página (`DashboardPage` foi
  refeito pra usar esse shell).
- **Catálogo** (`apps/frontend/src/pages/CatalogoPage.tsx` +
  `apps/frontend/src/features/itens/ItemCard.tsx`): grade de itens do condomínio, filtro por categoria,
  badge "Seu item" quando `item.ownerId === usuário logado` (RF09). Cada card não-próprio tem o botão
  "Solicitar locação" que expande o `SolicitarLocacaoForm` inline.
- **Anunciar item** (`apps/frontend/src/pages/AnunciarPage.tsx` +
  `apps/frontend/src/features/itens/PublicarItemForm.tsx`): formulário de publicação (RF06).
- **Solicitar locação** (`apps/frontend/src/features/locacoes/SolicitarLocacaoForm.tsx`): calcula
  dias × valor diário **no cliente**, em tempo real, conforme a pessoa escolhe as datas — antes de
  confirmar. O valor final de verdade continua sendo calculado no backend (RF11); esse cálculo no
  frontend é só para dar feedback imediato.
- **Acompanhamento** (`apps/frontend/src/pages/AcompanhamentoPage.tsx`): duas colunas — "recebidas"
  (itens meus que pediram pra alugar, com botões Aprovar/Rejeitar quando `PENDENTE`) e "minhas
  solicitações" (o que eu pedi). Usa `StatusBadge` (`features/locacoes/StatusBadge.tsx`) pra colorir
  cada status da máquina de estados.

**Bug encontrado e corrigido na validação manual:** as datas apareciam um dia a menos no
Acompanhamento (ex.: pedi 05/11–08/11 e aparecia 04/11–07/11). Causa: `new Date(iso).toLocaleDateString()`
converte pro fuso horário local do navegador antes de formatar — como a data é armazenada como
meia-noite UTC, em fusos atrás de UTC (ex.: Brasil, UTC-3) isso empurra pro dia anterior. Corrigido em
`apps/frontend/src/lib/formatters.ts` (`formatarDataISO`), que lê o `YYYY-MM-DD` direto da string ISO
sem instanciar `Date`. Tem teste de regressão em `formatters.test.ts` — é exatamente o tipo de bug que
não aparece rodando `npm test` de manhã e some sozinho: só aparece testando de verdade no navegador.

**Validado manualmente no navegador** (não só curl): login como proprietária (Ana), publiquei um item
pela UI, troquei pra locatário (Carlos) noutra sessão, vi os dois itens da Ana no catálogo sem a badge
"Seu item", solicitei a locação da escada (cálculo de R$30 apareceu certo antes de confirmar), voltei
como Ana, vi a solicitação pendente em "recebidas", aprovei, e o status virou "Aprovada" na hora sem
precisar recarregar a página.

**Onde mexer a seguir:** M3 (Asaas) — o botão de aprovar hoje só muda o status pra `APROVADA`; quando
o pagamento entrar, a tela de Acompanhamento vai precisar mostrar o link de checkout depois da aprovação.

---

## 2026-09-15 — M2: Catálogo de itens e Locações

**O que foi feito:** dois módulos novos no backend, seguindo o mesmo padrão do módulo de auth
(`common/errors` + service testável isoladamente + controller fino + rotas protegidas por `authGuard`).

- **Catálogo de itens** (`apps/backend/src/modules/itens/`) — RF06-RF09:
  - `itens.service.ts`: `criar` (publica item + imagens vinculado ao condomínio do morador logado),
    `listarPorCondominio` (catálogo filtrado por categoria, só itens `ativo=true` — RN02 garante escopo
    por condomínio), `atualizar`/`remover` (só o dono edita/remove — `remover` é *soft delete*,
    `ativo=false`, para não quebrar o histórico de locações que referenciam o item).
  - Rotas em `itens.routes.ts`, montadas em `/api/itens`.
- **Locações** (`apps/backend/src/modules/locacoes/`) — RF10-RF14, RN04:
  - `locacoes.service.ts`: `solicitar` calcula `valorTotal` automaticamente
    (`valorDiaria × dias`, RF11), bloqueia locar o próprio item (RN04) e bloqueia sobreposição de datas
    contra locações que já ocupam o período (status `PENDENTE/APROVADA/PAGA/EM_ANDAMENTO`).
    `aprovar`/`rejeitar` só podem ser chamados pelo dono do item (`ForbiddenError` caso contrário) e só
    se a locação ainda estiver `PENDENTE`. `listarComoLocatario`/`listarComoProprietario` dão as duas
    visões do RF14.
  - Rotas em `locacoes.routes.ts` → `/api/locacoes` (`POST /`, `GET /minhas`, `GET /recebidas`,
    `POST /:id/aprovar`, `POST /:id/rejeitar`).
  - **Nota:** a máquina de estados completa é `PENDENTE → APROVADA → PAGA → EM_ANDAMENTO → CONCLUÍDA`;
    por enquanto só implementamos até `APROVADA` porque `PAGA` depende do webhook do Asaas (M3, ainda não
    feito). Quando o M3 entrar, o service de pagamentos vai ser quem dispara `APROVADA → PAGA`.
- **Testes:** `tests/modules/itens/itens.service.test.ts` e
  `tests/modules/locacoes/locacoes.service.test.ts` (mock do Prisma, cobrem sucesso e cada regra de
  negócio/erro). Também `tests/app/rotas-protegidas.test.ts` confirmando que toda rota de item/locação
  exige token válido (RNF08). 38 testes no total, todos passando.
- **Validado manualmente** com curl contra o MySQL real: cadastrei dois moradores (proprietária e
  locatário), publiquei um item, solicitei a locação (valor calculado certo: 2 dias × R$20 = R$40),
  confirmei que a proprietária não consegue locar o próprio item (400), que o locatário não consegue
  aprovar a própria solicitação (403), e que a proprietária aprova normalmente (200, status vira
  `APROVADA`).

**Onde mexer a seguir:** M3 (Asaas) vai criar `apps/backend/src/modules/pagamentos/` e
`apps/backend/src/modules/financeiro/`, e vai ligar no `locacoes.service.ts` pra mover
`APROVADA → PAGA` quando o webhook confirmar o pagamento. O frontend ainda não tem as telas de
catálogo/publicar item/solicitar locação — só auth (login/cadastro/dashboard) está com UI pronta.

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

## 2026-09-15 — Validação manual ponta a ponta (para mostrar amanhã)

Subi o ambiente local de verdade (não só os testes automatizados) pra confirmar que o fluxo funciona:

1. `docker compose up -d mysql` — sobe só o banco (ver `docker-compose.yml` na raiz).
2. `npx prisma migrate dev --name init` dentro de `apps/backend` — cria as tabelas
   (`apps/backend/prisma/migrations/20260915021734_init/`).
3. `npm run prisma:seed --workspace=apps/backend` — roda `apps/backend/prisma/seed.ts`, que cria um
   condomínio de teste (`residencial-jardim-europa`, PIN `1234`) via `prisma.condominio.upsert`.
4. Backend (`npm run dev --workspace=apps/backend`) e frontend (`npm run dev --workspace=apps/frontend`)
   rodando localmente.
5. No navegador: acessei `/cadastro?condominio=residencial-jardim-europa`, preenchi o formulário
   (`apps/frontend/src/features/auth/cadastro/CadastroForm.tsx`), fui redirecionado pro dashboard já
   autenticado. Fiz logout, entrei de novo pela tela de login
   (`apps/frontend/src/features/auth/login/LoginForm.tsx`) com o mesmo e-mail/senha — funcionou.

**Resultado:** RF01, RF02, RF03 e RN03 confirmados funcionando de ponta a ponta contra um MySQL real,
não só nos testes com mock.

**Detalhe de ambiente importante (só nesta máquina):** as portas padrão 3000 e 5173 já estão ocupadas
por outro projeto (`versalengenharia-*`) rodando em Docker nesta máquina. Por isso o `apps/backend/.env`
local usa `PORT=3010` e `apps/frontend/.env` usa `VITE_API_URL=http://localhost:3010/api` — isso é só
configuração local (`.env` é gitignorado), o `.env.example` de cada app continua com os valores padrão
(3000/5173) que valem para qualquer outra máquina, incluindo a VPS de produção.

**Para rodar de novo amanhã antes da orientação:**

```bash
docker compose up -d mysql
cd apps/backend && npm run dev
# em outro terminal:
cd apps/frontend && npm run dev
```

Se o Docker Desktop não estiver aberto, abra-o primeiro (o `docker compose up` falha silenciosamente
sem o daemon rodando).

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
