# Diário de Desenvolvimento — USAI 2.0

> Registro resumido do que foi construído, por quê, e **onde encontrar no código**. Serve de apoio para
> as orientações e para a prova de autoria (o professor pergunta sobre decisões e o código precisa ser
> localizado rapidamente).

---

## 2026-09-15 — Análise estática: SonarCloud

**O que foi feito:** configurado o SonarCloud (item obrigatório do "núcleo comum de engenharia" do
playbook) em modo **CI-based** (via GitHub Actions), não o "Automatic Analysis" padrão — o automático
não roda os testes, então não calcula cobertura real; o modo CI-based lê o `lcov.info` gerado pelo
próprio Jest/Vitest e mostra a cobertura de verdade no dashboard.

- `sonar-project.properties` (raiz) — `projectKey=gustavovieiira_TCC-USAI2.0`,
  `organization=gustavovieiira`, aponta `sonar.sources`/`sonar.tests` pros dois apps do monorepo e os
  `lcov.info` de backend e frontend.
- Job novo `sonarcloud` em `.github/workflows/ci.yml` — roda depois de `backend`/`frontend`
  (`needs: [backend, frontend]`), repete a execução dos testes (precisa gerar os `lcov.info` de novo
  nesse job, já que artefatos não são compartilhados entre jobs) e roda
  `SonarSource/sonarqube-scan-action@v4` com `SONAR_TOKEN` (secret do repo).
- `apps/frontend/vite.config.ts` — adicionado `lcov` aos `coverage.reporter` do Vitest (só tinha
  `text`/`html`; sem `lcov` o Sonar não lê a cobertura do frontend).
- Secret `SONAR_TOKEN` adicionado ao repositório via `gh secret set` (não fica no código).

**Onde ver:** [sonarcloud.io/project/overview?id=gustavovieiira_TCC-USAI2.0](https://sonarcloud.io/project/overview?id=gustavovieiira_TCC-USAI2.0).

---

## 2026-09-15 — M6: Admin USAI (condomínios, síndicos, financeiro)

**O que foi feito:** módulo novo no backend (`apps/backend/src/modules/admin/`) — a última peça de
gestão antes do Asaas. Fecha o gap deixado no M5 (não havia como criar um síndico).

- `admin.service.ts`: `criarCondominio`/`listarCondominios`/`atualizarCondominio` (cadastro da
  plataforma — nome, link de acesso, PIN, ativar/desativar), `criarSindico` (cria a conta de síndico de
  um condomínio — só o Admin pode, não existe autocadastro para esse papel; reaproveita
  `BCRYPT_ROUNDS`, agora exportado de `auth.service.ts`, pra manter o mesmo custo de hash em toda a
  aplicação), `resumoFinanceiro` (financeiro global: totais de solicitações de saque por status —
  `PENDENTE`/`APROVADO`/`REJEITADO`, quantidade e soma via `prisma.solicitacaoSaque.aggregate` — mais
  contagem de condomínios ativos).
- Rotas em `admin.routes.ts` → `/api/admin`: `POST/GET /condominios`, `PATCH /condominios/:id`,
  `POST /sindicos`, `GET /financeiro/resumo` — todas atrás de `requireRole('ADMIN')`.
- **Testes:** `tests/modules/admin/admin.service.test.ts` (mock do Prisma, inclusive o `aggregate`) e
  `tests/modules/admin/admin.routes.test.ts` (RBAC: morador e síndico recebem 403 nas rotas de admin).
  94 testes no total, todos passando. Cobertura geral do backend: ~71% (meta 75% na prova de autoria —
  segue precisando de atenção nos controllers, que continuam sem teste direto).
- **Validado manualmente** contra o MySQL real, fechando o ciclo inteiro: criei um segundo condomínio
  via admin, listei os dois, desativei o novo (confirmei `condominiosAtivos` cair de 2 pra 1 no resumo
  financeiro), criei a síndica "Carla" pro condomínio de teste — e confirmei que ela **loga
  normalmente** pelo `/api/auth/login` já existente, provando que a conta criada pelo admin é uma conta
  de verdade, não um caminho separado. Resumo financeiro bateu com os saques do M4 (1 aprovado R$40, 1
  rejeitado R$9999). Síndico tentando acessar rota de admin: 403.

**Onde mexer a seguir:** com auth, itens, locações, mensagens, saques, síndico e admin prontos, só
falta o **M3 (Asaas)** — combinado desde o início pra uma fase final — e o **frontend inteiro** além
das telas de auth. A partir daqui o backend cobre a maior parte do RFC; a prioridade muda pra fechar os
itens do núcleo comum de engenharia que ainda faltam (análise estática, deploy em nuvem) e pra
cobertura de testes, antes de migrar o esforço pro frontend.

---

## 2026-09-15 — M5: Painel do síndico

**O que foi feito:** módulo novo no backend (`apps/backend/src/modules/sindico/`) — visão e controle do
síndico sobre o próprio condomínio, seguindo o mesmo padrão dos demais módulos.

- `sindico.service.ts`: `listarMoradores` (moradores vinculados ao condomínio do síndico autenticado),
  `listarLocacoesAtivas` (locações que ainda ocupam algum item do condomínio — reaproveita
  `STATUS_QUE_OCUPAM_PERIODO`, exportado de `locacoes.service.ts`, como definição de "ativa", em vez de
  duplicar a lista de status), `buscarCondominio` e `atualizarPin` (síndico gerencia o PIN de acesso do
  condomínio, usado no cadastro de moradores — RN03 do módulo de auth).
- Rotas em `sindico.routes.ts` → `/api/sindico`: `GET /condominio`, `PATCH /condominio/pin`,
  `GET /moradores`, `GET /locacoes` — todas atrás de `authGuard` + `requireRole('SINDICO')` (segundo
  módulo do projeto com RBAC por papel, depois de saques).
- **Como um usuário vira síndico:** ainda não há endpoint de gestão pra isso — hoje só é possível criar
  via Prisma diretamente (`papel: 'SINDICO'` + `condominioId`). Isso deve virar parte do M6 (Admin USAI
  gerencia condomínios).
- **Testes:** `tests/modules/sindico/sindico.service.test.ts` (mock do Prisma) e
  `tests/modules/sindico/sindico.routes.test.ts` (RBAC: morador recebe 403 nas rotas de síndico). 79
  testes no total, todos passando. Cobertura geral do backend: ~70,7% (meta 75% na prova de autoria —
  os controllers continuam sendo o ponto fraco de cobertura, como já vinha acontecendo desde o M2).
- **Validado manualmente** contra o MySQL real: criei um síndico pro condomínio de teste, confirmei que
  ele vê os dois moradores cadastrados e a locação aprovada da Furadeira Bosch, testei a troca de PIN
  (`1234` → `5678`, confirmado na sequência) e confirmei que morador autenticado toma 403 tentando
  acessar qualquer rota de síndico.

**Onde mexer a seguir:** M6 (financeiro global + gestão de condomínios do Admin USAI, incluindo criar
síndicos). Depois disso só falta o M3 (Asaas), combinado para uma fase final, e o frontend inteiro
(além das telas de auth).

---

## 2026-09-15 — M4: Mensagens em tempo real + Solicitação de saque

**O que foi feito:** dois módulos novos no backend — chat da locação (com WebSocket) e solicitação de
saque para o Admin USAI avaliar. Decisão de escopo: seguir de backend antes do frontend (combinado com
o orientando), deixando a integração de pagamentos (Asaas/M3) para uma fase final.

- **Mensagens** (`apps/backend/src/modules/mensagens/`) — chat entre locatário e proprietário dentro de
  uma locação:
  - `mensagens.service.ts`: `verificarParticipante` garante que só o locatário ou o dono do item podem
    ver/enviar mensagens da locação (`ForbiddenError` caso contrário); `enviar`/`listarPorLocacao`
    persistem e listam o histórico em ordem cronológica.
  - Histórico via REST — `GET/POST /api/locacoes/:id/mensagens`, montado como sub-router de
    `locacoesRouter` (`mensagens.routes.ts` usa `Router({ mergeParams: true })` pra enxergar o `:id` da
    locação do router pai).
  - **Envio/recebimento ao vivo via WebSocket** (`apps/backend/src/realtime/socket.ts`, Socket.IO): o
    cliente autentica no handshake com o mesmo JWT do REST (`verifyAccessToken`, extraído do
    `authGuard.ts` pra ser reaproveitado fora do ciclo HTTP), entra na sala `locacao:<id>` (evento
    `locacao:entrar`, só se passar por `verificarParticipante`) e manda mensagens com
    `mensagem:enviar` — o servidor persiste via `MensagensService` e emite `mensagem:nova` pra todo
    mundo na sala. `server.ts` agora cria um `http.Server` explícito pra anexar o Socket.IO ao lado do
    Express.
- **Saques** (`apps/backend/src/modules/saques/`) — morador solicita, Admin USAI aprova/rejeita:
  - `saques.service.ts`: `solicitar` (morador informa valor + chave PIX, começa `PENDENTE`),
    `listarPorUsuario`, `listarTodas` (Admin, filtro por status), `aprovar`/`rejeitar` (só em
    solicitações `PENDENTE`, `rejeitar` exige `motivoRejeicao`). Toda aprovação/rejeição grava em
    `LogAuditoria` (rastreabilidade financeira, RN? do playbook de "Admin controla o financeiro").
  - Rotas em `saques.routes.ts` → `/api/saques`: `POST /` e `GET /minhas` (qualquer morador
    autenticado), `GET /`, `POST /:id/aprovar`, `POST /:id/rejeitar` atrás de `requireRole('ADMIN')`
    (primeiro uso desse guard no projeto — só existia definido, sem rota usando).
  - **Nota importante:** ainda não valida o valor solicitado contra o saldo real do usuário — isso
    depende do M3 (Asaas) popular `Pagamento` com locações efetivamente pagas. Por ora é só o registro
    da solicitação para avaliação manual do admin; a validação de saldo entra junto com o M3.
- **Testes:** `tests/modules/mensagens/mensagens.service.test.ts`,
  `tests/modules/saques/saques.service.test.ts`, `tests/modules/saques/saques.routes.test.ts` (RBAC:
  morador autenticado recebe 403 nas rotas de admin) e `tests/realtime/socket.test.ts` — sobe um
  `http.Server` efêmero com `MensagensService` mockado (sem precisar de banco real) e usa
  `socket.io-client` pra testar auth no handshake, entrar na sala, enviar e receber mensagem em tempo
  real, e o ack de erro quando quem envia não participa da locação. 66 testes no total, todos passando.
- **Validado manualmente** contra o MySQL real: cadastrei Ana (dona) e Bruno (locatário), publiquei
  item, Bruno solicitou e Ana aprovou a locação; testei mensagens via REST (enviar + listar histórico)
  e depois um script Node com `socket.io-client` conectando os dois como sockets diferentes — Bruno
  mandou mensagem e Ana recebeu `mensagem:nova` instantaneamente. Pra saques, criei um usuário `ADMIN`
  direto via Prisma (não existe cadastro público pra esse papel), confirmei que morador toma 403 em
  `GET /api/saques`, admin lista/aprova/rejeita normalmente, e confirmei que `LogAuditoria` grava as duas ações.

**Detalhe de ambiente (só nesta máquina):** a porta 3306 já está ocupada por um MySQL local (serviço do
Windows, não é Docker). Criei um `docker-compose.override.yml` (gitignorado, igual o `.env`) remapeando
`3307:3306` só para o serviço `mysql` — usa a sintaxe `ports: !override` do Compose Spec porque o merge
padrão *soma* as portas em vez de substituir. O `apps/backend/.env` local aponta
`DATABASE_URL` para `localhost:3307`. Em outra máquina sem esse conflito, não precisa do override.

**Onde mexer a seguir:** M5 (painel do síndico) e M6 (financeiro/condomínios do Admin) seguem o mesmo
padrão modular. Frontend continua pendente para tudo além de auth — entra depois que o backend estiver
fechado (combinado: deixar a UI, com design moderno, para depois de fechar o backend quase inteiro,
faltando só o M3/Asaas por último).

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
