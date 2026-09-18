# Diário de Desenvolvimento — USAI 2.0

> Registro resumido do que foi construído, por quê, e **onde encontrar no código**. Serve de apoio para
> as orientações e para a prova de autoria (o professor pergunta sobre decisões e o código precisa ser
> localizado rapidamente).

---

## 2026-09-18 — Editar perfil, síndico remove morador, notificação em tempo real nas conversas

**O que foi feito:** três pedidos do usuário depois de revisar o produto: dar pro morador uma forma de
editar nome/apartamento, dar pro síndico o poder de remover um morador quando precisar, e fazer chegar
uma notificação quando alguém manda mensagem numa conversa privada — hoje o morador só via mensagem
nova se estivesse com a tela da conversa aberta.

- **Editar perfil** (`apps/backend/src/modules/auth/`): novo `PATCH /api/auth/perfil` (`auth.routes.ts`,
  `auth.controller.ts`, `AuthService.atualizarPerfil` em `auth.service.ts`, schema Zod em
  `auth.schemas.ts`). No frontend, `PerfilPage.tsx` ganhou um modo de edição inline no card de
  identidade (nome + apartamento), e `authStorage.ts` ganhou `updateStoredUser()` pra sincronizar o
  `localStorage` sem precisar de novo login.
- **Síndico remove morador** (soft delete, seguindo o mesmo padrão já usado em `Item.ativo` e
  `Condominio.ativo`): campo novo `User.ativo` no `schema.prisma` (migration
  `20260918172339_adiciona_ativo_ao_usuario`). `AuthService.login`/`refresh` agora rejeitam conta
  desativada com 401 ("Esta conta foi desativada pelo síndico do condomínio"). Novo
  `DELETE /api/sindico/moradores/:id` (`SindicoService.removerMorador`) valida que o alvo é morador do
  mesmo condomínio antes de desativar — histórico (itens, locações, mensagens) fica intacto, só bloqueia
  login futuro e some de `listarMoradores`. `SindicoPage.tsx` ganhou botão "Remover" com confirmação
  (`window.confirm`, mesmo padrão já usado no Mural pra apagar post).
- **Notificação em tempo real nas conversas**: reaproveitei o socket já existente do chat
  (`lib/socket.ts`) em vez de criar polling — hook novo `useConversaNotifications.ts`, chamado uma vez
  no `AppShell.tsx` (não mais só dentro da página de conversa), então o socket fica vivo em toda a
  sessão autenticada. Mostra um badge vermelho no menu "Conversas" e um toast temporário (5s) com o
  nome de quem mandou, sem precisar estar com o chat aberto.
  - **Bug pego na hora do teste manual, não hipotético:** o design inicial só entrava na sala
    socket.io de cada conversa que já existia no momento em que o hook montava
    (`socket.emit('conversa:entrar', ...)` pra cada conversa de `listarMinhasConversas()`). Testei
    simulando um segundo morador abrindo uma conversa **nova** com alguém que já estava logado e
    navegando pelo site — a notificação não chegava, porque quem recebe nunca tinha entrado na sala
    daquela conversa (ela não existia ainda quando o hook rodou). Corrigido no backend
    (`apps/backend/src/realtime/socket.ts`): todo socket entra automaticamente numa sala pessoal
    (`usuario:<id>`) ao conectar, e o envio de mensagem privada agora transmite tanto pra sala da
    conversa quanto pra sala pessoal do destinatário (`ConversasService.buscarOutroParticipanteId`,
    novo). Sem isso, a primeira mensagem de uma conversa nova nunca notificava ninguém em tempo real —
    só depois de um F5. Testado com um script Node usando `socket.io-client` simulando o segundo
    usuário mandando mensagem sem nunca ter entrado na sala, e confirmado que o badge aparece mesmo
    assim.

**Bug de layout mobile pego no QA manual:** o botão "Editar" novo no card de identidade do
`PerfilPage.tsx` esqueceu o `fullWidth={false}` (o `Button.tsx` é `width: 100%` por padrão) — em
telas de 375px isso espremia a coluna de nome/e-mail (`min-w-0 flex-1`) até `width: 0`, sumindo com o
texto por completo (o card ficava só com avatar + badge + botão). Só apareceu testando em viewport
mobile de verdade, não no desktop. Corrigido adicionando `fullWidth={false}`, igual já era feito no
botão "Remover" do síndico e nos botões Salvar/Cancelar do próprio formulário de edição.

**Verificação:** `npm run build:backend`/`build:frontend`, ESLint (backend e frontend, zero warnings),
235 testes de backend (25 suítes, 98.78% de cobertura de statements) e 113 de frontend (20 suítes)
passando — inclui teste novo em `tests/realtime/socket.test.ts` cobrindo exatamente o cenário do bug
acima (destinatário recebe aviso mesmo sem ter entrado na sala). QA manual no navegador: cadastrei
3 moradores de teste novos, publiquei itens por 2 deles e confirmei no catálogo que aparecem
misturados (RF de isolamento por condomínio continua OK — item de outro condomínio não vazou). Editei
perfil e confirmei persistência direto no MySQL. Removi um morador de teste pelo painel do síndico e
confirmei que o login dele passou a ser rejeitado. Simulei uma conversa nova entre dois moradores só
por API/socket (sem UI) e confirmei o badge chegando ao vivo no outro morador, que estava no Mural, não
na tela de Conversas.

**Pendente:** trocar o logo pequeno do header (`AppShell.tsx`, hoje um quadrado `notch-sm` laranja) pela
logo de verdade que o usuário mandou colada no chat — não foi possível localizar o arquivo de imagem no
disco (procurado em `AppData\Local\Temp` e `Downloads`), preciso que ele reenvie como anexo de arquivo.

---

## 2026-09-17 — Identidade visual v2.0: "o mural da portaria, não o dashboard"

**O que foi feito:** com a meta de cobertura fechada e deploy/banco combinados de deixar pra depois
da orientação da semana que vem, o pedido direto foi outro: "está tudo muito simples... preciso que
você inove nesses layout, mude tudo". O visual anterior (paleta `slate`/`brand` genérica, cantos
todos arredondados, spinner circular) era o "SaaS corporativo padrão de IA" que o usuário queria
evitar. Em vez de eu mesmo desenhar, o processo foi: escrevi um briefing de design detalhado
(personalidade da marca, paleta, tipografia, motivo visual assinatura, estados vazios com
personalidade) pra colar no Claude Design, e implementei fielmente o sistema que veio de volta.

- **Conceito:** um mural físico de avisos de condomínio — acolhedor e confiável — em vez de um
  dashboard corporativo. Cores terracota/jade sobre papel, não azul/cinza de SaaS.
- **Tokens** (`apps/frontend/tailwind.config.ts`, reescrito): paleta nomeada por analogia física —
  `paper` (fundo/superfície), `ink` (texto), `barro` (primária, terracota), `jade` (secundária,
  sucesso), `mostarda` (aviso), `carmim` (erro), `roxo` (papel extra de avatar). Tipografia: Zilla
  Slab (`font-display`, títulos/preços), Public Sans (`font-sans`, corpo), Space Mono (`font-meta`,
  metadados/timestamps/labels em uppercase tracked) — trocadas no `index.html`.
- **Motivo visual assinatura — "canto recortado":** um plugin Tailwind próprio (`matchUtilities`)
  gera a utility `notch`, que corta o canto inferior direito a 45° via `clip-path`. Aplicado a
  quase tudo que "segura conteúdo": cards, botões, avatares, badges, inputs, fotos — é o que dá
  identidade ao produto em vez de mais um `rounded-xl` genérico.
- **Sem spinner circular no produto:** todo carregamento agora usa 3 pontos pulsando
  (`Spinner.tsx`, `animate-usaiPulse`), o mesmo estilo do indicador "digitando" que já existia no
  chat.
- **Avatares quadrados** (`components/ui/Avatar.tsx`, novo — extraído do `PostCard` porque passou a
  ser reusado em 4 lugares): iniciais em Zilla Slab, cor de fundo escolhida por hash do nome entre
  4 papéis de cor fixos (barro/jade/mostarda/roxo) — mesma pessoa sempre com a mesma cor.
  Card virou um "sanduíche de duas camadas" (`Card.tsx`): moldura fina em `paper-line` por baixo,
  conteúdo em `paper-surface` por cima, cada uma com seu próprio recorte — dá o efeito de moldura
  sem usar `border` (que não combina bem com `clip-path`).
  Reescrito nos ~35 arquivos: reescrevi ou fizeram parte da leva `tailwind.config.ts`, `index.css`,
  todo `components/ui/*`, e toda página/feature do frontend — Mural, Conversas, Catálogo, Locações,
  Saques, painéis do Síndico e do Admin, Auth/Landing. Estados vazios ganharam texto de primeira
  pessoa ("O mural tá em branco hoje" em vez de "Nenhum post ainda").

**Por que essas decisões:** o playbook não exige nada visual além de "usabilidade" — a decisão de
ir além do mínimo foi puramente do usuário, que queria um produto que parecesse pensado e não
gerado. Optar por um motivo geométrico único (o recorte) em vez de só trocar cores é o que separa
"reskin de paleta" de "sistema de design com identidade" — foi literalmente o pedido ("inove...
mude tudo"). A landing page também teve a lista de recursos ajustada: tirei a menção a "pagamento
integrado/PIX" (M3/Asaas ainda não existe) e coloquei "conversa privada" no lugar, que é recurso
real já no ar — evita prometer o que o produto ainda não entrega pra quem visita o link.

**Verificação:** `npm run build:frontend`, ESLint e os 104 testes de frontend (19 suítes) passando
— 2 testes precisaram de ajuste porque a cópia dos estados vazios mudou de propósito
(`MuralPage.test.tsx`, `CatalogoPage.test.tsx`). QA visual manual no navegador (desktop e mobile
375px), logado como morador, síndico e admin (promovido/revertido via Prisma direto pra checar os 3
painéis) — Mural, Conversas + chat, Catálogo + item + publicar, Locações, Saques, Síndico, Admin,
Login/Cadastro/Landing.

**Onde mexer a seguir:** deploy em nuvem, banco de produção e M3 (Asaas) seguem parados até a
orientação da semana que vem, como já combinado. Sistema de design documentado só no código por
ora — se sobrar tempo depois da orientação, vale um `docs/design-system.md` resumindo os tokens
pra não precisar reler o `tailwind.config.ts` pra lembrar os nomes.

---

## 2026-09-16 — Cobertura de testes: fechando a meta de 75% do backend

**O que foi feito:** com o núcleo de engenharia e o frontend completos, faltava só a única meta
numérica obrigatória do playbook (75% backend). A cobertura estava em ~72% porque os
`*.controller.ts` de praticamente todo módulo só eram exercitados indiretamente pelos
`*.service.test.ts` (que mockam o *service* inteiro, então nunca rodam o parsing do Zod, a leitura
de `req.auth` nem o `res.status().json()` do controller de verdade) e pelos `*.routes.test.ts` já
existentes (que só cobrem o caminho de rejeição do RBAC — `requireRole` — sem nunca chegar no corpo
do controller).

- **Abordagem:** um `<módulo>.controller.test.ts` por módulo, via `supertest` batendo na app real
  (`createApp()` de `@/app`) com JWTs assinados na hora, mas com `jest.mock('@/common/prisma', ...)`
  no topo do arquivo substituindo o banco por um objeto só com os métodos Prisma realmente usados
  naquele módulo (`jest.fn()`). Isso exercita o fluxo inteiro request → `authGuard` →
  Zod `.parse()` → controller → service (de verdade, não mockado) → `res.json()` → `errorHandler`,
  sem precisar de banco real nem duplicar a lógica que os testes de service já cobrem.
- **Módulos cobertos:** `auth`, `itens`, `locacoes`, `mensagens` (aninhado em
  `/locacoes/:id/mensagens`), `mural`, `conversas`, `saques`, `sindico`, `admin` — sucesso, erro de
  validação (400), não encontrado (404) e proibido (403) conforme o caso de cada módulo.
- **Resultado:** cobertura total do backend saiu de **~72% para ~98,7%** (statements), muito acima
  da meta de 75%. 213/213 testes passando (25 suítes) — eram 141 antes desta rodada.

**Onde mexer a seguir:** meta de cobertura do playbook fechada. Combinado com o usuário
(2026-09-16): deploy em nuvem e o banco em produção ficam pra depois da orientação da semana que
vem — por ora, seguir só com polimento de usabilidade/layout no frontend. M3 (Asaas) segue pra fase
final.

---

## 2026-09-16 — Conversas privadas a partir do Mural (chat efêmero, 7 dias)

**O que foi feito:** pedido direto de uso — "no mural tem que ter a opção de poder conversar com
uma pessoa, abrir um chat e deixar o chat lá por no máximo 7 dias". Além do comentário público, dá
pra abrir um chat 1:1 com o autor de um post **ou de um comentário**, direto do Mural.

- **Modelagem:** `ConversaPrivada` (dois participantes nomeados via `@relation` — mesmo padrão do
  `Locatario` em `Locacao` — mais `postOrigemId?` opcional referenciando o post que originou o
  chat) e `MensagemPrivada`. Migration `20260916143115_conversas_privadas_mural`.
- **Efêmero por design — no máximo 7 dias, apagado de vez (não só ocultado):** `expiraEm` é
  gravado na criação (`createdAt + 7 dias`) e **nunca atualizado**; toda operação do
  `ConversasService` chama `expirarAntigas(condominioId)` primeiro (`deleteMany` das conversas
  vencidas daquele condomínio — cascade apaga as mensagens junto). Como isso só limpa quando
  alguém mexe no recurso, `server.ts` também roda uma varredura global a cada hora
  (`setInterval` fora do `app.ts`, que precisa ficar sem efeitos colaterais pros testes com
  supertest) — garante a exclusão mesmo que ninguém mais volte a acessar.
- **Sem duplicar conversa:** `abrirOuContinuar` procura uma conversa ativa já existente entre os
  dois (nos dois sentidos) antes de criar uma nova — abrir o chat a partir de um post diferente
  com a mesma pessoa cai na mesma conversa.
- **Backend** (`apps/backend/src/modules/conversas/`) — `POST /api/conversas` (abre/continua,
  `usuarioId` + `postOrigemId?`), `GET /api/conversas` (minhas, com a última mensagem via
  `_count`-like `include` pra preview), `GET /api/conversas/:id`, `GET/POST
  /api/conversas/:id/mensagens`. Tempo real reaproveita o **mesmo servidor de WebSocket** do chat
  de locação (`realtime/socket.ts`) — salas `conversa:<id>` ao lado de `locacao:<id>`, eventos
  `conversa:entrar` / `conversa:mensagem:enviar` / `conversa:mensagem:nova`.
- **Frontend** — `ConversarButton` (componente compartilhado, variantes ícone/texto) aparece no
  `PostCard` (autor do post) e no `PostDetalhePage` (autor do post + autor de cada comentário),
  sempre exceto pra si mesmo. `MinhasConversasPage` (nova, nav "Conversas") lista as conversas
  ativas com prévia da última mensagem e `formatDiasRestantes` ("expira em N dias"; `lib/format.ts`).
  `ConversaPage` é o chat em si — mesmo padrão do `MensagensLocacaoPage` (histórico via REST,
  envio/recebimento ao vivo via socket), com um segundo par `createConversaSocket`/tipos em
  `lib/socket.ts`.
- **Buscar morador direto (sem precisar passar pelo Mural):** pedido de acompanhamento — às vezes
  não tem um post/comentário pra ancorar a conversa, só quer falar com alguém específico do
  condomínio. `GET /api/conversas/usuarios` (`conversas.service.ts#listarUsuariosDoCondominio`)
  lista todo mundo do condomínio (exceto quem busca); registrado **antes** de `/:id` no router
  pra não ser capturado como parâmetro. No `MinhasConversasPage`, um campo de busca filtra esse
  cache local por nome (mesmo padrão client-side do filtro de categoria no `CatalogoPage` — o
  condomínio é pequeno, não precisa de busca no servidor a cada tecla) e clicar num resultado
  chama `abrirOuContinuar` normalmente.
- **Testes:** backend — `conversas.service.test.ts` (abrir novo vs. reaproveitar conversa
  existente, resolução do "outro participante" nos dois sentidos, admin precisa informar
  `condominioId` explicitamente, bloqueio de conversa consigo mesmo, autorização por
  participante, listagem de usuários do condomínio) + extensão de `realtime/socket.test.ts` pros
  eventos `conversa:*` (entrar, negar quem não participa, broadcast de mensagem nova, erro no
  ack) + 401 em `rotas-protegidas.test.ts`. 141/141 testes de backend passando. Frontend —
  `ConversarButton`, `ConversaPage`, `MinhasConversasPage` (com busca) (novos) + casos
  adicionados em `MuralPage`/`PostDetalhePage` (mostrar/esconder "Conversar" conforme autoria).
  104/104 testes de frontend passando.
- **Validação manual:** Ana abre conversa a partir do aviso da Carla (síndica); Carla recebe,
  responde, e a mensagem chega em tempo real sem recarregar a página. Abrir "Conversar" de novo a
  partir de outro post com a mesma pessoa (dessa vez pelo comentário dela) reabre a **mesma**
  conversa, sem duplicar. Busca por "carla" e por "bru" no campo de busca do
  `MinhasConversasPage` retorna os moradores certos (inclusive duas contas de teste homônimas,
  "Bruno Locatario", corretamente listadas como pessoas distintas) e abrir uma nova conversa a
  partir do resultado funciona sem precisar de um post de origem. Testado em viewport mobile
  (375px).

**Onde mexer a seguir:** nada pendente aqui. Segue faltando só o M3 (Asaas), o deploy em nuvem, e
a UI do Admin USAI pra postar aviso no Mural escolhendo o condomínio.

**Status:** commit `f78248b` (Mural + conversas privadas) — CI verde em `main` (jobs `backend`,
`frontend` e `sonarcloud`, ver https://github.com/gustavovieiira/TCC-USAI2.0/actions/runs/35115435568)
e **quality gate do SonarCloud em `OK`**: `new_coverage` 87.1% (limite ≥ 80%), 0 problemas de
confiabilidade/segurança/manutenibilidade no código novo, duplicação 2.4% (limite < 3%), 100% dos
security hotspots revisados.

---

## 2026-09-16 — Mural: feed único do condomínio (estilo rede social)

**O que foi feito:** funcionalidade sugerida a partir do uso real do Dashboard — inicialmente um
mural simples de "pedidos de ajuda com resposta pública", mas o formato de lista de cards ficou
pouco natural pro caso de uso real (síndico avisando o condomínio, morador postando qualquer
coisa). Redesenhado num único momento pra um **feed estilo Twitter/X**: qualquer post (aviso ou
pedido) na mesma linha do tempo, com avatar, selo de papel, tempo relativo e comentários públicos.
Não faz parte do RFC original (sem numeração RF própria) — recurso adicionado por pedido direto de
uso, então a modelagem já nasceu no formato final (sem migration intermediária "errada" no
histórico).

- **Modelagem:** um único modelo `Post` (mapeado pra tabela `pedidos`, reaproveitando a primeira
  migration) com `tipo: PEDIDO|AVISO`, `conteudo` (texto livre, sem título separado — como um
  tweet), `categoria?`, `status: ABERTO|ATENDIDO` **opcional** (só preenchido quando `tipo=PEDIDO`;
  `null` pra avisos/posts livres), `autorId`, `condominioId`. `ComentarioPost` pros comentários
  públicos. Migration `20260916134147_mural_feed_unificado` (remove `titulo`, adiciona `tipo`,
  torna `status` opcional).
- **Quem pode postar o quê:** qualquer morador, síndico ou admin pode publicar um post de qualquer
  tipo — não é só o síndico que avisa, e não é só o morador que pede ajuda; o feed é livre, do jeito
  que uma rede social é. Admin USAI (que não pertence a um condomínio) precisa informar
  explicitamente pra qual condomínio o post é (`condominioId` no corpo da requisição) — sem UI
  própria ainda pro admin nessa primeira versão, só suporte no backend.
- **Moderação:** o autor pode excluir o próprio post; o síndico pode excluir **qualquer** post do
  próprio condomínio (`DELETE /api/mural/:id`) — pedido explícito do usuário ("o síndico tem opção
  de poder excluir caso precise").
- **Backend** (`apps/backend/src/modules/mural/`) — mesmo padrão em camadas dos outros módulos.
  `POST /api/mural`, `GET /api/mural` (com contagem de comentários via `_count`), `GET
  /api/mural/:id`, `POST /api/mural/:id/respostas`, `POST /api/mural/:id/atender` (só autor, só
  `tipo=PEDIDO`), `DELETE /api/mural/:id`.
- **Frontend** — `MuralPage` com um composer no estilo "o que está acontecendo?" (avatar + textarea
  + toggle Post/Preciso de ajuda + categoria opcional só quando é pedido) e o feed abaixo
  (`PostCard`, componente compartilhado com `PostDetalhePage`): avatar com inicial, nome, selo
  "Síndico"/"Admin USAI" quando aplicável (`PapelTag`), tempo relativo (`formatRelativeTime` — "agora"
  / "5m" / "3h" / "2d" / data completa a partir de uma semana), badge de status só pra pedidos,
  contador de comentários, e ícone de excluir só pra quem pode. Acessível também pro síndico
  (`RoleRoute allow={['MORADOR','SINDICO']}`), com item próprio na navegação.
- **Mural como home:** depois de ver a primeira versão rodando, o feedback foi direto — o Mural
  precisa ser a página principal, não mais um item de navegação qualquer. O antigo `DashboardPage`
  (cards de atalho tipo "Catálogo", "Publicar item" etc.) foi **removido** — ele só duplicava links
  que já existem na navegação (`AppShell`) e no `Mural`, então virou código morto assim que deixou
  de ser a home. Criado `homeRouteFor(papel)` em `lib/authStorage.ts`: resolve `/mural` pra
  morador/síndico e `/admin` pro Admin USAI (que ainda não tem acesso ao Mural — evita loop de
  redirecionamento no `RoleRoute`). Usado em três lugares: clique no logo "USAI" (`AppShell`),
  redirecionamento pós-login/cadastro (`LoginPage`, `CadastroPage`) e fallback do `RoleRoute`
  quando o papel não bate com a rota.
- **Testes:** backend — `mural.service.test.ts` (100% de cobertura: criar post/aviso, resolução de
  condomínio pro admin, listar com contagem de comentários, marcar atendido só pra pedido,
  exclusão por autor e por síndico, rejeição pra quem não é nem autor nem síndico) + caso de 401 em
  `rotas-protegidas.test.ts`. 119/119 testes de backend passando. Frontend — `MuralPage.test.tsx` e
  `PostDetalhePage.test.tsx` (14 testes: composer alternando tipo, exclusão por autor/síndico,
  ocultação de "marcar atendido"/"excluir" pra quem não tem permissão, comentários, estados de
  erro) + testes de `PapelTag`/`PostStatusBadge`, `formatRelativeTime` e `RoleRoute`/`homeRouteFor`
  atualizados pro novo destino. 82/82 testes de frontend passando (a suíte do `DashboardPage`,
  removida junto com a página).
- **Validação manual:** três contas (Ana, Bruno — moradores; Carla — síndica) do mesmo condomínio.
  Ana publica um aviso livre e um pedido com categoria; Carla acessa o Mural (rota liberada pro
  papel dela), publica um aviso oficial com o selo "Síndico" visível, comenta no pedido da Ana, e
  confirma que vê o ícone de excluir em **todos** os posts (moderação), enquanto o botão "Marcar
  como atendido" só aparece pro autor. Testado em viewport mobile (375px) — feed, composer e selo
  de papel renderizam corretamente empilhados.

**Onde mexer a seguir:** UI do Admin USAI pra postar aviso escolhendo o condomínio (hoje só
suportado no backend). Fora isso, falta só o M3 (Asaas) e o deploy em nuvem.

---

## 2026-09-16 — Upload de imagem de verdade (fim do gap de "só URL")

**O que foi feito:** publicar item aceitava só URL de imagem (link externo colado pelo usuário) —
trocado por upload de arquivo de verdade, armazenado em disco no backend via Multer.

- **Backend** (`apps/backend/src/modules/itens/upload.middleware.ts`,
  `common/uploads.ts`): `POST /api/itens/upload-imagem` (multipart, campo `imagem`) aceita só
  JPEG/PNG/WebP (rejeita explicitamente outros tipos, inclusive SVG — evita XSS armazenado via SVG
  com script embutido), limite de 5MB, nome de arquivo sempre gerado via `randomUUID()` (nunca o
  nome original, evita path traversal). Retorna a URL pública; `app.ts` serve `/uploads` como
  estático. `UPLOADS_DIR` é configurável via env (`UPLOADS_DIR`) pensando no dia do deploy — hoje é
  disco local, mas pode virar volume montado ou trocar de estratégia sem mexer no resto do código.
- **Frontend** (`PublicarItemPage.tsx`): campo de URL trocado por `<input type="file">` com
  pré-visualização (via `URL.createObjectURL`) e validação de tipo antes mesmo de enviar. No submit:
  se tem arquivo, faz upload primeiro (`uploadImagemItem`) pra pegar a URL, só depois cria o item com
  ela — dois passos, uma ação só pro usuário.
- **Testes:** backend — `tests/modules/itens/upload.test.ts`, integração real batendo em disco
  (não mock), limpa os arquivos criados no `afterAll`. Frontend — 3 testes novos em
  `PublicarItemPage.test.tsx` cobrindo upload+criação, rejeição de formato inválido e falha no
  upload. Precisou de polyfill de `URL.createObjectURL`/`revokeObjectURL` no `tests/setup.ts`
  (jsdom não implementa, mesma categoria do `scrollIntoView` já resolvido antes).
- **Achado durante o teste de validação manual, não nos automatizados:** criei um JPEG mínimo à mão
  (bytes escritos manualmente) só pra testar o upload via curl — o servidor armazenou e serviu o
  arquivo perfeitamente (bytes idênticos, headers corretos, `Content-Type: image/jpeg`), mas o
  Chromium se recusava a decodificá-lo (ícone de imagem quebrada). Troquei por um PNG 1x1 válido de
  verdade (fixture conhecida) e renderizou normalmente — ou seja, **o bug era do meu arquivo de teste
  handcrafted, não do pipeline de upload**. Fica de lição: pra testar upload de imagem manualmente,
  usar sempre um arquivo real, nunca um "JPEG mínimo" escrito à mão.

**Onde mexer a seguir:** nada pendente aqui. Segue faltando só o M3 (Asaas) e o deploy em nuvem.

---

## 2026-09-15 — Frontend: painéis de síndico e Admin USAI, saques

**O que foi feito:** as três últimas telas que faltavam no frontend, fechando o RFC quase inteiro
(falta só o Asaas). Navegação da `AppShell` e o `DashboardPage` agora são **baseados no papel** do
usuário (`MORADOR`/`SINDICO`/`ADMIN`) — cada um vê só o que faz sentido pro próprio papel, em vez de
um menu único genérico.

- **`RoleRoute`** (`components/RoleRoute.tsx`) — guarda de UX (não de segurança; o backend já aplica
  `requireRole`) que redireciona pro dashboard se o papel do usuário não bate com a rota. Evita o
  morador comum cair numa tela de admin e levar um 403 confuso.
- **`/saques`** (morador) — solicitar saque (valor + chave PIX) e ver o histórico próprio com status
  e motivo de rejeição.
- **`/sindico`** — dados do condomínio (link de acesso, PIN com edição inline), abas de moradores e
  locações ativas.
- **`/admin`** — 3 abas: **Financeiro** (cards de resumo + saques pendentes com aprovar/rejeitar,
  rejeitar exige motivo inline), **Condomínios** (cadastrar + ativar/desativar), **Síndicos** (criar
  conta, com select dos condomínios cadastrados).
- **Testes:** 57 testes no total (18 novos — `RoleRoute`, `SaquesPage`, `SindicoPage`, `AdminPage` com
  as 3 abas). Cobertura do frontend em **80%**.
- **Bug pego na validação manual, não nos testes automatizados:** depois de aprovar/rejeitar um saque
  no painel do Admin, os cards de resumo financeiro (quantidade/valor por status) não atualizavam —
  só a lista de pendentes. Corrigido: `onMudou` agora também rechama `resumoFinanceiro()` (best-effort;
  se falhar, só fica desatualizado até a próxima visita, não vira erro pro usuário). Os testes
  automatizados não pegaram isso porque mockavam `resumoFinanceiro` uma vez só — o valor mockado
  "por acidente" continuava consistente. Fica de lição: mockar retornos diferentes em chamadas
  sucessivas quando o comportamento depende de reconsulta.
- **Validado de ponta a ponta com 3 contas reais** (Bruno/morador, Carla/síndica, Admin USAI):
  Bruno solicitou saque pela UI → apareceu pendente no painel do Admin → Admin aprovou → cards e
  lista atualizaram corretamente. Admin criou um condomínio novo e uma síndica nova pra ele, cadastro
  íntegro (senha real, síndica loga normalmente). Síndica viu moradores e locações ativas do próprio
  condomínio e trocou o PIN.

**Onde mexer a seguir:** falta só o **M3 (Asaas)** — combinado desde o início pra fase final — e
depois o **deploy em nuvem**. Com essas telas, o frontend cobre auth, catálogo, locações, chat, saques,
síndico e admin.

---

## 2026-09-15 — Frontend: chat da locação em tempo real

**O que foi feito:** UI do chat que já existia no backend desde o M4 (WebSocket via Socket.IO). Nova
tela `MensagensLocacaoPage` em `/locacoes/:id/mensagens`, acessível pelo link "Mensagens" em cada
card de `MinhasLocacoesPage` (para os dois lados — locatário e proprietário).

- `lib/socket.ts` — cria o cliente Socket.IO tipado (`ServerToClientEvents`/`ClientToServerEvents`
  espelhando `apps/backend/src/realtime/socket.ts`), autenticando no handshake com o mesmo JWT do
  REST. A URL do socket é derivada de `VITE_API_URL` removendo o sufixo `/api` (o Socket.IO roda na
  raiz do servidor, não sob `/api`).
- `features/mensagens/` — `mensagens.api.ts` (histórico via REST,
  `GET /api/locacoes/:id/mensagens`) e tipos.
- `MensagensLocacaoPage.tsx`: carrega o histórico, conecta o socket, entra na sala da locação
  (`locacao:entrar`) e escuta `mensagem:nova` pra atualizar a lista ao vivo. Envio via
  `mensagem:enviar` (ack confirma sucesso/erro). Bolhas de mensagem alinhadas à direita (azul) quando
  o remetente é o usuário logado, à esquerda (cinza) caso contrário. Scroll automático pra última
  mensagem.
- **Testes:** mock da própria camada `lib/socket.ts` (não do pacote `socket.io-client` direto) com um
  socket falso que registra handlers e permite disparar eventos manualmente — mesmo padrão de mockar
  a própria API interna já usado nos outros testes do projeto. Cobre: histórico carregado, conexão
  bem-sucedida, erro quando o usuário não participa da locação, recebimento de mensagem em tempo
  real, envio pelo formulário, e desconexão ao desmontar. Precisou de um polyfill de
  `Element.prototype.scrollIntoView` no `tests/setup.ts` — o jsdom não implementa esse método.
- **Validado de verdade com duas sessões simultâneas** (Bruno e Ana, cada um logado numa aba): Ana
  mandou mensagem pela UI e ela apareceu **instantaneamente** na tela do Bruno, sem reload — o
  WebSocket funciona ponta a ponta com o front real. (Detalhe do teste: como as duas abas eram do
  mesmo navegador/origem, elas compartilham o mesmo `localStorage` — em algum momento o "quem sou eu"
  de uma tela ficou temporariamente confuso por causa disso, não por um bug de verdade; a lógica de
  "mensagem minha vs. do outro" já está coberta e correta nos testes automatizados, que isolam cada
  usuário sem esse artefato de dois logins na mesma origem.)

**Onde mexer a seguir:** faltam as telas de síndico, admin e saque. Depois disso, só Asaas e deploy.

---

## 2026-09-15 — Frontend: catálogo, publicar item, solicitar locação, minhas locações

**O que foi feito:** primeira leva de telas do frontend além de auth, cobrindo o fluxo completo de
catálogo e locação (RF06-RF14). Design baseado num protótipo feito no Claude Design (paleta azul
`#1c6ff5` — a mesma já usada no Tailwind desde o M0 —, tipografia Plus Jakarta Sans + JetBrains Mono
pros valores numéricos, cantos arredondados, sombras suaves).

- **Design system** (`tailwind.config.ts`, `index.html`, `index.css`): fontes via Google Fonts,
  `boxShadow.soft`/`soft-lg`. Paleta `brand` e neutros `slate` já existentes foram reaproveitados (o
  protótipo usa exatamente essas cores).
- **Componentes de UI novos** (`components/ui/`): `Badge` (pílula de status da locação, uma cor por
  status), `Card`, `Textarea`, `Select`, `EmptyState`, `Spinner`. `Button` ganhou variantes
  (`primary`/`secondary`/`danger`/`ghost`) e `fullWidth` opcional.
- **Layout responsivo** (`components/layout/AppShell.tsx`): nav superior (desktop) e barra de
  navegação inferior fixa (mobile) com os mesmos 3 destinos (Catálogo/Publicar/Locações) — pedido
  explícito de boa usabilidade em celular *e* notebook. Envolve as rotas autenticadas via
  `<Outlet/>` aninhado dentro de `ProtectedRoute` em `App.tsx`.
- **Telas:**
  - `CatalogoPage` — grid responsivo (2 colunas no mobile, até 4 no desktop), busca por texto e
    filtro por categoria (ambos client-side sobre a lista já carregada), estado vazio.
  - `PublicarItemPage` — formulário de criação de item (sem upload de arquivo ainda — usa URL de
    imagem opcional, já que não há storage de arquivos no backend).
  - `ItemDetalhePage` — mostra o item, calcula diárias/valor estimado em tempo real conforme as
    datas mudam, e **esconde o formulário de solicitar locação quando o usuário logado é o dono do
    item** (reflete a RN04 do backend na UI, evitando um 400 previsível).
  - `MinhasLocacoesPage` — abas "Como locatário"/"Recebidas"; a aba do proprietário mostra
    Aprovar/Rejeitar em locações `PENDENTE` e atualiza o card localmente após a ação, sem refetch.
- **Testes:** 29 testes (Vitest + Testing Library) cobrindo os componentes novos e as 4 páginas —
  incluindo o cálculo de dias/valor, a regra de dono não poder solicitar (RN04 refletida na UI), o
  fluxo de aprovar/rejeitar atualizando o card, e filtros do catálogo. Cobertura do frontend subiu de
  ~21% pra **~60%** (meta do playbook: 25%) — o escopo de cobertura do Vitest
  (`apps/frontend/vite.config.ts`) também foi ampliado pra incluir `src/pages/**` e `src/lib/**`, que
  antes ficavam de fora da métrica mesmo tendo lógica de negócio real.
- **Bug pego pelos testes antes de ir pro ar:** `formatDate` usava `Intl.DateTimeFormat` sem
  `timeZone: 'UTC'` — como `dataInicio`/`dataFim` são dias de calendário armazenados como meia-noite
  UTC, em qualquer fuso a oeste de UTC (ex.: horário de Brasília) a data exibida vinha um dia
  atrasada. Corrigido fixando `timeZone: 'UTC'` no formatter (`src/lib/format.ts`).
- **Validado manualmente contra o backend real**: logei como Bruno (locatário), solicitei uma
  locação da Furadeira Bosch pelo formulário (cálculo de "2 diárias · R$ 40,00" bateu), depois logei
  como Ana (proprietária), vi a solicitação pendente na aba "Recebidas" e apertei "Aprovar" — o card
  atualizou pra "Aprovada" na hora, sem reload. Testado em viewport desktop (1280px) e mobile
  (375px) — catálogo, publicar item e a barra de navegação inferior renderizam corretamente nos dois.

**Onde mexer a seguir:** falta UI pro chat da locação (mensagens em tempo real), pros painéis de
síndico e admin, e pro fluxo de saque. Upload de imagem de verdade (hoje é só URL) depende de decidir
onde guardar arquivo (S3/Cloudinary/disco do servidor) — ainda não decidido.

---

## 2026-09-15 — Observabilidade: dashboards do Grafana

**O que foi feito:** o Prometheus já coletava métricas reais desde o M0 (`GET /metrics`), mas o Grafana
estava rodando vazio — sem datasource nem dashboard configurados. Fechado via *provisioning* (arquivos
versionados, não clique manual na UI):

- `infra/grafana/provisioning/datasources/prometheus.yml` — datasource do Prometheus
  (`http://prometheus:9090`), criado automaticamente ao subir o container.
- `infra/grafana/provisioning/dashboards/dashboards.yml` — aponta pra pasta de dashboards.
- `infra/grafana/dashboards/usai-backend.json` — dashboard "USAI Backend — Visão Geral" com 7 painéis,
  todos baseados nas métricas que o backend já expõe (`http_request_duration_seconds` +
  `collectDefaultMetrics` do prom-client): requisições/s, erros 5xx/s, latência p95, requisições por
  rota, latência por percentil (p50/p95/p99), memória do processo, event loop lag.
- `docker-compose.yml` — monta os dois diretórios de provisioning no serviço `grafana`.

**Validado de verdade:** subi `prometheus` + `grafana` via Docker, gerei tráfego real contra o backend
(`/health`, `/api/itens`) e confirmei via API do Prometheus (`/api/v1/query`) e do Grafana
(`/api/search`, `/api/datasources`) que: o target `usai-backend` fica `up`, os contadores separam por
`route`/`status_code` (ex.: `/api/itens` com `401`, 30 requisições — confirma que o guard de auth é
contabilizado certo), o datasource e o dashboard aparecem provisionados automaticamente, sem precisar
criar nada na UI.

**Detalhe de ambiente:** pra esse teste, apontei temporariamente o `prometheus.yml` pra
`host.docker.internal:3000` (porque o backend estava rodando local via `npm run dev`, não como
container). O valor **commitado é `backend:3000`**, que é o correto quando o stack inteiro sobe junto
via `docker compose up -d` (cenário do deploy em produção). **Isso expõe uma lacuna real:** hoje o
fluxo de desenvolvimento local documentado (`docker compose up -d mysql` + `npm run dev` pros dois
apps) nunca conseguiria alimentar esse Prometheus, porque o alvo `backend:3000` só existe quando o
backend também roda como serviço Docker. Não corrigi isso agora — fica registrado como pendência: ou o
dev local troca pra rodar o backend também via Docker, ou o `prometheus.yml` precisa de um mecanismo
pra apontar pro host em dev (ex.: variável de ambiente/override local, do jeito que já fazemos com o
`docker-compose.override.yml` do MySQL).

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
