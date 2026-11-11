# Diário de Desenvolvimento: USAI 2.0

> Registro resumido do que foi construído, por quê, e **onde encontrar no código**. Serve de apoio para
> as orientações e para a prova de autoria (o professor pergunta sobre decisões e o código precisa ser
> localizado rapidamente).

---

## 2026-11-11: Correção de dois defeitos achados na revisão cruzada (issues #25 e #26)

O colega Guilherme (Guirenzo) testou a USAI no site público e abriu duas issues, as duas reproduzidas e corrigidas aqui:
- **#25, simulador de planos:** com "Anual" selecionado, a recomendação ainda dizia "a partir de R$ 299,00/mês" (o valor mensal cheio) enquanto
  o cartão mostrava R$ 239,17/mês. Agora a recomendação usa o preço do período escolhido (`precoDe` em `PlanosPrecos.tsx`).
- **#26, cadastro de morador:** colar o link completo do síndico no campo do código usava a URL inteira como código do condomínio. Agora
  `extrairCodigoDoCondominio` (`features/auth/cadastro/codigoDoCondominio.ts`) tira o código do link, recusa o que não é código nem link com aviso
  no próprio campo (antes de pedir PIN e dados), e a tela do formulário ganhou "Trocar o código".
- **Testes:** um de regressão para cada issue (`assinaturas.test.tsx`, `CadastroPage.test.tsx`) e os do extrator de código.

---

## 2026-11-10: Grafana completo e explicativo, com a infraestrutura do servidor

O Grafana tinha um painel só (7 gráficos, sem explicação, só o backend). Agora são **4 painéis em português** (`infra/grafana/dashboards/`),
todos com um texto de ajuda no topo e uma descrição em cada gráfico (o que mede, o que é normal, o que fazer), cores de alerta (verde,
amarelo, vermelho) e um menu para pular entre eles. O Grafana abre direto na Visão geral.
- **Visão geral:** está no ar? (backend, servidor, contêineres), requisições por minuto, erros 5xx, velocidade (p95), CPU, memória, disco e
  swap do servidor, e a memória e a CPU de cada contêiner.
- **Servidor (infraestrutura):** ligado há, processadores, carga por processador, mortes por falta de memória (deve ser 0), CPU por tipo
  (user, system, iowait, steal), carga 1/5/15 min, para onde vai a memória, swap, espaço de disco usado e livre, **previsão de espaço livre
  em 7 dias**, leitura e escrita no disco, tráfego de rede e processos.
- **Contêineres:** uma tabela do que cada peça faz e o que acontece se ela cair; memória (em bytes e em % do teto), CPU, reinícios na última
  hora, mortes por memória, tempo ligado e rede de cada contêiner.
- **API (backend):** requisições em 24 h, por minuto e por rota, resultado (2xx, 3xx, 4xx, 5xx), p50, p95 e p99, rotas mais lentas, erros 5xx por
  rota, acessos negados (401/403), bloqueios por excesso (429), memória do processo, event loop e coleta de lixo.
- **Infra nova em produção:** `node-exporter` (mede o servidor) e `cAdvisor` (mede cada contêiner), sem porta aberta, e um Prometheus de produção
  (`infra/producao/prometheus.yml`) que coleta os dois. Limites de memória: 48 MB e 160 MB (o Prometheus subiu para 256 MB).
- **Validação:** subi uma cópia isolada no servidor e testei cada consulta de cada painel pelo próprio Grafana (57 com dados e nenhuma com erro;
  as de erros e bloqueios ficam vazias quando nada disso aconteceu). Isso achou dois problemas: a carga por processador estava vazia (consulta
  corrigida) e o cAdvisor 0.49 não listava os contêineres do Docker 29 (subiu para a 0.60.6 e ganhou `cgroup: host`).
- **Limite conhecido:** o node-exporter em contêiner não lê a rede da placa do servidor; o painel mostra o tráfego somado dos contêineres.
- **Ajuste:** depois do deploy o Grafana usava 229 MB dos 256 MB do teto (cerca de 90%), então o limite subiu para **384 MB**.

---

## 2026-11-09: Financeiro da plataforma (assinaturas, entrou e saiu no mês, recibos e despesas)

Nova aba **Plataforma** no painel do Admin, só para acompanhar o dinheiro das **vendas da plataforma** (as mensalidades que
os síndicos pagam), separado do dinheiro das locações entre moradores (que continua na aba Financeiro).
- **Assinaturas dos condomínios:** lista do que vence primeiro para o que vence depois, com a situação ("Vence em 3 dias",
  "Vence hoje", "Vencida há 2 dias", "Suspensa", "Aguardando o 1º pagamento"), o valor de cada cobrança e a data de
  vencimento. Filtros com contagem (vencem em 7, 15 ou 30 dias, vencidas, aguardando pagamento) e busca por condomínio ou
  síndico (sem diferenciar acento).
- **O que entrou e saiu no mês:** quadros de **Entrou**, **Taxas do Asaas**, **Despesas** e **Resultado do mês**
  (entrou − taxas − despesas), com navegação entre os meses (o mês é o de Brasília).
- **Pagamentos recebidos:** cada mensalidade paga por um síndico (quem pagou, condomínio, plano, valor, taxa do Asaas e
  líquido) abre um **recibo** para imprimir ou salvar em PDF, com o mesmo número do e-mail que o síndico recebeu
  (`USAI-XXXXXXXX`), a vigência paga e o documento mascarado.
- **Despesas lançadas à mão** (servidor, domínio, e-mail, taxas, outro), com data, valor e descrição, e remoção com
  confirmação. Elas entram na conta do mês em que a data cair.
- **Backend:** `GET /api/admin/plataforma/vendas?mes=AAAA-MM`, `GET /api/admin/plataforma/assinaturas`,
  `POST /api/admin/plataforma/despesas` e `DELETE /api/admin/plataforma/despesas/:id`, todas só para Admin. Migration
  `20261109500000_financeiro_da_plataforma`: `cobrancas_assinatura.taxaAsaas` e `ativaAteApos` (a taxa que o Asaas cobrou
  em cada mensalidade, lida do Asaas ao confirmar o pagamento, e até quando ele deixou o condomínio ativo) e a tabela
  `despesas_plataforma`.
- **Mensalidades pagas antes desta mudança** não têm a taxa gravada: aparecem sem taxa e a tela avisa quantas são (contam como
  R$ 0,00 na conta do mês).
- Testes: backend 795 e frontend 530 (cálculo do mês e dos limites, ordenação e filtros das assinaturas, recibo, despesas e a
  tela inteira). O serviço também foi conferido contra um MySQL de verdade.

---

## 2026-11-09: Sem comissão fixa de 10%, comissão por condomínio e taxa do Asaas descontada do dono

A regra fixa de "10% de cada locação vai para o condomínio" deixou de existir. O percentual passa a ser **negociado com o
síndico de cada condomínio** e definido só pelo Admin; o padrão é **0%**.
- **O dono do item recebe o valor pago menos as taxas do Asaas.** Um aluguel de R$ 100,00 deixa R$ 98,01 para o dono (o PIX
  custa R$ 1,99 ao Asaas). A taxa vem do próprio Asaas: ao confirmar o pagamento, o backend consulta a cobrança e usa
  `value - netValue`. Se o Asaas não responder, o aluguel confirma mesmo assim, com taxa 0 e um aviso no log.
- **Comissão do condomínio (opcional).** `condominios.percentualComissao` (0 a 100, 2 casas, migration
  `20261109400000_comissao_por_condominio`). Quando maior que 0, vale sobre o valor pago, sai da parte do dono e vai para
  o(s) síndico(s) ativo(s) (dividida em partes iguais). A comissão entra no cálculo só dos aluguéis pagos dali em diante;
  cada locação guarda o que foi aplicado (`taxaAsaas`, `taxaPlataforma`, `valorLiquido`), então o histórico não muda.
- **Fechamento das contas:** `taxa do Asaas + comissão + líquido = valor pago`, sempre; o líquido nunca fica negativo (a
  comissão é limitada ao que sobra depois da taxa do Asaas).
- **Admin:** na aba Condomínios, cada cartão mostra a comissão e o botão "Comissão" abre uma janela para alterar (aceita
  vírgula, de 0 a 100, até 2 casas). O servidor valida de novo (`PATCH /api/admin/condominios/:id`).
- **Extrato e recibos:** o dono vê "Taxa do PIX (Asaas)" e, se houver, "Comissão do condomínio"; o locatário vê a mesma
  quebra do que pagou. Notificações dizem só o que foi descontado.
- **Textos:** saiu da tela inicial, dos planos, dos Termos e das perguntas frequentes a promessa de que o condomínio
  recebe 10% de cada locação. A seção da tela inicial agora diz que o condomínio **pode** ganhar ("O condomínio também
  pode ganhar"): cada condomínio pode combinar uma comissão, que pode até ser zero. O exemplo mostra um aluguel de
  R$ 100,00 num condomínio que combinou 10%: R$ 88,01 para o dono, R$ 10,00 de comissão e R$ 1,99 de taxa do PIX. O item
  dos Termos passou a falar da taxa do PIX e da comissão negociada, e a versão dos Termos virou `2026-11-09.2` (backend e
  frontend).
- Testes: backend 755 e frontend 472 (o cálculo, o livro-razão, o webhook com o líquido do Asaas, a validação do percentual
  e a janela do Admin).

---

## 2026-11-09: Deploy em nuvem e entrega automática (CD)

A USAI passa a rodar num servidor da DigitalOcean (Ubuntu 22.04, 2 GB de RAM, 50 GB de disco) com o domínio
`usainet.com.br`. Tudo em `infra/producao/`.
- **Desenho:** um proxy Caddy emite e renova o HTTPS sozinho e separa por caminho: `/api`, `/uploads` e `/socket.io`
  vão para o backend, o resto para o front (nginx, com a CSP). Mesmo endereço para tudo, então não há CORS entre
  domínios. `monitor.usainet.com.br` abre o Grafana, com login próprio.
- **Só o Caddy abre portas** (80 e 443). MySQL, backend, Prometheus e `/metrics` ficam na rede interna do Docker. O
  firewall do servidor (ufw) libera apenas 22, 80 e 443.
- **Migrações automáticas:** o serviço `migrar` roda `prisma migrate deploy` antes de o backend subir.
- **Memória:** cada serviço tem limite (MySQL com buffer de 192 MB e sem `performance_schema`), para caber nos 2 GB.
- **Entrega contínua** (`.github/workflows/deploy.yml`): depois que o CI passa na `main`, o GitHub Actions monta as
  imagens do backend e do front, publica no GitHub Container Registry, envia a configuração por SSH (usuário `deploy`,
  chave só do CI, impressão digital do servidor fixada) e roda `docker compose up -d --wait`. Dois deploys nunca rodam
  juntos, e voltar uma versão é trocar `USAI_TAG` no `.env`.
- **Segredos** (JWT, senhas do banco e do Grafana, token do webhook) foram gerados no próprio servidor, no `.env` com
  permissão 600, fora do Git. Modelo em `infra/producao/.env.example`.
- **Backup** diário do banco e das fotos (`infra/producao/backup.sh`), guardando 7 dias.
- O servidor já tinha outro projeto; foi feito backup completo na máquina do autor e a máquina foi limpa antes do deploy.
- **No ar:** o primeiro deploy automático rodou (PR #19) e https://usainet.com.br responde com certificado válido
  (Let's Encrypt), cabeçalhos de segurança, `/metrics` fechado para a internet, Prometheus coletando e Grafana em
  `monitor.usainet.com.br`. O login por senha no SSH foi desligado (só chave). A conta de Admin de produção foi criada
  por um script que pede a senha no terminal do servidor (ela não passa pelo chat nem fica em arquivo).
- **Ajuste:** o limite de memória do Grafana subiu de 192 MB para 256 MB (usava 167 MB, perto do limite).
- **Falta:** trocar o Asaas para produção (chave, webhook e e-mail) e testar o plano de R$ 5,00.

---

## 2026-11-09: Fotos nos posts do Mural

Os posts do Mural (avisos e pedidos de ajuda) agora aceitam **até 4 fotos**.
- **Postar:** botão "Foto" ao lado de "Postar", com várias fotos de uma vez, prévias com ✕ para remover e contador
  ("Fotos (2/4)"). Só JPEG, PNG e WebP, até 5 MB cada; o front confere antes de enviar.
- **Ver:** o post mostra as fotos (uma grande, ou em grade de 2 colunas); clicar amplia a foto, com setas, Esc e
  clique fora para fechar. Aparece no cartão do Mural e no detalhe do post.
- **Backend:** `pedidos.imagens` (JSON, migration `20261109300000_mural_com_imagens`) e `POST /api/mural/upload-imagem`
  (pasta `uploads/mural`). O servidor confere o **conteúdo real** do arquivo (um HTML com extensão `.png` é recusado e
  apagado) e o post só aceita endereços de `/uploads/mural/` (nada de link de fora, que serviria para rastrear).
- **Sem fotos esquecidas no disco:** ao excluir um post, as fotos dele também são apagadas (`removerArquivosDeUpload`,
  que nunca sai da pasta de uploads). Ao excluir a conta (LGPD), saem do disco também as fotos dos posts e dos anúncios
  da pessoa.

---

## 2026-11-09: Catálogo de serviços, engrenagem no perfil e sessão que se renova sozinha

**Serviços no catálogo.** Os moradores podem publicar serviços que prestam (eletricista, maquiagem, unha, aulas...),
com o valor **por hora** ou **por serviço** (preço fechado). Escolha de projeto: **vitrine + conversa**. Não há pedido,
PIX nem taxa para serviços; quem se interessa fala com quem presta pelo chat e combinam data e pagamento por fora, e
a USAI fica fora (mesma regra dos itens, agora escrita no item 5.7 dos Termos).
- Backend: `itens.tipo` (`ITEM` ou `SERVICO`) e `itens.unidadeCobranca` (`DIA`, `HORA`, `SERVICO`), migration
  `20261109200000_catalogo_de_servicos` (aditiva; o que já existia continua item por dia). Item mantém o piso de
  R$ 5,00 (o menor valor do PIX); serviço não tem piso. O anúncio devolve quem presta (nome e apartamento). O
  catálogo aceita `?tipo=SERVICO`. Pedir a locação de um serviço devolve 400 `SERVICO_NAO_ALUGAVEL`.
- Frontend: Publicar tem a escolha "Item para alugar" ou "Serviço" (serviço sem a identificação do bem, com "por hora"
  ou "por serviço"); o catálogo ganhou os filtros Tudo, Itens para alugar e Serviços, com a etiqueta "Serviço" e o
  valor por hora no cartão; o detalhe do serviço mostra quem presta e o botão "Conversar com ..." no lugar do formulário
  de locação; o dono edita valor e forma de cobrança. Aviso curto de responsabilidade também para serviços.
- Termos e tela inicial atualizados (serviços divulgados pela USAI, combinados e pagos direto entre as pessoas).

**Perfil.** "Baixar meus dados" e "Excluir minha conta" saíram do cartão grande e foram para uma engrenagem discreta ao
lado de "Editar", que abre um menu (com os links dos Termos e da Política e a data do aceite). Excluir continua
pedindo senha e confirmação.

**Defeito corrigido: sessão vencia em 15 minutos.** O front nunca renovava o token de acesso (15 min), então depois
disso toda tela mostrava "Token inválido ou expirado" até sair e entrar de novo. Agora, ao vencer, o front renova sozinho
com o token de renovação e repete a chamada (várias chamadas vencidas ao mesmo tempo compartilham uma renovação); se a
sessão acabou de verdade, volta ao login. O servidor passou a devolver o código `TOKEN_INVALIDO` nesse caso (para não
confundir com "senha incorreta"), e o socket lê o token de novo a cada conexão.

---

## 2026-11-09: Termos de Uso e Política de Privacidade completos

Os dois documentos foram reescritos por inteiro (`TermosPage.tsx`, `PrivacidadePage.tsx`), com índice, seções
numeradas e um quadro de resumo no alto.

- **A USAI fica por fora dos itens.** A seção 5 dos Termos diz que a responsabilidade por perda, furto, roubo, dano,
  defeito, atraso e qualquer prejuízo ligado ao item é **exclusivamente de quem empresta e de quem aluga**, que
  resolvem tudo entre si, de comum acordo (conserto, substituição, pagamento do valor, desconto, perdão ou outra
  solução), sem envolver a USAI, que não media, não decide e não garante nem oferece seguro ou caução. O texto também
  separa o que cabe ao proprietário e o que cabe ao locatário e prevê, se as partes quiserem, a ajuda do síndico como
  mediador.
- **Termo de cada locação (retirada e devolução)** ganhou uma nova versão (migration
  `20261109100000_termo_locacao_usai_fora_da_relacao`) com duas cláusulas no mesmo sentido. Ela parte da versão mais
  recente de cada tipo e nasce como MODELO, como todas.
- **Aviso curto** nas telas de pedir e de anunciar um item (`AvisoResponsabilidade`), com link para a regra completa.
- **Aceite uma única vez, antes de criar a conta:** a caixa de marcar, com os links, continua no cadastro e na
  contratação, simples. O registro (data e versão) fica no usuário e agora aparece no perfil ("Aceite registrado").
- **Política de Privacidade** com 15 seções: controlador (Gustavo Vieira Wesolowski, pessoa física), dados coletados,
  bases legais, compartilhamento (inclusive Asaas, Google Fonts e WhatsApp), transferência internacional,
  armazenamento no navegador, prazos de guarda, segurança, direitos e prazo de 15 dias, exclusão da conta, decisões
  automatizadas e menores. Foro dos Termos: o do domicílio do usuário.
- A versão dos textos passou para `2026-11-09`.

**Ainda é preciso um advogado:** nenhum texto garante, sozinho, que "nada pode dar errado". Antes de uso comercial
os dois documentos devem ser revistos por um profissional de direito. Contas de síndico criadas pelo Admin não passam
pelo aceite do cadastro (ficam sem registro).

---

## 2026-11-06: Segurança da informação e LGPD

Revisão de segurança do backend, do front e das imagens Docker, e entrada da LGPD no produto. Nenhum sistema é
100% seguro: o que segue é o que foi fechado e o que continua dependendo do deploy e de pessoas.

**Contra invasão e abuso**
- **Segredos do JWT:** em produção o servidor não sobe sem `JWT_ACCESS_SECRET` e `JWT_REFRESH_SECRET` (diferentes,
  32+ caracteres), sem `CORS_ORIGINS` e, com o Asaas ligado, sem `ASAAS_WEBHOOK_TOKEN` (`common/config.ts`). Antes,
  a falta deles caía num segredo padrão e qualquer pessoa poderia forjar um login de Admin.
- **Tentativas de login e de PIN:** limite só sobre as falhas, por endereço e por conta (8 por 15 min) e, no cadastro,
  por endereço e por condomínio (o PIN tem 4 dígitos). Também limites no refresh e na troca de senha
  (`common/rateLimit.ts#limitarFalhas`, `auth.limites.ts`). `TRUST_PROXY` informa quantos proxies existem para o IP
  real aparecer.
- **Sessões:** `tokenVersion` na conta. Sair da conta (`POST /api/auth/logout`) e trocar a senha derrubam todos os
  refresh tokens. O algoritmo do JWT é fixado em HS256. Login com e-mail inexistente leva o mesmo tempo da senha errada.
- **Senha:** de 8 a 72 caracteres (o bcrypt ignora o que passa de 72) e lista de senhas óbvias barradas. O front
  mostra o motivo da recusa.
- **Entradas:** tamanho máximo nos campos, corpo limitado a 100 kb e 413 ou 400 no lugar de 500 para corpo grande ou
  JSON malformado.
- **Uploads:** além do tipo declarado, o conteúdo do arquivo é conferido (JPEG, PNG ou WebP de verdade); o anúncio só
  aceita imagens enviadas pela própria plataforma.
- **Comparações em tempo constante** para o PIN e para o token do webhook do Asaas.
- **Cabeçalhos:** a API envia CSP restritiva, Permissions-Policy, COOP e `no-store` nas respostas de `/api`; o nginx do
  front envia CSP (script só do próprio site), `X-Frame-Options`, `nosniff`, Referrer-Policy e Permissions-Policy.
  A CSP foi testada no navegador com o build de produção, sem nenhuma violação.
- **`/metrics`** só responde para a rede interna (o Prometheus no Docker).
- **Docker:** o backend roda como usuário sem privilégios (`node`) e o nginx do front lê a origem da API de variáveis
  (`API_ORIGIN`, `API_WS_ORIGIN`).
- **Dependências:** zero falhas conhecidas nas de produção (Zod 4, React Router 7, multer 2) e Vite 8, Vitest 5 e Jest 30
  nas ferramentas. O CI passou a rodar `npm audit --omit=dev --audit-level=high` e o Dependabot abre PRs semanais.
  Restam avisos só em ferramentas de desenvolvimento (minimatch e glob do ESLint e do Jest), que não vão para o servidor.

**LGPD**
- Páginas públicas **Termos de Uso** (`/termos`) e **Política de Privacidade** (`/privacidade`), com links nas telas
  de acesso, no rodapé e no perfil.
- **Aceite registrado:** o cadastro do morador exige marcar o aceite e a contratação do síndico inclui o aceite na
  declaração; ficam gravados a data e a versão (`aceitouTermosEm`, `versaoTermos`).
- **Direitos do titular** (Perfil, "Seus dados e privacidade"): *Baixar meus dados* (JSON com tudo o que existe sobre
  a pessoa, sem a senha) e *Excluir minha conta*, que anonimiza (nome, e-mail, CPF, chave PIX e apartamento deixam de
  existir, o Mural da pessoa é apagado) depois de conferir a senha. Os registros financeiros e os documentos de
  retirada e devolução continuam, sem identificar ninguém (obrigação legal). A exclusão é barrada com locação em
  andamento, saque em aberto, saldo a sacar ou assinatura de condomínio sob responsabilidade da pessoa.

**O que continua fora do código:** teste de invasão de verdade, revisão jurídica dos textos, HTTPS e firewall no
servidor, backups, rotação dos segredos que já apareceram (senha de app do Gmail e chave sandbox do Asaas) e um plano
de resposta a incidentes.

---

## 2026-11-05: Teste de usabilidade de todas as telas

Percurso completo com contas de teste (visitante, morador, síndico e Admin) em tela de computador e de celular
(390 px): cadastro pelo link e PIN, publicar item, pedir locação, aprovar, chat da locação, mural, extrato,
perfil, painel do síndico e todas as abas do Admin. Sem erros no console, sem rolagem horizontal e sem
requisição falhando além do esperado (contratação inexistente devolve 400).

Corrigido a partir do que o teste mostrou:
- **Dono não conseguia editar nem remover o próprio anúncio** (o backend já tinha `PATCH` e `DELETE`, RF07, mas
  não havia tela). Agora a página do item, para o dono, tem **Editar anúncio** (título, categoria, descrição e
  diária, com o mínimo de R$ 5,00) e **Remover do catálogo** com confirmação (`GerenciarAnuncio.tsx`).
- **Clicar numa janela da tela inicial parecia não fazer nada** em telas baixas: o bilhete com o item fica
  embaixo do prédio, fora da vista. Agora ele é trazido para a tela ao escolher a janela.
- **Contratação:** limite de moradores colado no preço nos planos Grande e Premium.
- **Alvos de toque no celular** abaixo do mínimo (links do rodapé, alternância Post/Preciso de ajuda, copiar
  link e PIN, chips de filtro, "Ver detalhes e recibo", ícones do post, logo e links do login).
- Foto ausente do item com o mesmo visual do catálogo, e cartão do plano do síndico sem espaço vazio.

Para conferir antes da entrega: o plano de teste (R$ 5,00) aparece na contratação enquanto
`PLANO_TESTE_ATIVO=true`; em produção deve estar desligado.

---

## 2026-11-05: Node 24, Docker corrigido, janela da landing e tela de compra mais curta

**Node 24.** A aplicação saiu do Node 20 (fora de suporte desde abril de 2026): CI, Dockerfiles, `.nvmrc`,
`engines` do `package.json` e `@types/node` 24 nos dois apps. O `@types/node` 24 deixou de trazer a biblioteca
ES2022 para o TypeScript, então o frontend passou a declarar `ES2022` no `tsconfig.app.json` (o teste usa
`Array.at`). Verificado: `tsc -b`, `eslint`, os dois builds, 627 testes do backend e 378 do frontend, e as duas
imagens Docker rodando.

**Docker (defeitos que já existiam).** A imagem de produção do backend copiava o `node_modules` do estágio
errado, o que não tem o cliente do Prisma gerado, então o contêiner nunca subia ("@prisma/client did not
initialize"). Agora copia do estágio de build e instala o `openssl`, que o Prisma precisa no Alpine para
escolher o motor certo. Testado contra o banco de desenvolvimento: `/health` e a leitura da configuração
funcionam. O `docker compose` também acusou que a `ASAAS_API_KEY` (começa com `$`) chegava vazia, porque o
compose lê `$` como variável: o valor passou a ficar entre aspas simples, e o `.env.example` avisa disso.

**Janela da landing tremia sob o mouse.** O grupo SVG da janela tinha um `transform="translate(...)"` de
posição e o hover aplicava `transform: scale(...)` por CSS no mesmo elemento. O CSS sobrescreve o atributo, a
janela pulava para a origem, o mouse saía de cima dela e ela voltava, em loop. Agora o translate fica no grupo
de fora e o hover no de dentro (`CenaHero.tsx`), com teste que protege essa estrutura.

**Tela de compra mais curta** (`ContratarPage.tsx`). Planos viraram linhas compactas (nome, limite e preço), o
período virou um seletor de uma linha com o valor por mês, e os dados do síndico ficam em duas colunas. No
desktop o card passou de cerca de 1.100 px para 955 px, com o formulário inteiro numa tela; no celular, o total a
pagar aparece logo antes da declaração. Mesmos campos e rótulos, e os 39 testes da contratação seguem verdes.

---

## 2026-11-05: Redesenho, etapa 5: painel do Admin

**Escopo.** `AdminPage.tsx` (financeiro, condomínios, síndicos) e a aba de extratos, no sistema "A Fachada". As
abas Documentos, Termos e Identidade já saíram coerentes com a paleta nova pelo remapeamento de tokens.

**O que mudou.**

- **Cabeçalho que mostra o que precisa de ação:** "Aguardando decisão" e "PIX a transferir", e a aba
  Financeiro ganha um contador coral com a soma dos dois. O Admin vê de relance se tem trabalho pendente.
- **Financeiro:** busca na fila por nome, condomínio ou chave PIX (`features/admin/admin.filtros.ts`) e filtro
  do histórico entre pagos e rejeitados, com contagem. Os cartões de resumo ficaram mais compactos no celular.
- **Condomínios:** busca por nome ou link, filtro ativos e inativos, data de cadastro e situação em cada
  linha. Desativar passou a pedir confirmação numa janela que explica o efeito real: o condomínio inativo
  só impede novos cadastros pelo link, quem já tem conta continua entrando (conferido no `auth.service.ts`).
- **Extratos:** a busca de usuários ganhou filtro por papel (moradores, síndicos, admins) e a conta da USAI
  ganhou filtro por período, reaproveitando as funções do extrato do morador.
- **Contraste:** números em amarelo claro sobre fundo branco (resumo de saques, extrato, perfil) passaram para
  o tom escuro do mesmo amarelo, que atinge o contraste mínimo.

**Testes.** Frontend 378 (novos: filtros do Admin, modal de desativação, busca e histórico de saques, filtros
de extrato), `tsc` e `eslint` limpos; o detector do Impeccable só mantém avisos antigos de tamanho e cor em
`index.css` e `ItemCard`. Conferido no navegador em 420 px com dados simulados.

**Onde mexer a seguir.** Remover os nomes antigos de tokens (`paper`, `ink`, `barro`, `jade`...) trocando por
`fachada-*` e rodar `/impeccable document` para fechar o `DESIGN.md`. É um refactor só de nomes, sem mudança
visual, por isso fica por último.

---

## 2026-11-05: Redesenho, etapa 4: painel do síndico

**Escopo.** `SindicoPage.tsx` e o cartão de convite (`ConviteMoradores.tsx`), no sistema "A Fachada".

**O que mudou.**

- **O prédio do condomínio** (`features/sindico/PredioMoradores.tsx`): no topo do painel, cada janela acesa é
  um morador e as apagadas são as vagas que sobram no plano. As janelas acendem em cascata quando entram na
  tela. Passando de 40 vagas, o desenho fica proporcional (`janelasDoPredio`); o texto de acessibilidade
  sempre traz os números reais.
- **Convite mais direto.** O PIN deixou de aparecer em dois cartões: o "Alterar PIN" foi para dentro do
  cartão de convite. Novo botão "Enviar pelo WhatsApp" abre a conversa com a mensagem de convite pronta
  (link e PIN), sem escolher contato antes.
- **Filtros** (`features/sindico/sindico.filtros.ts`): moradores com busca (nome, e-mail, apto) e "Em
  locação agora" (dono ou locatário de uma locação ativa); locações com busca por item ou locatário e
  situação (aguardando pagamento, pagas a retirar, em andamento), todos com contagem.
- **Mais informação nas listas.** Avatar e data de cadastro de cada morador; nas locações aparece também o
  dono do item (cruzando com a lista de moradores). As abas mostram a contagem.
- **Remover morador** deixou de usar `window.confirm` e ganhou uma janela própria (`Modal`), com o nome da
  pessoa e o que acontece depois.

**Testes.** Frontend 368 (novos: filtros do síndico, modal de remoção, filtros de locação, prédio), `tsc`,
`eslint` e detector do Impeccable sem achados. Conferido no navegador em 420 e 1280 px com dados simulados.

**Onde mexer a seguir.** Etapa 5 (Admin), depois remover os tokens antigos.

---

## 2026-11-05: Redesenho, etapa 3: app do morador, filtros, rodapé e texto sem travessão

**Escopo.** Interior do app do morador (catálogo, item, publicar, locações, conversas, notificações,
saques e extrato, perfil) no sistema "A Fachada", mais três pedidos que entraram no meio da etapa.

**O que mudou.**

- **Visual.** Os tokens antigos (`paper`, `ink`, `barro`, `jade`, `mostarda`, `carmim`) foram remapeados
  para a paleta nova em `tailwind.config.ts`, então todas as telas do app já saem coerentes sem reescrever
  cada uma. Cabeçalho e barra inferior (`AppShell.tsx`) ficaram na cor da noite, com a janela acesa
  marcando a aba atual. `Card`, `Avatar`, `EmptyState` e `ItemCard` foram refeitos; as listas entram
  escalonadas (`lib/animacao.ts`). Textos de 10 e 11 px viraram `text-xs`.
- **Filtros.** Extrato com tipo (tudo, aluguéis recebidos, comissões, saques) e período (7, 30, 90 dias ou
  tudo), com soma do que entrou e saiu no filtro (`features/saques/extrato.filtros.ts`,
  `ExtratoView.tsx`); saque rejeitado não entra na soma porque o valor voltou ao saldo. Conversas e
  Notificações ganharam "Todas / Não lidas" com contagem, usando o `FiltroChips` que as Locações já usavam.
- **Rodapé da página inicial** (`features/landing/RodapeLanding.tsx`): cartões de WhatsApp e e-mail com
  ícones desenhados à mão (`components/ui/IconesContato.tsx`), lista do que o suporte resolve (cada assunto
  abre o WhatsApp com a mensagem já escrita), navegação, aviso de que o morador entra pelo link do síndico
  e o texto institucional configurável. `ContatoSuporte` (telas de acesso) também ganhou os ícones.
- **Sem travessão.** Retirados os travessões de textos da tela, e-mails, nomes de teste, comentários e
  documentos. Duas migrações corrigem o que já estava gravado no banco, só quando ninguém editou:
  títulos dos termos v1 (`20261105100000_titulos_dos_termos_sem_travessao`) e o nome institucional padrão
  (`20261105110000_nome_institucional_sem_travessao`). O título do termo não entra na assinatura nem na
  impressão digital do documento, então trocar o texto não invalida nada já assinado. O RFC e os diagramas
  C4 ficaram como estão (documento entregue e imagens já desenhadas).

**Por que assim.** Remapear tokens deu consistência imediata e deixou o redesenho de cada tela só para o
que precisava de decisão de design. O filtro por período usa a data de agora na função pura, o que permite
testar com data fixa. Os assuntos do suporte em links de WhatsApp com mensagem pronta evitam a conversa
começar vazia.

**Testes.** Frontend 361 (novos: filtros do extrato, conversas, notificações, rodapé), backend 627, `tsc`
e `eslint` limpos. Um erro de codificação (acentos corrompidos) em três páginas foi pego pela suíte e
corrigido antes do commit.

**Onde mexer a seguir.** Etapa 4 (painel do síndico) e etapa 5 (Admin), depois remover os tokens antigos.

---

## 2026-11-05: Redesenho, etapa 2: contratação, acesso e recuperação de senha

**Escopo.** Contratar, acompanhar a contratação, criar senha (primeiro acesso), login, cadastro de morador,
"esqueci minha senha" e redefinir senha, todas no sistema "A Fachada" (`DESIGN.md`). A etapa 1 (tela inicial)
passou limpa no CI e no Sonar (gate OK, 90,8% de cobertura do código novo, zero issues).

**O que mudou.**
- Moldura `AuthShell`: cartão de papel sobre o céu da USAI, com prédios ao fundo cujas janelas acendem e
  apagam, cada uma no seu ritmo (`components/fachada/CeuNoturno.tsx`, só CSS, escondido do leitor de tela).
- Contratar (`ContratarPage.tsx`): cartão de papel com opções de plano e período em cartões de seleção (marcador
  de check, anel de foco), resumo como bilhete em Caveat e o "Como funciona" num bloco petróleo.
- Acompanhar a contratação: na espera, cinco janelinhas piscando em sequência no lugar do spinner; confirmado o
  PIX, uma cascata de janelas acesas (`JanelasAcendendo.tsx`, também usado no fim da tela inicial).
- `Button`, `TextField` e `Spinner` (compartilhados com o app inteiro) ganharam o visual novo: coral, cantos
  arredondados, foco visível em açafrão e erro em `coral-texto`. As telas internas ainda estão no visual
  antigo (fundo creme, cabeçalho escuro, serifa), o que deixa o app misturado até as etapas 3 a 5.
- `DESIGN.md`: escala tipográfica completa (display, título, cartão, preço, corpo e corpo pequeno).

**Verificação.** Conferido em 420, 360 e 320 px e em 1440 px (sem estouro de largura); fluxo real no sandbox
(contratar, espera, PIX confirmado, tela de confirmação); detector da skill sem achados nas telas novas (restam
11 avisos de fonte de 10 e 11 px, todos nas telas internas antigas); 344 testes do frontend, lint, tipos e
build ok. Testes novos: `fachada.test.tsx`. O backend não foi alterado e segue com 627 testes passando.

**Pendências.** Etapas 3 (app do morador), 4 (painel do síndico) e 5 (Admin); trocar de vez o fundo, o cabeçalho
e a navegação do app; remover os tokens antigos (`paper`, `ink`, `barro`, `jade`) no fim.

---

## 2026-11-05: Redesenho, etapa 1: tela inicial ("A Fachada")

**Pedido.** Redesenhar o visual inteiro da USAI com a skill Impeccable (instalada na mão em
`.claude/skills/impeccable`, sem hooks nem subagentes), em cinco etapas com um commit aprovado por etapa: tela
inicial, contratação e acesso, app do morador, painel do síndico e Admin. Esta é a etapa 1.

**Ferramenta usada.** A skill é um conjunto de instruções mais um motor de verificação, não um gerador de
telas. Foram usados o `context`, o `concept-seed` (sorteio de direção), o `surface-brief` (contrato da
direção), o `detect` (detector mecânico de design) e as regras de `new-work`, `mode-persuade` e `craft-floor`.
Todo o desenho e o código do visual são do autor do projeto; a telemetria da skill foi desligada
(`DO_NOT_TRACK=1`).

**Duas tentativas, uma rejeitada.** A direção sorteada ("Placa do Hall": metal e granito) foi construída e
rejeitada pelo autor: parecia visual de IA, fria e sem relação com a marca. A segunda, escolhida pelo autor,
é **A Fachada**, com paleta nova e animações (ver `apps/frontend/DESIGN.md`).

**O que mudou.**
- Cena da primeira dobra (`features/landing/CenaHero.tsx`): a empena coral com o título pintado e um prédio em
  SVG com 16 janelas. As janelas acendem em cascata ao carregar; as 6 com item são botões (mouse e teclado) e o
  "bilhete" mostra o item, o preço e o estado; "Pedir emprestado" vira a janela coral. Estrelas piscam, uma
  cestinha de corda desce da janela do 304 com a furadeira, uma silhueta passa numa janela e, de vez em quando,
  um vizinho acende ou apaga a luz. Tudo é de demonstração e a tela avisa.
- Janelas ilustradas (`JanelasIlustradas.tsx`): abajur que pisca, eletricista com faíscas e dois vizinhos com
  balões de conversa.
- Revelar ao rolar (`revelar.tsx`): o conteúdo é visível por padrão e só o que está abaixo da dobra é marcado
  antes de aparecer; sem `IntersectionObserver` ou com "reduzir movimento" tudo já aparece. A linha do tempo se
  desenha, a barra 90/10 cresce e as janelas do fim acendem em cascata.
- Seções com campos de cor alternados (noite, prédio, papel, açafrão, coral); planos refeitos no mesmo
  sistema (`PlanosPrecos.tsx`, mesma lógica e textos).
- Marca nova (`MarcaUsai.tsx`, `Logo.tsx`): casinha e U num quadrado arredondado coral com a janela acesa.
  Aparece também nas telas que ainda estão no visual antigo.
- Tokens `fachada-*` e fontes (Bricolage Grotesque, Caveat) em `tailwind.config.ts`, `index.html` e
  `index.css`. Os tokens antigos continuam, porque o app ainda os usa até as etapas 2 a 5.

**Verificação.** Contraste calculado para as combinações de cor (todas ≥ 4,5:1 nos usos de texto; dois casos
corrigidos: texto claro sobre `predio-claro` e coral em texto pequeno); detector da skill sem achados; 337
testes do frontend, lint, tipos e build ok; conferido em 1440, 768, 360 e 320 px (um estouro de largura nas
janelinhas do final foi corrigido). Testes novos: `CenaHero.test.tsx` e `revelar.test.tsx`.

**Pendências.** Etapas 2 a 5; telas internas ainda no visual antigo (inconsistência temporária); fotos reais,
se o autor as fornecer; revisão final do contrato com o autor.

---

## 2026-11-04: Rodada de testes de usabilidade antes do deploy

**O que foi testado.** Todos os fluxos, pela API e pela tela (navegador), com o Asaas no **sandbox** e um
servidor SMTP falso local (`.scratch/smtp_sink.cjs`) que recebe os e-mails sem entregar a ninguém:
contratação do síndico (PIX no sandbox, e-mail com recibo, criação de senha), cadastro de morador com PIN,
publicar item (diária mínima de R$ 5), pedido, aprovação, pagamento, retirada com aceite por senha, chat,
saque, extrato, comissão do condomínio, painel do síndico, as sete abas do Admin e o "esqueci minha senha"
(o link que chega no e-mail troca a senha; link reusado, vencido ou cortado é recusado). Também foram
conferidos o redirecionamento de quem não tem permissão, o endereço inexistente, o tamanho de celular
(320 e 360 px) em todas as telas e o servidor compilado (`node dist/server.js`) em modo produção.
Resultado dos roteiros de API: 139 + 51 + 12 + 15 + 7 verificações, todas ok.

**O que foi corrigido no caminho.**
- Locações: quem empresta passou a ver **quem pediu** (nome e apartamento) no cartão de "Recebidas"; antes
  aprovava sem saber a quem. Quem só emprestou (nunca alugou) já abre em "Recebidas".
- Pagamento sem CPF no perfil: o aviso agora tem o link "Abrir meu perfil".
- Celular: a tela "Publicar item" estourava a largura em 27 px (`fieldset` e a linha de acessórios sem
  `min-w-0`); o cabeçalho da tela inicial também não cabia abaixo de ~330 px.
- Cadastro de morador: dica "mínimo de 8 caracteres" e link "Já tem conta? Entrar".
- Acompanhar contratação: `<div>` dentro de `<p>` (aviso de HTML inválido no console).
- API: cabeçalhos de segurança (`nosniff`, anti-iframe, `Referrer-Policy`, HSTS só em HTTPS) e sem
  `X-Powered-By` (`common/securityHeaders.ts`). Sem `Cross-Origin-Resource-Policy` de propósito, para as
  fotos de `/uploads` carregarem no front de outra origem.

**Para o deploy (achados, ainda não resolvidos no código).**
- `GET /metrics` é público: restringir no proxy (ou só na rede interna).
- Sem `CORS_ORIGINS` a API recusa o front publicado (comportamento esperado e já documentado).
- O limitador de requisições usa o IP: atrás de proxy é preciso `trust proxy`.

---

## 2026-11-04: "Esqueci minha senha" (recuperação por e-mail)

**Problema.** Se o síndico (ou qualquer morador) perdesse a senha, não havia como recuperar a conta.

**Como funciona.** Na tela de login há o atalho "Esqueci minha senha" (`/esqueci-senha`). A pessoa informa
o e-mail e recebe, se houver conta ativa, um link para `/redefinir-senha` que vale **1 hora** e só pode ser
usado **uma vez**. Depois de trocar a senha, ela volta para a página Entrar (não há login automático).

**Decisões de segurança.**
- A resposta de `POST /api/auth/esqueci-senha` é sempre a mesma (202 e a mesma mensagem), exista a conta ou
  não, e o e-mail é enviado em segundo plano: nem o texto nem o tempo de resposta revelam quais e-mails estão
  cadastrados.
- No banco fica só o hash SHA-256 do código (como no link de primeiro acesso); o código tem 32 bytes
  aleatórios (43 caracteres em base64url).
- No máximo 1 pedido por minuto por conta e 10 por hora por IP (`criarLimitador`).
- Ao trocar a senha, todos os links pendentes da conta deixam de valer. Link usado, vencido, cortado ou de
  outro tipo é recusado com um código próprio (`TOKEN_USADO`, `TOKEN_EXPIRADO`, `TOKEN_INCOMPLETO`,
  `TOKEN_INVALIDO`).
- Conta desativada não recebe o e-mail nem consegue redefinir.

**Onde mexer.**
- Backend: `auth.service.ts` (`solicitarRedefinicaoSenha`, `redefinirSenha`; `definirSenha` agora recusa
  links do tipo REDEFINICAO), `auth.emails.ts` (e-mail com a marca), `auth.controller.ts`/`auth.routes.ts`/
  `auth.schemas.ts`.
- Banco: `TokenAcesso` ganhou a coluna `tipo` (`ACESSO` = primeiro acesso, sem prazo; `REDEFINICAO` = 1 hora);
  migração `20261104100000_token_acesso_tipo`.
- Frontend: `EsqueciSenhaPage`, `RedefinirSenhaPage`, funções `esqueciSenha`/`redefinirSenha` em
  `auth.api.ts` e o atalho em `LoginPage`.
- Testes: unitários (serviço, e-mail, controller, páginas) e um E2E de 15 verificações contra um backend de
  teste (`.scratch/e2e_esqueci_senha.cjs`, não versionado).
- `tests/setupEnv.ts` esvazia `SMTP_HOST` em todos os testes: automatizado nunca manda e-mail de verdade
  (o `.env` local tem o SMTP configurado e o Prisma o carrega sozinho).

---

## 2026-11-04: Canais de suporte (WhatsApp e e-mail)

**Pedido.** Colocar `usaisuporte@gmail.com` como contato de suporte no fim da página e o WhatsApp
(47) 99925-2028 como suporte dentro da plataforma.

**O que mudou.**
- `apps/frontend/src/lib/suporte.ts`: um único lugar com e-mail, número e o link `wa.me` (com mensagem
  já escrita). Para trocar um contato, é só mexer aqui.
- `components/ui/ContatoSuporte.tsx`: bloco "Precisa de ajuda?" com os dois canais. Aparece no rodapé
  da tela inicial e nas telas de acesso (`AuthShell`: entrar, cadastro, definir senha, contratar).
- `AppShell`: atalho "Suporte" no cabeçalho de quem está logado (morador, síndico e admin), que abre o
  WhatsApp numa nova aba.
- E-mail de acesso do síndico (`assinaturas.emails.ts`): rodapé com os dois contatos, em HTML e em texto.
- Testes novos: `ContatoSuporte.test.tsx`, atalho no `AppShell.test.tsx` e contatos no e-mail.

---

## 2026-11-03: Planos e contratação pelo síndico (modelo SaaS)

**Pedido.** A tela inicial é a de um SaaS, então precisa de preços: cada síndico escolhe o plano pela
quantidade de moradores, cadastra o condomínio, paga por PIX e, confirmado o pagamento, recebe o
acesso por e-mail. Depois de entrar, o síndico repassa o link e o PIN aos moradores.
Decidido com o usuário: cobrança **por PIX**, e-mail por **SMTP configurável**, acesso por
**link para criar a própria senha** (a senha nunca vai por e-mail). Depois, o usuário pediu a
mensalidade mais cara e períodos de cobrança com desconto.

**Preços (fictícios, projeto acadêmico; ficam todos em `planos.ts`).** Quatro planos pelo número de
contas de morador, Essencial até 20 (R$ 149/mês), Condomínio até 60 (R$ 299), Grande até 150
(R$ 499), Premium até 300 (R$ 799), e quatro períodos: **mensal** (sem desconto), **trimestral**
(−5%), **semestral** (−10%) e **anual** (−20%). O valor de cada período é meses × mensalidade menos o
desconto, arredondado para reais inteiros (ex.: Condomínio anual = R$ 2.870). O posicionamento é de
produto premium: o usuário pediu preços mais altos, duas vezes, para valorizar o produto. O limite conta contas
cadastradas, não todos os moradores do prédio, e a tela inicial pergunta "quantas pessoas devem usar
a USAI?". O preço contratado vale nas renovações mesmo que a tabela mude depois.
**Pagamento:** só PIX. PIX Automático (autorização única, cobranças sem ação do síndico) ficou como
melhoria futura; cartão recorrente e boleto foram descartados nesta fase.

**Plano de teste para validar o Asaas em produção.** O usuário pediu um card de R$ 2,00 para testar a
conta do Asaas em produção. O **Asaas recusa cobranças abaixo de R$ 5,00** (erro "não pode ser menor
que R$ 5,00", conferido no sandbox), então o plano `TESTE` custa **R$ 5,00** (o mínimo), com limite de
3 contas. Ele fica **desligado por padrão**: só aparece na tela inicial e só pode ser contratado com
`PLANO_TESTE_ATIVO=true` no `.env` do backend. É para ligar durante o teste e desligar depois; se
ficasse sempre visível, qualquer visitante poderia contratar um condomínio por R$ 5. Fica num card
separado (tracejado, "Plano de teste"), fora da grade e **fora da recomendação** do calculador.
Assinaturas já criadas no plano de teste continuam funcionando se a chave for desligada.

**Valor mínimo da diária: R$ 5,00.** Pelo mesmo motivo (o Asaas recusa cobrança abaixo de R$ 5,00),
a plataforma passou a exigir **diária de pelo menos R$ 5,00** ao publicar ou editar um item. Como toda
locação tem no mínimo 1 dia (`calcularDias` nunca devolve menos que 1), a diária mínima garante que o
total sempre possa ser cobrado por PIX. A regra vive em `common/valores.ts` (`VALOR_MINIMO_COBRANCA`) e é
aplicada em três pontos: (1) o schema de criar/editar item (400 com mensagem clara); (2) o pedido de
locação, que recusa total abaixo de R$ 5,00, protege itens antigos publicados com diária menor
(`VALOR_ABAIXO_DO_MINIMO`); (3) a geração da cobrança, que não chama o Asaas se o total estiver abaixo.
No frontend, o formulário de Publicar item mostra o mínimo, o campo tem `min=5` e barra valores
menores antes de enviar (`features/itens/valores.ts`, mesmo valor do backend); a tela inicial explica
o mínimo nas perguntas frequentes. Conferido no banco local: nenhum item nem locação aberta abaixo
de R$ 5,00, então não foi preciso corrigir dados.

**Conexão com o Asaas.** Na máquina de desenvolvimento a chamada ao Asaas falhava de vez em quando
(`ENOTFOUND` de DNS e `UND_ERR_CONNECT_TIMEOUT`, em rajadas curtas). O cliente passou a tentar de
novo, até 3 vezes com pausa crescente, **só** nos erros de rede em que o pedido não chegou ao Asaas
(conexão reaproveitada já fechada, recusa, DNS, timeout ao conectar). Erro devolvido pelo Asaas e
timeout de resposta nunca são repetidos, para não duplicar cobrança. Cada falha é registrada no log
com o código do erro.

**Tela inicial mais explicativa e crível.** A pedido do usuário, a tela pública ganhou: "Muito além
de itens parados" (itens, serviços e ajuda, vizinhança); "Segurança em cada negociação" (só vizinhos,
aprovação do dono, PIX confirmado sozinho, termo de responsabilidade, aceite com senha, documento e
histórico) com o bloco "Quem responde pelo material alugado?" (cláusulas do termo); "O condomínio
também ganha" (10% de cada locação para o condomínio, extrato detalhado, uso em melhorias
internas, com exemplo de R$ 100 = R$ 90 + R$ 10); e perguntas frequentes. **Regra de honestidade:** o
texto só afirma o que o sistema faz. Serviços (eletricista, maquiadora etc.) hoje funcionam pelo
**Mural** (pedir ajuda e divulgar o trabalho, combinando pelo chat privado); um catálogo próprio de
serviços, com preço e agendamento, **não existe** e ficou como possível evolução. Os 10% valem só para
locações pagas pela plataforma. Nada sobre validade jurídica do termo é prometido (os textos são
modelo, sujeitos a revisão).

**Fluxo.** `/contratar` (plano + dados) → condomínio e síndico nascem **inativos** + cliente e cobrança
PIX no Asaas → `/contratacao/:id` mostra o PIX e consulta o status a cada 5 s → o webhook (ou a
conferência periódica de 30 s) confirma → condomínio e síndico ativados, 30 dias de vigência e e-mail
com link de uso único (48 h) → `/definir-senha?token=…` cria a senha e já entra em `/sindico`.

**Onde está.**
- Backend `modules/assinaturas/`: `planos.ts` (**única fonte de verdade** de faixas e preços),
  `assinaturas.service.ts` (contratar, confirmar, renovar, suspender), rotas públicas em
  `/api/assinaturas` e do síndico em `/api/sindico/assinatura`.
- Modelos novos (migração `20261103120000_assinaturas`): `Assinatura`, `CobrancaAssinatura`,
  `TokenAcesso` (só o hash SHA-256 do token fica no banco).
- `common/mailer.ts` (nodemailer; sem `SMTP_HOST` o e-mail vai pro log, dá pra testar local),
  `common/documento.ts` (valida CPF/CNPJ), `common/rateLimit.ts` (limita contratações por IP).
- O webhook do Asaas e a conferência periódica passaram a reconhecer também as mensalidades
  (`PagamentosService` delega pra `AssinaturasService`); mensalidade e locação nunca se confundem.
- Frontend: seção "Planos e preços" da tela inicial com calculador por moradores, páginas de
  contratação, acompanhamento e criação de senha, e no painel do síndico os cartões **Convidar
  moradores** (copiar link, PIN e mensagem pronta) e **Plano** (uso x limite, vencimento, PIX).

**Regras.** Cada cobrança libera os dias do período pago (30, 90, 180 ou 365) somados ao vigente.
Antes de pagar, o síndico pode voltar e trocar plano ou período: o PIX antigo é cancelado e sai um
novo. Na renovação ele também pode trocar de período (o painel mostra o preço e a economia de cada
um). Plano cheio barra o cadastro de novos moradores (409). Vencida há mais de 5 dias, a
assinatura é **suspensa**: moradores não entram, o síndico sim (precisa pagar). Pagando, reativa.
Condomínios cadastrados antes pelo Admin não têm assinatura e seguem sem limite.

**Testes.** Backend 452 → 511, frontend 255 → 284. E2E real (MySQL + Asaas sandbox, PIX simulado pelo
webhook) com 51 verificações: contratação, troca de período antes de pagar, ativação por período,
e-mail, criação de senha, convite, limite, renovação com troca de período e suspensão
(`.scratch/e2e_saas.cjs`).

**Limites conhecidos.** Sem SMTP configurado o e-mail só aparece no log. Não há "esqueci minha senha"
nem cancelamento de assinatura. O limitador de contratações é em memória (uma instância só).

**Bug de deploy encontrado e corrigido: o build de produção não subia.** Ao preparar o teste de e-mail em
produção, o build compilado (`node dist/server.js`, o que o `Dockerfile` executa) falhava na
inicialização com `Cannot find module '@/common/cors'`: o `tsc` mantém os imports com o alias `@/`, que
só o `tsx` e o Jest entendem. Passou a rodar `tsc-alias` depois do `tsc` (`npm run build`), que reescreve o
alias para caminhos relativos. Conferido: o build compilado sobe, responde `/health` e serve a API. Esse
erro só apareceria no dia do deploy.

**Comando para testar o SMTP.** `npm run smtp:testar --workspace=apps/backend -- voce@exemplo.com` (em
produção, `node dist/scripts/smtp-testar.js voce@exemplo.com`) mostra a configuração em uso (senha nunca
impressa), confere conexão e login, e envia o e-mail de acesso do síndico com o assunto `[TESTE]`. Erros
de SMTP viram uma dica em português (senha de app do Gmail, host, porta, firewall, remetente).

**E-mail de acesso com a cara da USAI, com recibo.** O e-mail que o síndico recebe depois de pagar deixou
de ser um HTML simples: tem cabeçalho escuro com o símbolo e o nome da USAI, faixa terracota "Pagamento
confirmado / Seu condomínio está ativo!", botão "Criar minha senha e entrar", **recibo de pagamento**
(número `USAI-XXXXXXXX`, data e hora do recebimento, forma PIX, pagador com CPF/CNPJ mascarado, plano e
período, vigência, valor e link do comprovante) e os próximos passos (senha, convite dos moradores, 10% do
condomínio). Feito com tabelas e CSS inline (padrão que funciona no Gmail e no Outlook), com versão em
texto simples. A **logo vai anexada ao e-mail (`cid`)**, porque e-mail não aceita SVG nem imagem em
`localhost`. Os nomes são escapados (nada injeta HTML). O mesmo recibo vai no reenvio do acesso (o do
primeiro pagamento). Para ver sem enviar: `npm run email:previa --workspace=apps/backend` (gera `previa-email-acesso.html` na pasta atual).
**O e-mail só sai com o dinheiro na conta:** a mensalidade só ativa o condomínio com `PAYMENT_RECEIVED`
(webhook) ou status `RECEIVED` na conferência periódica; `PAYMENT_CONFIRMED`/`CONFIRMED` (autorizado, ainda
não liquidado) é reconhecido mas fica esperando. Testado de ponta a ponta no sandbox, com o SMTP do
Gmail da USAI (`usaisuporte@gmail.com`, senha de app só no `.env`, que o git ignora).

**O e-mail caiu no spam (e o que foi feito).** No primeiro teste real o e-mail chegou, mas na caixa de
spam. O log provou que o Gmail aceitou a mensagem (`250 2.0.0 OK`), então o sistema entregou; o que pesa
contra é o remetente novo e gratuito e o **link para `localhost`, sem HTTPS** (some em produção, com
`APP_URL` num domínio real). Melhorias: o **assunto** passou a ser específico, com o nome do condomínio
("Residencial Aurora está ativo na USAI"), sem quebras de linha nem mais de 60 caracteres, para ninguém
injetar cabeçalho; o envio ganhou **`Reply-To`** (`MAIL_REPLY_TO`, opcional) e os cabeçalhos
`Auto-Submitted` e `X-Auto-Response-Suppress` de mensagem automática; o rodapé do e-mail e a **tela de
"Pagamento confirmado!"** orientam a procurar na caixa de spam/promoções e marcar "não é spam"; e cada
envio agora grava no log a resposta do servidor de e-mail (aceitos, recusados, `messageId`), que é o que
permite provar o que aconteceu quando alguém diz "não chegou". **A solução definitiva é de produção:**
domínio próprio (ex.: `contato@usai.com.br`) enviando por um serviço de e-mail transacional, com SPF,
DKIM e DMARC configurados no DNS; só mudam variáveis do `.env` (`SMTP_*`, `MAIL_FROM`, `APP_URL`).

**O link do e-mail vale até a senha ser criada (sem prazo).** Pedido do usuário, para o síndico nunca
esbarrar num erro: antes o link expirava em 48 horas e **cada reenvio derrubava os anteriores** (quem
abrisse o e-mail mais antigo via "link inválido"). Agora: `TokenAcesso.expiraEm` é opcional (nulo = não
expira; migração `20261103140000_token_acesso_sem_expiracao`, que também tirou o prazo dos links ainda
não usados que já tinham sido enviados); o reenvio **não invalida** os links anteriores; e ao criar a
senha (`definirSenha`) **todos** os links do síndico passam a valer como usados. Quem clica num link
depois de já ter a senha recebe a mensagem `SENHA_JA_CRIADA` ("entre pela página Entrar, com o seu
e-mail e a senha que você definiu"), e a tela de criar senha tem o link para Entrar. Como o link não
expira, a defesa é o uso único (consumo de todos os links ao criar a senha), o token aleatório de 256
bits (só o hash no banco) e o limite de reenvio (1 por minuto). **O e-mail explica o login:** bloco
"Como você entra daqui pra frente" (seu login = o e-mail do síndico; sua senha = a que ele criar no
botão; onde entrar = página Entrar da plataforma), e a tela de pagamento confirmado repete a orientação.
Ainda não existe "esqueci minha senha": quem perder a senha depois de criada fica sem recuperação.

**Link "não é válido" no teste: era um link cortado.** No teste com outro e-mail o link abriu a tela de
criar senha com "este link não é válido". O código na barra de endereço tinha 42 caracteres (um link
real tem 43) e não batia com nenhum dos links gravados: o e-mail foi lido no celular, mas o link aponta
para `localhost` (que no celular é o próprio celular), então foi copiado à mão e perdeu um caractere.
Um link com tamanho errado agora responde `TOKEN_INCOMPLETO` com a explicação ("foi cortado ao ser
copiado; abra pelo botão do e-mail ou peça outro"), em vez do "inválido" genérico, e o tamanho esperado
(`TAMANHO_TOKEN_ACESSO` = 43, 32 bytes em base64url) é amarrado por teste ao que o e-mail gera. Provado
de ponta a ponta num backend de teste (12 verificações): o link do **primeiro** e-mail funciona mesmo
depois de um reenvio, criar a senha consome todos os links e o login com e-mail e senha funciona. Em
produção o link é um endereço público e clicável em qualquer aparelho, então isso só aparece em teste
local; para testar no celular seria preciso expor o front e a API pelo IP da máquina.

**E-mail do Asaas com o CPF do titular.** O cliente recebeu, além do e-mail da USAI, o e-mail do próprio
Asaas ("Seu pagamento foi confirmado - Fatura ..."), que mostra o **nome e o CPF do titular da conta**
como se ele fosse o vendedor (no sandbox vem marcado "informações fictícias"; em produção seriam os dados
reais). Os clientes passam a ser criados com `notificationDisabled: true` (campo confirmado no sandbox),
pois a USAI já avisa por conta própria, com o recibo e o acesso. **Ainda aparece na página de pagamento
(a fatura)**: o Asaas mostra nome e CPF/CNPJ do titular a quem paga, e isso não dá para desligar. Se a conta
de produção for em CPF, o CPF vira público para todo síndico que pagar; o recomendado é uma conta em CNPJ.
Clientes já criados antes dessa mudança (sandbox) continuam com as notificações do Asaas ligadas.

---

## 2026-10-27: Telas com rolagem própria, filtros e uso da largura toda

**Por quê.** Listas longas (mural, catálogo, locações...) esticavam a página inteira e o conteúdo ficava
espremido no meio em monitor largo.

- **`ListaRolavel`** (`components/ui/ListaRolavel.tsx`): lista com altura limitada à janela e rolagem
  própria, focável por teclado (`role="region"` + `aria-label`). Cabeçalho, filtros e formulários ficam
  sempre visíveis; a página tem a altura da janela e só a lista rola. Aplicada em Catálogo, Mural,
  Locações, Conversas, Síndico (moradores e locações ativas) e comentários do post.
- **`FiltroChips`** (`components/ui/FiltroChips.tsx`): filtro em botões com contagem (`aria-pressed`).
- **Funções novas:** Catálogo busca também por categoria, descrição, fabricante e modelo (antes só o
  título, embora o campo dissesse "categoria, vizinho"), mostra "N itens de M" e "Limpar filtros";
  Locações filtra por situação (Todas / Em aberto / Ativas / Encerradas); Mural filtra por Avisos ou
  Pedidos de ajuda; Síndico busca moradores por nome, e-mail ou apartamento.
- **Largura:** o `AppShell` (cabeçalho + conteúdo) passou de `max-w-5xl` para `max-w-screen-2xl`; o
  catálogo ganhou mais colunas em telas grandes. Páginas de leitura (Mural, Conversas) seguem estreitas
  de propósito.

**Testes:** +8 (255 no front); build, lint e prettier limpos. Medido no navegador a 1600×900: página
com 900px de altura (sem rolagem da página), listas rolando por dentro.

---

## 2026-10-27: Logo da USAI e tela inicial redesenhada

**O que foi feito.** A tela inicial parecia "básica" e o sistema ainda usava o logo padrão do Vite no
favicon. Foi criada uma marca própria e a landing foi refeita.

- **Marca:** quadrado terracota com o canto recortado (assinatura visual do sistema), uma casa (o
  condomínio) e um "U" (USAI) que acolhe um ponto verde (o item compartilhado). Componente
  `components/ui/MarcaUsai.tsx` (SVG, cores fixas pra funcionar no claro, no escuro e na impressão).
- **`Logo.tsx`** passou a mostrar a logo oficial enviada pelo Admin (Identidade) **ou**, enquanto não
  houver, símbolo + nome "USAI". Vale pro cabeçalho, login, landing e documentos.
- **Favicon** (`public/favicon.svg`) trocado pelo símbolo.
- **Landing** (`pages/LandingPage.tsx`): hero com cartões de exemplo (marcados como "Exemplo
  ilustrativo"), "Como funciona" em 4 passos, 6 recursos com ícones, faixa de chamada final e rodapé
  com o texto institucional configurável.
- **Arquivos de logo** em `docs/identidade/` (símbolo SVG/PNG e versões completas claro/escuro) pra
  subir em Admin → Identidade, se quiser, ou usar nos slides do TCC.

**Testes:** `Logo.test.tsx` cobre a marca padrão, o nome acessível e a landing (247 testes no front,
build/lint/prettier limpos).

---

## 2026-10-27: Retirada e devolução com termo de responsabilidade, aceite, documento e logo oficial

**O que foi feito** (pedido de "versão corporativa" do sistema, adaptado ao que a USAI é: aluguel de
itens entre vizinhos). Decidido com o usuário: o termo e o aceite entram **na retirada e na
devolução** do item; campos que não existem aqui (matrícula, setor, filial, cargo, patrimônio) **não
foram inventados**, usamos o que o sistema realmente tem (nome, unidade, condomínio, CPF
mascarado; item, fabricante, modelo, nº de série, acessórios).

- **Retirada e devolução (`Movimentacao`)**: quem ENTREGA registra (estado de conservação, conferência
  dos acessórios, observações); quem RECEBE confere e aceita. Retirada: o dono entrega e o locatário
  aceita → locação `EM_ANDAMENTO`. Devolução: o locatário entrega e o dono aceita → `CONCLUIDA` (os
  dois estados que antes não tinham transição). A mudança da locação e o aceite acontecem na mesma
  transação, com compare-and-swap: falhou um passo, nada é gravado. Cada documento tem número
  sequencial (`USAI-2026-000123`) e guarda uma **foto** (snapshot) de item, partes e locação no
  momento do registro, o documento não muda se o perfil ou o item mudarem depois.
- **Termos configuráveis e versionados (`TermoResponsabilidade`)**: um por tipo de operação, com
  cláusulas e declarações de aceite. Editar cria uma NOVA versão (as anteriores ficam intactas
  porque os aceites apontam pra elas). Todo termo nasce como **modelo, pendente de revisão
  jurídica**, o documento imprime esse aviso, e só passa a "aprovado" quando o Admin registra a
  revisão (quem e quando, auditado). Os textos iniciais são modelos, não cláusulas validadas.
- **Aceite obrigatório (`AceiteTermo`)**: nenhuma caixa vem marcada; só conclui com TODAS as
  declarações marcadas e a **senha reconfirmada** (assinatura eletrônica simples). Fica gravado o
  texto exato de cada declaração, a versão do termo, data/hora, quem aceitou, uma assinatura
  SHA-256 e IP/navegador (esses dois só o Admin vê, na auditoria). Senha errada responde 403, não
  401, porque o cliente HTTP trata 401 como sessão expirada e derrubaria o login.
- **Imutabilidade e rastreabilidade**: concluído, o documento não muda. Correção = **retificação**
  (evento no histórico, com autor e data, a outra parte é avisada). Um **hash de integridade**
  (SHA-256 do documento inteiro + aceite) é gravado ao concluir e reverificado a cada abertura:
  adulterar o banco "em silêncio" faz o documento mostrar "divergência" (testado). Histórico só
  acrescenta (criada, aceite, cancelada, retificação). Permissões: só as duas partes veem; o Admin
  audita (lista de documentos recentes); síndico e estranhos recebem 403.
- **Documento (`/movimentacoes/:id`)**: logo, nº, partes, item identificado, locação (período,
  valor, finalidade), operação (data/hora, estado, acessórios), termo completo com status de
  revisão, declarações aceitas, assinaturas, histórico e integridade, com CSS de impressão A4
  (paginação "Página X de Y" no canto e rodapé institucional). Imprime/salva em PDF pelo navegador.
- **Identificação do bem e finalidade**: o item ganhou fabricante, modelo, nº de série e lista de
  acessórios (todos opcionais, sem quebrar os itens existentes); o pedido de locação ganhou a
  finalidade do uso.
- **Logo e identidade**: o Admin envia a **logo oficial** (PNG/JPEG/WebP, até 2 MB, SVG recusado por
  poder carregar script; guardada como veio, sem recompressão, proporção preservada) e edita nome e
  rodapé institucionais. Aparece no cabeçalho, na tela inicial, no login e nos documentos/recibos;
  sem logo, vale a marca padrão da USAI. Trocar vale pro app inteiro na hora.
- Painel do Admin ganhou as abas **Documentos** (auditoria), **Termos** e **Identidade**.
- A migration `movimentacoes_termos` cria as tabelas e já semeia o termo v1 de retirada e de
  devolução; outra migration corrigiu um desvio de chave estrangeira do chat (drift zerado).
- Roteiro E2E ampliado: **139/139** verificações (inclui adulteração no banco detectada, aceite
  incompleto/senha errada, permissões, retificação, cancelamento, logo e termos).

---

## 2026-10-27: Taxa de 10% para o síndico, livro-razão e extrato detalhado de qualquer usuário

**O que foi feito** (ideia do usuário: "o valor de 10% do condomínio poderia ir tudo para a conta do
síndico, tudo registrando de onde veio e pra que taxa; extrato detalhado de qualquer usuário").
Decisões combinadas antes: síndicos ativos do condomínio **dividem** a taxa e, sem síndico ativo, ela
fica com a USAI; aluguéis já pagos **não mudam** (taxa deles segue com a plataforma); o Admin vê o
extrato de qualquer usuário e cada um vê o seu.

- **Livro-razão (`Lancamento`, migration `lancamentos`):** cada centavo que entra numa conta vira um
  lançamento imutável com origem (locação), base de cálculo, taxa aplicada (%) e, nas comissões, em
  quantos síndicos foi dividida. Tipos: `ALUGUEL_RECEBIDO` (dono, líquido), `COMISSAO_CONDOMINIO`
  (síndico), `TAXA_PLATAFORMA` (USAI, conta com `userId` nulo) e `ALUGUEL_PAGO` (locatário,
  informativo, não mexe no saldo). A migration fez o backfill dos 9 aluguéis já pagos, conferido:
  saldos de todas as contas **idênticos antes e depois**.
- **Confirmação do pagamento** (`registrarPagamentoConfirmado`, dentro da MESMA transação que passa
  a locação a PAGA, ou tudo é gravado, ou nada): dono recebe o líquido; síndicos ativos do
  condomínio recebem os 10% divididos em centavos (o que sobra vai, um centavo por vez, pros
  primeiros, a soma fecha sempre); sem síndico a taxa fica com a USAI e o texto do lançamento
  diz isso. O síndico recebe a notificação "Você recebeu uma comissão do condomínio".
- **Saldo e extrato agora vêm do livro-razão:** saldo = soma dos lançamentos que afetam saldo −
  saques. O extrato mostra de onde veio cada entrada (item, dono, quem pagou), a base, o percentual,
  a divisão entre síndicos e a parte de quem consulta; o locatário vê quanto do que pagou foi para o
  dono e quanto foi taxa. O síndico passou a ter **Saques** no menu (pede saque da comissão no
  mesmo fluxo: Admin aprova e paga) e o recibo de comissão.
- **Admin:** nova aba **Extratos**, busca por nome/e-mail e abre o extrato completo de qualquer
  usuário (chave PIX sem máscara, é o que ele precisa pra pagar) e a **Conta da USAI** (tudo que
  ficou com a plataforma, linha a linha). O resumo financeiro ganhou "taxa repassada aos síndicos"
  e "taxa retida pela USAI". Endpoints só do Admin: `GET /api/admin/usuarios`,
  `/usuarios/:id/extrato` e `/plataforma/extrato` (síndico e morador recebem 403).
- Roteiro E2E (`.scratch/e2e_usai.cjs`) ampliado: **92/92** verificações (inclui divisão entre os 2
  síndicos do Jardim Europa, saldo do síndico, extrato do síndico, extrato de terceiros pelo Admin e
  as permissões).

---

## 2026-10-19: Chat da locação unificado na página de Conversas

**O que foi feito** (pedido: "mensagens de locação tudo centralizado na página de conversas"):

- **Um só chat.** O chat da locação deixou de ser um módulo à parte (`Mensagem`, `/locacoes/:id/mensagens`,
  eventos de socket próprios, `MensagensLocacaoPage`) e virou uma `ConversaPrivada` com `locacaoId`
  único e sem expiração (`expiraEm` passou a ser opcional; a do Mural continua expirando em 7 dias).
  Participante A = locatário, B = dono do item. A conversa é criada na primeira vez que alguém clica
  em **Mensagens** na tela de Locações (`POST /api/conversas/locacao/:locacaoId`, `upsert` por
  `locacaoId`, só locatário e dono, só dentro do condomínio). Mural e locações aparecem juntos em
  Conversas, a mais recente primeiro, cada uma com a sua legenda ("Locação · Projetor" ou "expira em
  X dias").
- **Migration `chat_unificado`** converte o histórico: cria uma conversa por locação que tinha
  mensagens, copia as mensagens com os mesmos ids/datas e só então apaga a tabela antiga. Conferido
  no banco local (mensagens antigas aparecem na conversa nova).
- **Não lidas gravadas no servidor** (`participanteALidoEm`/`participanteBLidoEm`): a bolinha do
  menu e o contador por conversa não somem mais ao recarregar a página nem trocam de aparelho. Abrir
  a conversa ou receber mensagem com ela aberta marca como lida; quem envia já fica "lido" até ali.
  Novos: `GET /api/conversas/nao-lidas` e `POST /api/conversas/:id/lida`.
- **Sonar S6848** (3 pontos): cliques em elementos que não são botões saíram, o card clicável
  ignora cliques em controles internos e o fundo do modal só fecha quando o clique é nele mesmo.

---

## 2026-10-19: Saque em duas etapas (aprovar → marcar como pago), detalhes e recibo

**O que foi feito** (feedback do uso do painel do Admin):

- **Novo estado `PAGO` no saque** (migration `saque_pago`, com `pagoEm`): `PENDENTE → APROVADO |
  REJEITADO`, e `APROVADO → PAGO` quando o Admin confirma que transferiu o PIX
  (`SaquesService#marcarComoPago`, `POST /api/saques/:id/pagar`, só Admin, auditado como
  `PAGAR_SAQUE`). Antes "aprovado" e "pago" eram a mesma coisa, então o usuário não sabia se o
  dinheiro já tinha saído. O valor continua saindo do saldo **na aprovação** (APROVADO e PAGO
  contam como sacado), assim ninguém saca duas vezes enquanto o PIX não foi feito. A migration
  converte os APROVADO antigos em PAGO (eram "aprovado e pago por fora").
- **O usuário vê a atualização:** o extrato ganhou o estado "Aprovado, PIX a caminho", o card
  "Aprovado, a caminho" e, quando pago, "PIX enviado em …"; ao marcar como pago ele recebe a
  notificação `SAQUE_PAGO` (com a chave mascarada).
- **Painel do Admin** em três blocos: pendentes (Aprovar/Rejeitar) → "Aprovados, aguardando o PIX"
  (botão **Marcar como pago**) → histórico (pagos e rejeitados). O resumo ganhou "A pagar" e "Saques
  pagos".
- **Bug do nome sumindo:** depois de aprovar/rejeitar, o card perdia o nome de quem pediu (a
  resposta da ação não trazia o solicitante e o front trocava o item). Agora toda ação do Admin
  devolve nome e condomínio.
- **Listas com rolagem** (altura máxima): histórico do Admin, extrato do usuário, "o que você
  pagou" e notificações, a página não cresce mais conforme o histórico aumenta.
- **Cards clicáveis → detalhes e recibo:** clicar num card (ou no botão "Ver detalhes e recibo",
  que existe pro teclado) abre uma janela com todos os dados, solicitante, condomínio, chave PIX
  (completa pro Admin, mascarada pro usuário), valores, período do aluguel, datas de cada etapa,
  motivo da rejeição e protocolo. "Gerar recibo" usa a impressão do navegador com CSS de impressão
  (só o bloco do recibo sai; dá pra salvar em PDF), sem biblioteca extra. Só operações concluídas
  (saque pago, aluguel recebido, aluguel pago) viram "recibo"; as demais oferecem "Imprimir
  detalhes". Disponível no Admin e no extrato do usuário.

---

## 2026-10-19: Notificações persistidas (sino + página)

**O que foi feito** (pedido dos testes de usabilidade: "para cada ação uma notificação"):

- **Modelo `Notificacao`** (migration `notificacoes`): usuário, tipo, título, mensagem, link pra tela
  do assunto, lida/não lida. Módulo novo `modules/notificacoes` com `NotificacoesService`
  (`notificar`, `notificarAdmins`, `listar`, `marcarComoLida`, `marcarTodasComoLidas`,
  `removerAntigas`) e rotas `GET /api/notificacoes`, `POST /:id/lida`, `POST /ler-todas`, tudo
  escopado pelo `userId` do token (notificação alheia responde 404, sem vazar que existe).
- **Quem avisa quem:** pedido de locação → dono; aprovada/recusada → locatário; pagamento confirmado
  → locatário **e** dono (com líquido e taxa); concorrente cancelado por outro pagamento →
  locatário; pagamento órfão → locatário (reembolso) + Admins (reembolso manual); saque pedido →
  Admins; saque aprovado/rejeitado (com motivo) → quem pediu; resposta no seu post do Mural → autor.
- **Tempo real:** ao gravar, o service emite `notificacao:nova` na sala pessoal do usuário (mesma
  infra de `locacao:atualizada`). No front, `useNotificacoes` (provido pelo `AppShell` via contexto)
  alimenta o **sino** com contador no header (vale pra morador, síndico e Admin), um **toast** e a
  página `/notificacoes`; a tela de Locações recarrega sozinha quando chega aviso de locação/pagamento.
- **Decisão de robustez:** `notificar` nunca lança, falha vira log. Notificação é consequência de
  uma ação que já deu certo (um pagamento confirmado não pode "desfazer" porque o aviso falhou).
  Os services recebem o `NotificacoesService` como dependência opcional, então os testes antigos
  continuam rodando sem ele e os novos verificam cada aviso (quem, tipo, texto).
- **Retenção:** varredura de hora em hora apaga notificações com mais de 30 dias (`server.ts`).

**Onde mexer a seguir:** unificar o chat da locação na página de Conversas (combinado, não iniciado).

---

## 2026-10-19: Pós-M3: conferência periódica, taxa gravada por locação e extrato de saques

**O que foi feito** (depois de testar o fluxo de pagamento de verdade no sandbox do Asaas):

- **Conferência periódica das cobranças** (`PagamentosService.conferirPendentes`, disparada a cada
  30 s em `server.ts` só quando `ASAAS_API_KEY` existe): o webhook do Asaas exige URL pública e o
  ambiente de desenvolvimento (firewall corporativo) não deixa abrir túnel, então o backend também
  pergunta ao Asaas (`GET /payments/{id}`) o status das cobranças pendentes das últimas 2 semanas.
  É idempotente com o webhook, `confirmarPagamento` já ignorava confirmações repetidas, então no
  deploy os dois convivem: webhook dá a resposta imediata, a conferência é a rede de segurança.
- **Taxa e líquido gravados em cada locação** (`Locacao.taxaPlataforma` / `valorLiquido`, migration
  `locacao_taxa_valor_liquido` com backfill das locações já pagas): antes o saldo era
  `valorTotal × 0,9` recalculado na hora; se a taxa mudasse um dia, o histórico mudaria junto. Agora
  `calcularRepasse` (em `locacoes.service.ts`) fixa o valor no momento da confirmação do pagamento e
  o saldo é a soma de `valorLiquido`, extrato e saldo sempre batem porque usam o mesmo número.
- **Extrato de saques** (`GET /api/saques/extrato`, `SaquesService.extrato`, tela `SaquesPage`):
  mostra de forma direta o que **entrou** (aluguel recebido, quem pagou, bruto − taxa = líquido), o
  que **saiu** (saques: em análise / pago / rejeitado com motivo, chave PIX mascarada) e, numa seção
  à parte, o que a pessoa **pagou** como locatária (com aviso quando o pagamento está aguardando
  reembolso). Só nome do outro morador (mesmo condomínio, por definição da locação), nunca e-mail,
  CPF ou chave PIX de terceiros. Admin ganhou o **histórico** de saques já processados (data da
  decisão e motivo) ao lado da fila de pendentes.
- **Sonar S9383** (promessas soltas em `socket.ts` e `PerfilPage.tsx`) corrigido com `await`/`void`.

**Por que essas decisões:** o extrato era o pedido direto dos testes de usabilidade ("quem pagou,
quem recebeu, de forma clara"), a conta por extenso em cada linha evita a pergunta "por que
recebi R$ 90 de um aluguel de R$ 100?". Guardar o líquido na locação em vez de recalcular é a mesma
lógica de nota fiscal: o valor do momento da venda não muda retroativamente.

**Onde mexer a seguir:** notificações persistidas (sino + página) e unificação do chat da locação
na página de Conversas, combinadas com o usuário, ainda não implementadas.

---

## 2026-09-28: M3: pagamento da locação via Asaas (PIX)

**O que foi feito:** a peça que faltava do fluxo de locação, o locatário paga o valor via PIX pelo
Asaas, e só quando o pagamento é confirmado (webhook) a locação trava de vez. Combinado com o usuário
antes de implementar, porque envolvia decisões de produto que a RFC deixava em aberto:

- **Quem recebe o dinheiro primeiro:** o Asaas cobra o locatário e o valor fica na conta da
  plataforma, o dono recebe pelo saque manual que já existia (`SaquesService`), sem usar
  split/subconta automática do Asaas. Menor escopo, e o síndico/Admin já tinham esse fluxo pronto.
- **Taxa da plataforma: 10%**, descontada só no cálculo do saldo sacável
  (`TAXA_PLATAFORMA` em `locacoes.service.ts`), o locatário paga o valor cheio da locação, o dono
  vê 90% disponível pra saque. `saques.service.ts` arredonda pra centavos antes de aplicar os
  descontos de saques já aprovados/pendentes, pra não vazar erro de ponto flutuante.
- **RN de disponibilidade nova (a mais delicada):** uma locação `APROVADA` sem pagamento **não
  trava mais o período**, `STATUS_QUE_OCUPAM_PERIODO` passou a ser só `['PAGA', 'EM_ANDAMENTO']`.
  Isso deixa vários moradores pedirem (e o dono aprovar) o mesmo item no mesmo período; só quando
  o primeiro paga é que o item trava de verdade. Nesse momento, toda outra locação
  `PENDENTE`/`APROVADA` do mesmo item com período sobreposto é cancelada automaticamente, dentro
  da mesma transação que confirma o pagamento, usando `updateMany` condicionado ao status atual
  como trava de corrida (equivalente a um `UPDATE ... WHERE status = 'APROVADA'`, que o MySQL já
  serializa sozinho, sem `SELECT FOR UPDATE` nem SQL cru). Testado de verdade: duas locações
  concorrentes pro mesmo item/período, aprovei as duas, "paguei" uma via webhook simulado, a outra
  cancelou sozinha, sem eu precisar programar isso manualmente pro teste, só a lógica normal
  reagindo.
- **Pagamento "órfão":** se duas pessoas pagam quase ao mesmo tempo, quem perde a corrida tem o
  `Pagamento` marcado como `PAGO_ORFAO` (mais um log de erro) em vez de estorno automático, não
  tem integração com a API de reembolso do Asaas nesta versão; é resolvido manualmente pelo Admin.
  Decisão consciente pra não superdimensionar o escopo de uma entrega de TCC.
- **CPF do morador:** o Asaas exige CPF pra criar o cliente da cobrança, estendida a edição de
  perfil que já existia (nome/apartamento) pra também aceitar CPF, normalizando pontuação e
  validando duplicidade antes de salvar.
- **Atualização em tempo real, sem botão de atualizar:** pedido explícito do usuário, nada de
  "aperte aqui pra ver se já pagou". O webhook do Asaas roda fora do ciclo de request/response de
  quem está com a tela aberta, então reaproveitei a sala pessoal de socket já usada pelas
  notificações de conversa (`usuario:<id>`, ver `realtime/emitter.ts`, novo, dá pro webhook avisar
  um usuário específico sem precisar conhecer a instância do socket.io criada em `server.ts`) pra
  avisar tanto quem pagou (`PAGA`) quanto quem perdeu a corrida (`CANCELADA`), instantâneo, testado
  ao vivo no navegador com duas abas logadas como usuários diferentes.
- **Módulo novo** `apps/backend/src/modules/pagamentos/`: `asaas.client.ts` (wrapper fino sobre a
  API REST do Asaas, só PIX, sandbox por padrão), `pagamentos.service.ts` (`criarCobranca`,
  idempotente, e `confirmarPagamento`, chamado pelo webhook), rota de cobrança aninhada em
  `POST /api/locacoes/:id/pagamento` (mesmo padrão do chat de locação) e webhook público em
  `POST /api/webhooks/asaas`, sem `authGuard` (quem chama é o Asaas) e sempre respondendo 200
  depois de validar o token, mesmo se algo falhar por dentro, pra não virar retry-storm.

**Por que essas decisões:** a RN de disponibilidade (não travar por `APROVADA`) foi pedido direto
do usuário depois de eu propor um modelo mais simples (expira em 48h), o modelo escolhido é mais
realista pro caso de uso (vários vizinhos interessados no mesmo fim de semana) e não exige um job
periódico de expiração. A atualização automática por socket, e não por botão, também foi correção
direta do usuário, a primeira proposta (botão "Atualizar") foi rejeitada explicitamente.

**Verificação:** `npm run build:backend`/`build:frontend`, ESLint (zero warnings), 275 testes de
backend (29 suítes, 98.83% de cobertura de statements) e 116 de frontend (20 suítes) passando,
inclui testes novos cobrindo o `AsaasClient` (mockando `fetch`), o `PagamentosService` (cliente e
cobrança idempotentes, corrida entre locações concorrentes, pagamento órfão), o webhook (token
errado, evento desconhecido, corpo malformado, confirmação de verdade) e a mudança de regra de
disponibilidade em `locacoes.service.ts`/`sindico.service.ts`. QA manual ponta a ponta: cadastrei
CPF pelo perfil, publiquei um item, duas contas pediram o mesmo período e o dono aprovou as duas,
cliquei em "Pagar agora" (o Asaas sandbox real rejeitou por falta de API key configurada, erro
tratado direitinho na tela, sem quebrar nada), simulei a confirmação do Asaas via webhook direto
pra validar a lógica de corrida sem precisar de credencial de sandbox de verdade, e conferi as duas
abas (quem pagou e quem perdeu a corrida) atualizando sozinhas. Saldo do dono conferido: R$ 100 de
locação vira R$ 90 sacável, batendo com a taxa de 10%.

**Pendente:** `ASAAS_API_KEY` e `ASAAS_WEBHOOK_TOKEN` de verdade (conta sandbox do Asaas ainda
precisa ser criada), sem isso, o fluxo de criar cobrança de verdade não funciona fora deste teste
simulado, só a lógica de confirmação (testada via webhook direto). Deploy em nuvem continua
explicitamente adiado, combinado à parte.

---

## 2026-09-18: Editar perfil, síndico remove morador, notificação em tempo real nas conversas

**O que foi feito:** três pedidos do usuário depois de revisar o produto: dar pro morador uma forma de
editar nome/apartamento, dar pro síndico o poder de remover um morador quando precisar, e fazer chegar
uma notificação quando alguém manda mensagem numa conversa privada, hoje o morador só via mensagem
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
  mesmo condomínio antes de desativar, histórico (itens, locações, mensagens) fica intacto, só bloqueia
  login futuro e some de `listarMoradores`. `SindicoPage.tsx` ganhou botão "Remover" com confirmação
  (`window.confirm`, mesmo padrão já usado no Mural pra apagar post).
- **Notificação em tempo real nas conversas**: reaproveitei o socket já existente do chat
  (`lib/socket.ts`) em vez de criar polling, hook novo `useConversaNotifications.ts`, chamado uma vez
  no `AppShell.tsx` (não mais só dentro da página de conversa), então o socket fica vivo em toda a
  sessão autenticada. Mostra um badge vermelho no menu "Conversas" e um toast temporário (5s) com o
  nome de quem mandou, sem precisar estar com o chat aberto.
  - **Bug pego na hora do teste manual, não hipotético:** o design inicial só entrava na sala
    socket.io de cada conversa que já existia no momento em que o hook montava
    (`socket.emit('conversa:entrar', ...)` pra cada conversa de `listarMinhasConversas()`). Testei
    simulando um segundo morador abrindo uma conversa **nova** com alguém que já estava logado e
    navegando pelo site, a notificação não chegava, porque quem recebe nunca tinha entrado na sala
    daquela conversa (ela não existia ainda quando o hook rodou). Corrigido no backend
    (`apps/backend/src/realtime/socket.ts`): todo socket entra automaticamente numa sala pessoal
    (`usuario:<id>`) ao conectar, e o envio de mensagem privada agora transmite tanto pra sala da
    conversa quanto pra sala pessoal do destinatário (`ConversasService.buscarOutroParticipanteId`,
    novo). Sem isso, a primeira mensagem de uma conversa nova nunca notificava ninguém em tempo real,
    só depois de um F5. Testado com um script Node usando `socket.io-client` simulando o segundo
    usuário mandando mensagem sem nunca ter entrado na sala, e confirmado que o badge aparece mesmo
    assim.

**Bug de layout mobile pego no QA manual:** o botão "Editar" novo no card de identidade do
`PerfilPage.tsx` esqueceu o `fullWidth={false}` (o `Button.tsx` é `width: 100%` por padrão), em
telas de 375px isso espremia a coluna de nome/e-mail (`min-w-0 flex-1`) até `width: 0`, sumindo com o
texto por completo (o card ficava só com avatar + badge + botão). Só apareceu testando em viewport
mobile de verdade, não no desktop. Corrigido adicionando `fullWidth={false}`, igual já era feito no
botão "Remover" do síndico e nos botões Salvar/Cancelar do próprio formulário de edição.

**Verificação:** `npm run build:backend`/`build:frontend`, ESLint (backend e frontend, zero warnings),
235 testes de backend (25 suítes, 98.78% de cobertura de statements) e 113 de frontend (20 suítes)
passando, inclui teste novo em `tests/realtime/socket.test.ts` cobrindo exatamente o cenário do bug
acima (destinatário recebe aviso mesmo sem ter entrado na sala). QA manual no navegador: cadastrei
3 moradores de teste novos, publiquei itens por 2 deles e confirmei no catálogo que aparecem
misturados (RF de isolamento por condomínio continua OK, item de outro condomínio não vazou). Editei
perfil e confirmei persistência direto no MySQL. Removi um morador de teste pelo painel do síndico e
confirmei que o login dele passou a ser rejeitado. Simulei uma conversa nova entre dois moradores só
por API/socket (sem UI) e confirmei o badge chegando ao vivo no outro morador, que estava no Mural, não
na tela de Conversas.

**Pendente:** trocar o logo pequeno do header (`AppShell.tsx`, hoje um quadrado `notch-sm` laranja) pela
logo de verdade que o usuário mandou colada no chat, não foi possível localizar o arquivo de imagem no
disco (procurado em `AppData\Local\Temp` e `Downloads`), preciso que ele reenvie como anexo de arquivo.

---

## 2026-09-17: Identidade visual v2.0: "o mural da portaria, não o dashboard"

**O que foi feito:** com a meta de cobertura fechada e deploy/banco combinados de deixar pra depois
da orientação da semana que vem, o pedido direto foi outro: "está tudo muito simples... preciso que
você inove nesses layout, mude tudo". O visual anterior (paleta `slate`/`brand` genérica, cantos
todos arredondados, spinner circular) era o "SaaS corporativo padrão de IA" que o usuário queria
evitar. Em vez de eu mesmo desenhar, o processo foi: escrevi um briefing de design detalhado
(personalidade da marca, paleta, tipografia, motivo visual assinatura, estados vazios com
personalidade) pra colar no Claude Design, e implementei fielmente o sistema que veio de volta.

- **Conceito:** um mural físico de avisos de condomínio, acolhedor e confiável, em vez de um
  dashboard corporativo. Cores terracota/jade sobre papel, não azul/cinza de SaaS.
- **Tokens** (`apps/frontend/tailwind.config.ts`, reescrito): paleta nomeada por analogia física,
  `paper` (fundo/superfície), `ink` (texto), `barro` (primária, terracota), `jade` (secundária,
  sucesso), `mostarda` (aviso), `carmim` (erro), `roxo` (papel extra de avatar). Tipografia: Zilla
  Slab (`font-display`, títulos/preços), Public Sans (`font-sans`, corpo), Space Mono (`font-meta`,
  metadados/timestamps/labels em uppercase tracked), trocadas no `index.html`.
- **Motivo visual assinatura, "canto recortado":** um plugin Tailwind próprio (`matchUtilities`)
  gera a utility `notch`, que corta o canto inferior direito a 45° via `clip-path`. Aplicado a
  quase tudo que "segura conteúdo": cards, botões, avatares, badges, inputs, fotos, é o que dá
  identidade ao produto em vez de mais um `rounded-xl` genérico.
- **Sem spinner circular no produto:** todo carregamento agora usa 3 pontos pulsando
  (`Spinner.tsx`, `animate-usaiPulse`), o mesmo estilo do indicador "digitando" que já existia no
  chat.
- **Avatares quadrados** (`components/ui/Avatar.tsx`, novo, extraído do `PostCard` porque passou a
  ser reusado em 4 lugares): iniciais em Zilla Slab, cor de fundo escolhida por hash do nome entre
  4 papéis de cor fixos (barro/jade/mostarda/roxo), mesma pessoa sempre com a mesma cor.
  Card virou um "sanduíche de duas camadas" (`Card.tsx`): moldura fina em `paper-line` por baixo,
  conteúdo em `paper-surface` por cima, cada uma com seu próprio recorte, dá o efeito de moldura
  sem usar `border` (que não combina bem com `clip-path`).
  Reescrito nos ~35 arquivos: reescrevi ou fizeram parte da leva `tailwind.config.ts`, `index.css`,
  todo `components/ui/*`, e toda página/feature do frontend, Mural, Conversas, Catálogo, Locações,
  Saques, painéis do Síndico e do Admin, Auth/Landing. Estados vazios ganharam texto de primeira
  pessoa ("O mural tá em branco hoje" em vez de "Nenhum post ainda").

**Por que essas decisões:** o playbook não exige nada visual além de "usabilidade", a decisão de
ir além do mínimo foi puramente do usuário, que queria um produto que parecesse pensado e não
gerado. Optar por um motivo geométrico único (o recorte) em vez de só trocar cores é o que separa
"reskin de paleta" de "sistema de design com identidade", foi literalmente o pedido ("inove...
mude tudo"). A landing page também teve a lista de recursos ajustada: tirei a menção a "pagamento
integrado/PIX" (M3/Asaas ainda não existe) e coloquei "conversa privada" no lugar, que é recurso
real já no ar, evita prometer o que o produto ainda não entrega pra quem visita o link.

**Verificação:** `npm run build:frontend`, ESLint e os 104 testes de frontend (19 suítes) passando,
2 testes precisaram de ajuste porque a cópia dos estados vazios mudou de propósito
(`MuralPage.test.tsx`, `CatalogoPage.test.tsx`). QA visual manual no navegador (desktop e mobile
375px), logado como morador, síndico e admin (promovido/revertido via Prisma direto pra checar os 3
painéis), Mural, Conversas + chat, Catálogo + item + publicar, Locações, Saques, Síndico, Admin,
Login/Cadastro/Landing.

**Onde mexer a seguir:** deploy em nuvem, banco de produção e M3 (Asaas) seguem parados até a
orientação da semana que vem, como já combinado. Sistema de design documentado só no código por
ora, se sobrar tempo depois da orientação, vale um `docs/design-system.md` resumindo os tokens
pra não precisar reler o `tailwind.config.ts` pra lembrar os nomes.

---

## 2026-09-16: Cobertura de testes: fechando a meta de 75% do backend

**O que foi feito:** com o núcleo de engenharia e o frontend completos, faltava só a única meta
numérica obrigatória do playbook (75% backend). A cobertura estava em ~72% porque os
`*.controller.ts` de praticamente todo módulo só eram exercitados indiretamente pelos
`*.service.test.ts` (que mockam o *service* inteiro, então nunca rodam o parsing do Zod, a leitura
de `req.auth` nem o `res.status().json()` do controller de verdade) e pelos `*.routes.test.ts` já
existentes (que só cobrem o caminho de rejeição do RBAC, `requireRole`, sem nunca chegar no corpo
do controller).

- **Abordagem:** um `<módulo>.controller.test.ts` por módulo, via `supertest` batendo na app real
  (`createApp()` de `@/app`) com JWTs assinados na hora, mas com `jest.mock('@/common/prisma', ...)`
  no topo do arquivo substituindo o banco por um objeto só com os métodos Prisma realmente usados
  naquele módulo (`jest.fn()`). Isso exercita o fluxo inteiro request → `authGuard` →
  Zod `.parse()` → controller → service (de verdade, não mockado) → `res.json()` → `errorHandler`,
  sem precisar de banco real nem duplicar a lógica que os testes de service já cobrem.
- **Módulos cobertos:** `auth`, `itens`, `locacoes`, `mensagens` (aninhado em
  `/locacoes/:id/mensagens`), `mural`, `conversas`, `saques`, `sindico`, `admin`, sucesso, erro de
  validação (400), não encontrado (404) e proibido (403) conforme o caso de cada módulo.
- **Resultado:** cobertura total do backend saiu de **~72% para ~98,7%** (statements), muito acima
  da meta de 75%. 213/213 testes passando (25 suítes), eram 141 antes desta rodada.

**Onde mexer a seguir:** meta de cobertura do playbook fechada. Combinado com o usuário
(2026-09-16): deploy em nuvem e o banco em produção ficam pra depois da orientação da semana que
vem, por ora, seguir só com polimento de usabilidade/layout no frontend. M3 (Asaas) segue pra fase
final.

---

## 2026-09-16: Conversas privadas a partir do Mural (chat efêmero, 7 dias)

**O que foi feito:** pedido direto de uso, "no mural tem que ter a opção de poder conversar com
uma pessoa, abrir um chat e deixar o chat lá por no máximo 7 dias". Além do comentário público, dá
pra abrir um chat 1:1 com o autor de um post **ou de um comentário**, direto do Mural.

- **Modelagem:** `ConversaPrivada` (dois participantes nomeados via `@relation`, mesmo padrão do
  `Locatario` em `Locacao`, mais `postOrigemId?` opcional referenciando o post que originou o
  chat) e `MensagemPrivada`. Migration `20260916143115_conversas_privadas_mural`.
- **Efêmero por design, no máximo 7 dias, apagado de vez (não só ocultado):** `expiraEm` é
  gravado na criação (`createdAt + 7 dias`) e **nunca atualizado**; toda operação do
  `ConversasService` chama `expirarAntigas(condominioId)` primeiro (`deleteMany` das conversas
  vencidas daquele condomínio, cascade apaga as mensagens junto). Como isso só limpa quando
  alguém mexe no recurso, `server.ts` também roda uma varredura global a cada hora
  (`setInterval` fora do `app.ts`, que precisa ficar sem efeitos colaterais pros testes com
  supertest), garante a exclusão mesmo que ninguém mais volte a acessar.
- **Sem duplicar conversa:** `abrirOuContinuar` procura uma conversa ativa já existente entre os
  dois (nos dois sentidos) antes de criar uma nova, abrir o chat a partir de um post diferente
  com a mesma pessoa cai na mesma conversa.
- **Backend** (`apps/backend/src/modules/conversas/`), `POST /api/conversas` (abre/continua,
  `usuarioId` + `postOrigemId?`), `GET /api/conversas` (minhas, com a última mensagem via
  `_count`-like `include` pra preview), `GET /api/conversas/:id`, `GET/POST
  /api/conversas/:id/mensagens`. Tempo real reaproveita o **mesmo servidor de WebSocket** do chat
  de locação (`realtime/socket.ts`), salas `conversa:<id>` ao lado de `locacao:<id>`, eventos
  `conversa:entrar` / `conversa:mensagem:enviar` / `conversa:mensagem:nova`.
- **Frontend**, `ConversarButton` (componente compartilhado, variantes ícone/texto) aparece no
  `PostCard` (autor do post) e no `PostDetalhePage` (autor do post + autor de cada comentário),
  sempre exceto pra si mesmo. `MinhasConversasPage` (nova, nav "Conversas") lista as conversas
  ativas com prévia da última mensagem e `formatDiasRestantes` ("expira em N dias"; `lib/format.ts`).
  `ConversaPage` é o chat em si, mesmo padrão do `MensagensLocacaoPage` (histórico via REST,
  envio/recebimento ao vivo via socket), com um segundo par `createConversaSocket`/tipos em
  `lib/socket.ts`.
- **Buscar morador direto (sem precisar passar pelo Mural):** pedido de acompanhamento, às vezes
  não tem um post/comentário pra ancorar a conversa, só quer falar com alguém específico do
  condomínio. `GET /api/conversas/usuarios` (`conversas.service.ts#listarUsuariosDoCondominio`)
  lista todo mundo do condomínio (exceto quem busca); registrado **antes** de `/:id` no router
  pra não ser capturado como parâmetro. No `MinhasConversasPage`, um campo de busca filtra esse
  cache local por nome (mesmo padrão client-side do filtro de categoria no `CatalogoPage`, o
  condomínio é pequeno, não precisa de busca no servidor a cada tecla) e clicar num resultado
  chama `abrirOuContinuar` normalmente.
- **Testes:** backend, `conversas.service.test.ts` (abrir novo vs. reaproveitar conversa
  existente, resolução do "outro participante" nos dois sentidos, admin precisa informar
  `condominioId` explicitamente, bloqueio de conversa consigo mesmo, autorização por
  participante, listagem de usuários do condomínio) + extensão de `realtime/socket.test.ts` pros
  eventos `conversa:*` (entrar, negar quem não participa, broadcast de mensagem nova, erro no
  ack) + 401 em `rotas-protegidas.test.ts`. 141/141 testes de backend passando. Frontend,
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

**Status:** commit `f78248b` (Mural + conversas privadas), CI verde em `main` (jobs `backend`,
`frontend` e `sonarcloud`, ver https://github.com/gustavovieiira/TCC-USAI2.0/actions/runs/35115435568)
e **quality gate do SonarCloud em `OK`**: `new_coverage` 87.1% (limite ≥ 80%), 0 problemas de
confiabilidade/segurança/manutenibilidade no código novo, duplicação 2.4% (limite < 3%), 100% dos
security hotspots revisados.

---

## 2026-09-16: Mural: feed único do condomínio (estilo rede social)

**O que foi feito:** funcionalidade sugerida a partir do uso real do Dashboard, inicialmente um
mural simples de "pedidos de ajuda com resposta pública", mas o formato de lista de cards ficou
pouco natural pro caso de uso real (síndico avisando o condomínio, morador postando qualquer
coisa). Redesenhado num único momento pra um **feed estilo Twitter/X**: qualquer post (aviso ou
pedido) na mesma linha do tempo, com avatar, selo de papel, tempo relativo e comentários públicos.
Não faz parte do RFC original (sem numeração RF própria), recurso adicionado por pedido direto de
uso, então a modelagem já nasceu no formato final (sem migration intermediária "errada" no
histórico).

- **Modelagem:** um único modelo `Post` (mapeado pra tabela `pedidos`, reaproveitando a primeira
  migration) com `tipo: PEDIDO|AVISO`, `conteudo` (texto livre, sem título separado, como um
  tweet), `categoria?`, `status: ABERTO|ATENDIDO` **opcional** (só preenchido quando `tipo=PEDIDO`;
  `null` pra avisos/posts livres), `autorId`, `condominioId`. `ComentarioPost` pros comentários
  públicos. Migration `20260916134147_mural_feed_unificado` (remove `titulo`, adiciona `tipo`,
  torna `status` opcional).
- **Quem pode postar o quê:** qualquer morador, síndico ou admin pode publicar um post de qualquer
  tipo, não é só o síndico que avisa, e não é só o morador que pede ajuda; o feed é livre, do jeito
  que uma rede social é. Admin USAI (que não pertence a um condomínio) precisa informar
  explicitamente pra qual condomínio o post é (`condominioId` no corpo da requisição), sem UI
  própria ainda pro admin nessa primeira versão, só suporte no backend.
- **Moderação:** o autor pode excluir o próprio post; o síndico pode excluir **qualquer** post do
  próprio condomínio (`DELETE /api/mural/:id`), pedido explícito do usuário ("o síndico tem opção
  de poder excluir caso precise").
- **Backend** (`apps/backend/src/modules/mural/`), mesmo padrão em camadas dos outros módulos.
  `POST /api/mural`, `GET /api/mural` (com contagem de comentários via `_count`), `GET
  /api/mural/:id`, `POST /api/mural/:id/respostas`, `POST /api/mural/:id/atender` (só autor, só
  `tipo=PEDIDO`), `DELETE /api/mural/:id`.
- **Frontend**, `MuralPage` com um composer no estilo "o que está acontecendo?" (avatar + textarea
  + toggle Post/Preciso de ajuda + categoria opcional só quando é pedido) e o feed abaixo
  (`PostCard`, componente compartilhado com `PostDetalhePage`): avatar com inicial, nome, selo
  "Síndico"/"Admin USAI" quando aplicável (`PapelTag`), tempo relativo (`formatRelativeTime`, "agora"
  / "5m" / "3h" / "2d" / data completa a partir de uma semana), badge de status só pra pedidos,
  contador de comentários, e ícone de excluir só pra quem pode. Acessível também pro síndico
  (`RoleRoute allow={['MORADOR','SINDICO']}`), com item próprio na navegação.
- **Mural como home:** depois de ver a primeira versão rodando, o feedback foi direto, o Mural
  precisa ser a página principal, não mais um item de navegação qualquer. O antigo `DashboardPage`
  (cards de atalho tipo "Catálogo", "Publicar item" etc.) foi **removido**, ele só duplicava links
  que já existem na navegação (`AppShell`) e no `Mural`, então virou código morto assim que deixou
  de ser a home. Criado `homeRouteFor(papel)` em `lib/authStorage.ts`: resolve `/mural` pra
  morador/síndico e `/admin` pro Admin USAI (que ainda não tem acesso ao Mural, evita loop de
  redirecionamento no `RoleRoute`). Usado em três lugares: clique no logo "USAI" (`AppShell`),
  redirecionamento pós-login/cadastro (`LoginPage`, `CadastroPage`) e fallback do `RoleRoute`
  quando o papel não bate com a rota.
- **Testes:** backend, `mural.service.test.ts` (100% de cobertura: criar post/aviso, resolução de
  condomínio pro admin, listar com contagem de comentários, marcar atendido só pra pedido,
  exclusão por autor e por síndico, rejeição pra quem não é nem autor nem síndico) + caso de 401 em
  `rotas-protegidas.test.ts`. 119/119 testes de backend passando. Frontend, `MuralPage.test.tsx` e
  `PostDetalhePage.test.tsx` (14 testes: composer alternando tipo, exclusão por autor/síndico,
  ocultação de "marcar atendido"/"excluir" pra quem não tem permissão, comentários, estados de
  erro) + testes de `PapelTag`/`PostStatusBadge`, `formatRelativeTime` e `RoleRoute`/`homeRouteFor`
  atualizados pro novo destino. 82/82 testes de frontend passando (a suíte do `DashboardPage`,
  removida junto com a página).
- **Validação manual:** três contas (Ana, Bruno, moradores; Carla, síndica) do mesmo condomínio.
  Ana publica um aviso livre e um pedido com categoria; Carla acessa o Mural (rota liberada pro
  papel dela), publica um aviso oficial com o selo "Síndico" visível, comenta no pedido da Ana, e
  confirma que vê o ícone de excluir em **todos** os posts (moderação), enquanto o botão "Marcar
  como atendido" só aparece pro autor. Testado em viewport mobile (375px), feed, composer e selo
  de papel renderizam corretamente empilhados.

**Onde mexer a seguir:** UI do Admin USAI pra postar aviso escolhendo o condomínio (hoje só
suportado no backend). Fora isso, falta só o M3 (Asaas) e o deploy em nuvem.

---

## 2026-09-16: Upload de imagem de verdade (fim do gap de "só URL")

**O que foi feito:** publicar item aceitava só URL de imagem (link externo colado pelo usuário),
trocado por upload de arquivo de verdade, armazenado em disco no backend via Multer.

- **Backend** (`apps/backend/src/modules/itens/upload.middleware.ts`,
  `common/uploads.ts`): `POST /api/itens/upload-imagem` (multipart, campo `imagem`) aceita só
  JPEG/PNG/WebP (rejeita explicitamente outros tipos, inclusive SVG, evita XSS armazenado via SVG
  com script embutido), limite de 5MB, nome de arquivo sempre gerado via `randomUUID()` (nunca o
  nome original, evita path traversal). Retorna a URL pública; `app.ts` serve `/uploads` como
  estático. `UPLOADS_DIR` é configurável via env (`UPLOADS_DIR`) pensando no dia do deploy, hoje é
  disco local, mas pode virar volume montado ou trocar de estratégia sem mexer no resto do código.
- **Frontend** (`PublicarItemPage.tsx`): campo de URL trocado por `<input type="file">` com
  pré-visualização (via `URL.createObjectURL`) e validação de tipo antes mesmo de enviar. No submit:
  se tem arquivo, faz upload primeiro (`uploadImagemItem`) pra pegar a URL, só depois cria o item com
  ela, dois passos, uma ação só pro usuário.
- **Testes:** backend, `tests/modules/itens/upload.test.ts`, integração real batendo em disco
  (não mock), limpa os arquivos criados no `afterAll`. Frontend, 3 testes novos em
  `PublicarItemPage.test.tsx` cobrindo upload+criação, rejeição de formato inválido e falha no
  upload. Precisou de polyfill de `URL.createObjectURL`/`revokeObjectURL` no `tests/setup.ts`
  (jsdom não implementa, mesma categoria do `scrollIntoView` já resolvido antes).
- **Achado durante o teste de validação manual, não nos automatizados:** criei um JPEG mínimo à mão
  (bytes escritos manualmente) só pra testar o upload via curl, o servidor armazenou e serviu o
  arquivo perfeitamente (bytes idênticos, headers corretos, `Content-Type: image/jpeg`), mas o
  Chromium se recusava a decodificá-lo (ícone de imagem quebrada). Troquei por um PNG 1x1 válido de
  verdade (fixture conhecida) e renderizou normalmente, ou seja, **o bug era do meu arquivo de teste
  handcrafted, não do pipeline de upload**. Fica de lição: pra testar upload de imagem manualmente,
  usar sempre um arquivo real, nunca um "JPEG mínimo" escrito à mão.

**Onde mexer a seguir:** nada pendente aqui. Segue faltando só o M3 (Asaas) e o deploy em nuvem.

---

## 2026-09-15: Frontend: painéis de síndico e Admin USAI, saques

**O que foi feito:** as três últimas telas que faltavam no frontend, fechando o RFC quase inteiro
(falta só o Asaas). Navegação da `AppShell` e o `DashboardPage` agora são **baseados no papel** do
usuário (`MORADOR`/`SINDICO`/`ADMIN`), cada um vê só o que faz sentido pro próprio papel, em vez de
um menu único genérico.

- **`RoleRoute`** (`components/RoleRoute.tsx`), guarda de UX (não de segurança; o backend já aplica
  `requireRole`) que redireciona pro dashboard se o papel do usuário não bate com a rota. Evita o
  morador comum cair numa tela de admin e levar um 403 confuso.
- **`/saques`** (morador), solicitar saque (valor + chave PIX) e ver o histórico próprio com status
  e motivo de rejeição.
- **`/sindico`**, dados do condomínio (link de acesso, PIN com edição inline), abas de moradores e
  locações ativas.
- **`/admin`**, 3 abas: **Financeiro** (cards de resumo + saques pendentes com aprovar/rejeitar,
  rejeitar exige motivo inline), **Condomínios** (cadastrar + ativar/desativar), **Síndicos** (criar
  conta, com select dos condomínios cadastrados).
- **Testes:** 57 testes no total (18 novos, `RoleRoute`, `SaquesPage`, `SindicoPage`, `AdminPage` com
  as 3 abas). Cobertura do frontend em **80%**.
- **Bug pego na validação manual, não nos testes automatizados:** depois de aprovar/rejeitar um saque
  no painel do Admin, os cards de resumo financeiro (quantidade/valor por status) não atualizavam,
  só a lista de pendentes. Corrigido: `onMudou` agora também rechama `resumoFinanceiro()` (best-effort;
  se falhar, só fica desatualizado até a próxima visita, não vira erro pro usuário). Os testes
  automatizados não pegaram isso porque mockavam `resumoFinanceiro` uma vez só, o valor mockado
  "por acidente" continuava consistente. Fica de lição: mockar retornos diferentes em chamadas
  sucessivas quando o comportamento depende de reconsulta.
- **Validado de ponta a ponta com 3 contas reais** (Bruno/morador, Carla/síndica, Admin USAI):
  Bruno solicitou saque pela UI → apareceu pendente no painel do Admin → Admin aprovou → cards e
  lista atualizaram corretamente. Admin criou um condomínio novo e uma síndica nova pra ele, cadastro
  íntegro (senha real, síndica loga normalmente). Síndica viu moradores e locações ativas do próprio
  condomínio e trocou o PIN.

**Onde mexer a seguir:** falta só o **M3 (Asaas)**, combinado desde o início pra fase final, e
depois o **deploy em nuvem**. Com essas telas, o frontend cobre auth, catálogo, locações, chat, saques,
síndico e admin.

---

## 2026-09-15: Frontend: chat da locação em tempo real

**O que foi feito:** UI do chat que já existia no backend desde o M4 (WebSocket via Socket.IO). Nova
tela `MensagensLocacaoPage` em `/locacoes/:id/mensagens`, acessível pelo link "Mensagens" em cada
card de `MinhasLocacoesPage` (para os dois lados, locatário e proprietário).

- `lib/socket.ts`, cria o cliente Socket.IO tipado (`ServerToClientEvents`/`ClientToServerEvents`
  espelhando `apps/backend/src/realtime/socket.ts`), autenticando no handshake com o mesmo JWT do
  REST. A URL do socket é derivada de `VITE_API_URL` removendo o sufixo `/api` (o Socket.IO roda na
  raiz do servidor, não sob `/api`).
- `features/mensagens/`, `mensagens.api.ts` (histórico via REST,
  `GET /api/locacoes/:id/mensagens`) e tipos.
- `MensagensLocacaoPage.tsx`: carrega o histórico, conecta o socket, entra na sala da locação
  (`locacao:entrar`) e escuta `mensagem:nova` pra atualizar a lista ao vivo. Envio via
  `mensagem:enviar` (ack confirma sucesso/erro). Bolhas de mensagem alinhadas à direita (azul) quando
  o remetente é o usuário logado, à esquerda (cinza) caso contrário. Scroll automático pra última
  mensagem.
- **Testes:** mock da própria camada `lib/socket.ts` (não do pacote `socket.io-client` direto) com um
  socket falso que registra handlers e permite disparar eventos manualmente, mesmo padrão de mockar
  a própria API interna já usado nos outros testes do projeto. Cobre: histórico carregado, conexão
  bem-sucedida, erro quando o usuário não participa da locação, recebimento de mensagem em tempo
  real, envio pelo formulário, e desconexão ao desmontar. Precisou de um polyfill de
  `Element.prototype.scrollIntoView` no `tests/setup.ts`, o jsdom não implementa esse método.
- **Validado de verdade com duas sessões simultâneas** (Bruno e Ana, cada um logado numa aba): Ana
  mandou mensagem pela UI e ela apareceu **instantaneamente** na tela do Bruno, sem reload, o
  WebSocket funciona ponta a ponta com o front real. (Detalhe do teste: como as duas abas eram do
  mesmo navegador/origem, elas compartilham o mesmo `localStorage`, em algum momento o "quem sou eu"
  de uma tela ficou temporariamente confuso por causa disso, não por um bug de verdade; a lógica de
  "mensagem minha vs. do outro" já está coberta e correta nos testes automatizados, que isolam cada
  usuário sem esse artefato de dois logins na mesma origem.)

**Onde mexer a seguir:** faltam as telas de síndico, admin e saque. Depois disso, só Asaas e deploy.

---

## 2026-09-15: Frontend: catálogo, publicar item, solicitar locação, minhas locações

**O que foi feito:** primeira leva de telas do frontend além de auth, cobrindo o fluxo completo de
catálogo e locação (RF06-RF14). Design baseado num protótipo feito no Claude Design (paleta azul
`#1c6ff5`, a mesma já usada no Tailwind desde o M0, tipografia Plus Jakarta Sans + JetBrains Mono
pros valores numéricos, cantos arredondados, sombras suaves).

- **Design system** (`tailwind.config.ts`, `index.html`, `index.css`): fontes via Google Fonts,
  `boxShadow.soft`/`soft-lg`. Paleta `brand` e neutros `slate` já existentes foram reaproveitados (o
  protótipo usa exatamente essas cores).
- **Componentes de UI novos** (`components/ui/`): `Badge` (pílula de status da locação, uma cor por
  status), `Card`, `Textarea`, `Select`, `EmptyState`, `Spinner`. `Button` ganhou variantes
  (`primary`/`secondary`/`danger`/`ghost`) e `fullWidth` opcional.
- **Layout responsivo** (`components/layout/AppShell.tsx`): nav superior (desktop) e barra de
  navegação inferior fixa (mobile) com os mesmos 3 destinos (Catálogo/Publicar/Locações), pedido
  explícito de boa usabilidade em celular *e* notebook. Envolve as rotas autenticadas via
  `<Outlet/>` aninhado dentro de `ProtectedRoute` em `App.tsx`.
- **Telas:**
  - `CatalogoPage`, grid responsivo (2 colunas no mobile, até 4 no desktop), busca por texto e
    filtro por categoria (ambos client-side sobre a lista já carregada), estado vazio.
  - `PublicarItemPage`, formulário de criação de item (sem upload de arquivo ainda, usa URL de
    imagem opcional, já que não há storage de arquivos no backend).
  - `ItemDetalhePage`, mostra o item, calcula diárias/valor estimado em tempo real conforme as
    datas mudam, e **esconde o formulário de solicitar locação quando o usuário logado é o dono do
    item** (reflete a RN04 do backend na UI, evitando um 400 previsível).
  - `MinhasLocacoesPage`, abas "Como locatário"/"Recebidas"; a aba do proprietário mostra
    Aprovar/Rejeitar em locações `PENDENTE` e atualiza o card localmente após a ação, sem refetch.
- **Testes:** 29 testes (Vitest + Testing Library) cobrindo os componentes novos e as 4 páginas,
  incluindo o cálculo de dias/valor, a regra de dono não poder solicitar (RN04 refletida na UI), o
  fluxo de aprovar/rejeitar atualizando o card, e filtros do catálogo. Cobertura do frontend subiu de
  ~21% pra **~60%** (meta do playbook: 25%), o escopo de cobertura do Vitest
  (`apps/frontend/vite.config.ts`) também foi ampliado pra incluir `src/pages/**` e `src/lib/**`, que
  antes ficavam de fora da métrica mesmo tendo lógica de negócio real.
- **Bug pego pelos testes antes de ir pro ar:** `formatDate` usava `Intl.DateTimeFormat` sem
  `timeZone: 'UTC'`, como `dataInicio`/`dataFim` são dias de calendário armazenados como meia-noite
  UTC, em qualquer fuso a oeste de UTC (ex.: horário de Brasília) a data exibida vinha um dia
  atrasada. Corrigido fixando `timeZone: 'UTC'` no formatter (`src/lib/format.ts`).
- **Validado manualmente contra o backend real**: logei como Bruno (locatário), solicitei uma
  locação da Furadeira Bosch pelo formulário (cálculo de "2 diárias · R$ 40,00" bateu), depois logei
  como Ana (proprietária), vi a solicitação pendente na aba "Recebidas" e apertei "Aprovar", o card
  atualizou pra "Aprovada" na hora, sem reload. Testado em viewport desktop (1280px) e mobile
  (375px), catálogo, publicar item e a barra de navegação inferior renderizam corretamente nos dois.

**Onde mexer a seguir:** falta UI pro chat da locação (mensagens em tempo real), pros painéis de
síndico e admin, e pro fluxo de saque. Upload de imagem de verdade (hoje é só URL) depende de decidir
onde guardar arquivo (S3/Cloudinary/disco do servidor), ainda não decidido.

---

## 2026-09-15: Observabilidade: dashboards do Grafana

**O que foi feito:** o Prometheus já coletava métricas reais desde o M0 (`GET /metrics`), mas o Grafana
estava rodando vazio, sem datasource nem dashboard configurados. Fechado via *provisioning* (arquivos
versionados, não clique manual na UI):

- `infra/grafana/provisioning/datasources/prometheus.yml`, datasource do Prometheus
  (`http://prometheus:9090`), criado automaticamente ao subir o container.
- `infra/grafana/provisioning/dashboards/dashboards.yml`, aponta pra pasta de dashboards.
- `infra/grafana/dashboards/usai-backend.json`, dashboard "USAI Backend, Visão Geral" com 7 painéis,
  todos baseados nas métricas que o backend já expõe (`http_request_duration_seconds` +
  `collectDefaultMetrics` do prom-client): requisições/s, erros 5xx/s, latência p95, requisições por
  rota, latência por percentil (p50/p95/p99), memória do processo, event loop lag.
- `docker-compose.yml`, monta os dois diretórios de provisioning no serviço `grafana`.

**Validado de verdade:** subi `prometheus` + `grafana` via Docker, gerei tráfego real contra o backend
(`/health`, `/api/itens`) e confirmei via API do Prometheus (`/api/v1/query`) e do Grafana
(`/api/search`, `/api/datasources`) que: o target `usai-backend` fica `up`, os contadores separam por
`route`/`status_code` (ex.: `/api/itens` com `401`, 30 requisições, confirma que o guard de auth é
contabilizado certo), o datasource e o dashboard aparecem provisionados automaticamente, sem precisar
criar nada na UI.

**Detalhe de ambiente:** pra esse teste, apontei temporariamente o `prometheus.yml` pra
`host.docker.internal:3000` (porque o backend estava rodando local via `npm run dev`, não como
container). O valor **commitado é `backend:3000`**, que é o correto quando o stack inteiro sobe junto
via `docker compose up -d` (cenário do deploy em produção). **Isso expõe uma lacuna real:** hoje o
fluxo de desenvolvimento local documentado (`docker compose up -d mysql` + `npm run dev` pros dois
apps) nunca conseguiria alimentar esse Prometheus, porque o alvo `backend:3000` só existe quando o
backend também roda como serviço Docker. Não corrigi isso agora, fica registrado como pendência: ou o
dev local troca pra rodar o backend também via Docker, ou o `prometheus.yml` precisa de um mecanismo
pra apontar pro host em dev (ex.: variável de ambiente/override local, do jeito que já fazemos com o
`docker-compose.override.yml` do MySQL).

---

## 2026-09-15: Análise estática: SonarCloud

**O que foi feito:** configurado o SonarCloud (item obrigatório do "núcleo comum de engenharia" do
playbook) em modo **CI-based** (via GitHub Actions), não o "Automatic Analysis" padrão, o automático
não roda os testes, então não calcula cobertura real; o modo CI-based lê o `lcov.info` gerado pelo
próprio Jest/Vitest e mostra a cobertura de verdade no dashboard.

- `sonar-project.properties` (raiz), `projectKey=gustavovieiira_TCC-USAI2.0`,
  `organization=gustavovieiira`, aponta `sonar.sources`/`sonar.tests` pros dois apps do monorepo e os
  `lcov.info` de backend e frontend.
- Job novo `sonarcloud` em `.github/workflows/ci.yml`, roda depois de `backend`/`frontend`
  (`needs: [backend, frontend]`), repete a execução dos testes (precisa gerar os `lcov.info` de novo
  nesse job, já que artefatos não são compartilhados entre jobs) e roda
  `SonarSource/sonarqube-scan-action@v4` com `SONAR_TOKEN` (secret do repo).
- `apps/frontend/vite.config.ts`, adicionado `lcov` aos `coverage.reporter` do Vitest (só tinha
  `text`/`html`; sem `lcov` o Sonar não lê a cobertura do frontend).
- Secret `SONAR_TOKEN` adicionado ao repositório via `gh secret set` (não fica no código).

**Onde ver:** [sonarcloud.io/project/overview?id=gustavovieiira_TCC-USAI2.0](https://sonarcloud.io/project/overview?id=gustavovieiira_TCC-USAI2.0).

---

## 2026-09-15: M6: Admin USAI (condomínios, síndicos, financeiro)

**O que foi feito:** módulo novo no backend (`apps/backend/src/modules/admin/`), a última peça de
gestão antes do Asaas. Fecha o gap deixado no M5 (não havia como criar um síndico).

- `admin.service.ts`: `criarCondominio`/`listarCondominios`/`atualizarCondominio` (cadastro da
  plataforma, nome, link de acesso, PIN, ativar/desativar), `criarSindico` (cria a conta de síndico de
  um condomínio, só o Admin pode, não existe autocadastro para esse papel; reaproveita
  `BCRYPT_ROUNDS`, agora exportado de `auth.service.ts`, pra manter o mesmo custo de hash em toda a
  aplicação), `resumoFinanceiro` (financeiro global: totais de solicitações de saque por status,
  `PENDENTE`/`APROVADO`/`REJEITADO`, quantidade e soma via `prisma.solicitacaoSaque.aggregate`, mais
  contagem de condomínios ativos).
- Rotas em `admin.routes.ts` → `/api/admin`: `POST/GET /condominios`, `PATCH /condominios/:id`,
  `POST /sindicos`, `GET /financeiro/resumo`, todas atrás de `requireRole('ADMIN')`.
- **Testes:** `tests/modules/admin/admin.service.test.ts` (mock do Prisma, inclusive o `aggregate`) e
  `tests/modules/admin/admin.routes.test.ts` (RBAC: morador e síndico recebem 403 nas rotas de admin).
  94 testes no total, todos passando. Cobertura geral do backend: ~71% (meta 75% na prova de autoria,
  segue precisando de atenção nos controllers, que continuam sem teste direto).
- **Validado manualmente** contra o MySQL real, fechando o ciclo inteiro: criei um segundo condomínio
  via admin, listei os dois, desativei o novo (confirmei `condominiosAtivos` cair de 2 pra 1 no resumo
  financeiro), criei a síndica "Carla" pro condomínio de teste, e confirmei que ela **loga
  normalmente** pelo `/api/auth/login` já existente, provando que a conta criada pelo admin é uma conta
  de verdade, não um caminho separado. Resumo financeiro bateu com os saques do M4 (1 aprovado R$40, 1
  rejeitado R$9999). Síndico tentando acessar rota de admin: 403.

**Onde mexer a seguir:** com auth, itens, locações, mensagens, saques, síndico e admin prontos, só
falta o **M3 (Asaas)**, combinado desde o início pra uma fase final, e o **frontend inteiro** além
das telas de auth. A partir daqui o backend cobre a maior parte do RFC; a prioridade muda pra fechar os
itens do núcleo comum de engenharia que ainda faltam (análise estática, deploy em nuvem) e pra
cobertura de testes, antes de migrar o esforço pro frontend.

---

## 2026-09-15: M5: Painel do síndico

**O que foi feito:** módulo novo no backend (`apps/backend/src/modules/sindico/`), visão e controle do
síndico sobre o próprio condomínio, seguindo o mesmo padrão dos demais módulos.

- `sindico.service.ts`: `listarMoradores` (moradores vinculados ao condomínio do síndico autenticado),
  `listarLocacoesAtivas` (locações que ainda ocupam algum item do condomínio, reaproveita
  `STATUS_QUE_OCUPAM_PERIODO`, exportado de `locacoes.service.ts`, como definição de "ativa", em vez de
  duplicar a lista de status), `buscarCondominio` e `atualizarPin` (síndico gerencia o PIN de acesso do
  condomínio, usado no cadastro de moradores, RN03 do módulo de auth).
- Rotas em `sindico.routes.ts` → `/api/sindico`: `GET /condominio`, `PATCH /condominio/pin`,
  `GET /moradores`, `GET /locacoes`, todas atrás de `authGuard` + `requireRole('SINDICO')` (segundo
  módulo do projeto com RBAC por papel, depois de saques).
- **Como um usuário vira síndico:** ainda não há endpoint de gestão pra isso, hoje só é possível criar
  via Prisma diretamente (`papel: 'SINDICO'` + `condominioId`). Isso deve virar parte do M6 (Admin USAI
  gerencia condomínios).
- **Testes:** `tests/modules/sindico/sindico.service.test.ts` (mock do Prisma) e
  `tests/modules/sindico/sindico.routes.test.ts` (RBAC: morador recebe 403 nas rotas de síndico). 79
  testes no total, todos passando. Cobertura geral do backend: ~70,7% (meta 75% na prova de autoria,
  os controllers continuam sendo o ponto fraco de cobertura, como já vinha acontecendo desde o M2).
- **Validado manualmente** contra o MySQL real: criei um síndico pro condomínio de teste, confirmei que
  ele vê os dois moradores cadastrados e a locação aprovada da Furadeira Bosch, testei a troca de PIN
  (`1234` → `5678`, confirmado na sequência) e confirmei que morador autenticado toma 403 tentando
  acessar qualquer rota de síndico.

**Onde mexer a seguir:** M6 (financeiro global + gestão de condomínios do Admin USAI, incluindo criar
síndicos). Depois disso só falta o M3 (Asaas), combinado para uma fase final, e o frontend inteiro
(além das telas de auth).

---

## 2026-09-15: M4: Mensagens em tempo real + Solicitação de saque

**O que foi feito:** dois módulos novos no backend, chat da locação (com WebSocket) e solicitação de
saque para o Admin USAI avaliar. Decisão de escopo: seguir de backend antes do frontend (combinado com
o orientando), deixando a integração de pagamentos (Asaas/M3) para uma fase final.

- **Mensagens** (`apps/backend/src/modules/mensagens/`), chat entre locatário e proprietário dentro de
  uma locação:
  - `mensagens.service.ts`: `verificarParticipante` garante que só o locatário ou o dono do item podem
    ver/enviar mensagens da locação (`ForbiddenError` caso contrário); `enviar`/`listarPorLocacao`
    persistem e listam o histórico em ordem cronológica.
  - Histórico via REST, `GET/POST /api/locacoes/:id/mensagens`, montado como sub-router de
    `locacoesRouter` (`mensagens.routes.ts` usa `Router({ mergeParams: true })` pra enxergar o `:id` da
    locação do router pai).
  - **Envio/recebimento ao vivo via WebSocket** (`apps/backend/src/realtime/socket.ts`, Socket.IO): o
    cliente autentica no handshake com o mesmo JWT do REST (`verifyAccessToken`, extraído do
    `authGuard.ts` pra ser reaproveitado fora do ciclo HTTP), entra na sala `locacao:<id>` (evento
    `locacao:entrar`, só se passar por `verificarParticipante`) e manda mensagens com
    `mensagem:enviar`, o servidor persiste via `MensagensService` e emite `mensagem:nova` pra todo
    mundo na sala. `server.ts` agora cria um `http.Server` explícito pra anexar o Socket.IO ao lado do
    Express.
- **Saques** (`apps/backend/src/modules/saques/`), morador solicita, Admin USAI aprova/rejeita:
  - `saques.service.ts`: `solicitar` (morador informa valor + chave PIX, começa `PENDENTE`),
    `listarPorUsuario`, `listarTodas` (Admin, filtro por status), `aprovar`/`rejeitar` (só em
    solicitações `PENDENTE`, `rejeitar` exige `motivoRejeicao`). Toda aprovação/rejeição grava em
    `LogAuditoria` (rastreabilidade financeira, RN? do playbook de "Admin controla o financeiro").
  - Rotas em `saques.routes.ts` → `/api/saques`: `POST /` e `GET /minhas` (qualquer morador
    autenticado), `GET /`, `POST /:id/aprovar`, `POST /:id/rejeitar` atrás de `requireRole('ADMIN')`
    (primeiro uso desse guard no projeto, só existia definido, sem rota usando).
  - **Nota importante:** ainda não valida o valor solicitado contra o saldo real do usuário, isso
    depende do M3 (Asaas) popular `Pagamento` com locações efetivamente pagas. Por ora é só o registro
    da solicitação para avaliação manual do admin; a validação de saldo entra junto com o M3.
- **Testes:** `tests/modules/mensagens/mensagens.service.test.ts`,
  `tests/modules/saques/saques.service.test.ts`, `tests/modules/saques/saques.routes.test.ts` (RBAC:
  morador autenticado recebe 403 nas rotas de admin) e `tests/realtime/socket.test.ts`, sobe um
  `http.Server` efêmero com `MensagensService` mockado (sem precisar de banco real) e usa
  `socket.io-client` pra testar auth no handshake, entrar na sala, enviar e receber mensagem em tempo
  real, e o ack de erro quando quem envia não participa da locação. 66 testes no total, todos passando.
- **Validado manualmente** contra o MySQL real: cadastrei Ana (dona) e Bruno (locatário), publiquei
  item, Bruno solicitou e Ana aprovou a locação; testei mensagens via REST (enviar + listar histórico)
  e depois um script Node com `socket.io-client` conectando os dois como sockets diferentes, Bruno
  mandou mensagem e Ana recebeu `mensagem:nova` instantaneamente. Pra saques, criei um usuário `ADMIN`
  direto via Prisma (não existe cadastro público pra esse papel), confirmei que morador toma 403 em
  `GET /api/saques`, admin lista/aprova/rejeita normalmente, e confirmei que `LogAuditoria` grava as duas ações.

**Detalhe de ambiente (só nesta máquina):** a porta 3306 já está ocupada por um MySQL local (serviço do
Windows, não é Docker). Criei um `docker-compose.override.yml` (gitignorado, igual o `.env`) remapeando
`3307:3306` só para o serviço `mysql`, usa a sintaxe `ports: !override` do Compose Spec porque o merge
padrão *soma* as portas em vez de substituir. O `apps/backend/.env` local aponta
`DATABASE_URL` para `localhost:3307`. Em outra máquina sem esse conflito, não precisa do override.

**Onde mexer a seguir:** M5 (painel do síndico) e M6 (financeiro/condomínios do Admin) seguem o mesmo
padrão modular. Frontend continua pendente para tudo além de auth, entra depois que o backend estiver
fechado (combinado: deixar a UI, com design moderno, para depois de fechar o backend quase inteiro,
faltando só o M3/Asaas por último).

---

## 2026-09-15: M2: Catálogo de itens e Locações

**O que foi feito:** dois módulos novos no backend, seguindo o mesmo padrão do módulo de auth
(`common/errors` + service testável isoladamente + controller fino + rotas protegidas por `authGuard`).

- **Catálogo de itens** (`apps/backend/src/modules/itens/`), RF06-RF09:
  - `itens.service.ts`: `criar` (publica item + imagens vinculado ao condomínio do morador logado),
    `listarPorCondominio` (catálogo filtrado por categoria, só itens `ativo=true`, RN02 garante escopo
    por condomínio), `atualizar`/`remover` (só o dono edita/remove, `remover` é *soft delete*,
    `ativo=false`, para não quebrar o histórico de locações que referenciam o item).
  - Rotas em `itens.routes.ts`, montadas em `/api/itens`.
- **Locações** (`apps/backend/src/modules/locacoes/`), RF10-RF14, RN04:
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
catálogo/publicar item/solicitar locação, só auth (login/cadastro/dashboard) está com UI pronta.

---

## 2026-09-15: Correção: CI quebrando no teste de refresh token

**O que aconteceu:** o primeiro push para `main` quebrou o pipeline do GitHub Actions (só nele, local
passava). O teste de `AuthService.refresh` em
`apps/backend/tests/modules/auth/auth.service.test.ts` assinava o refresh token de teste com o valor
literal `'dev-refresh-secret'`, que é o *fallback* hardcoded dentro de
`apps/backend/src/modules/auth/auth.service.ts` (`getSecrets()`), usado só quando a variável de ambiente
não existe. Local não tinha `JWT_REFRESH_SECRET` setada (então caía no fallback e o teste passava por
coincidência); o `ci.yml` define `JWT_REFRESH_SECRET: ci-refresh-secret` para o job inteiro, então em CI
o serviço assinava/validava com outro segredo e o teste falhava.

**Correção:** o teste agora fixa `process.env.JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` para um valor
conhecido num `beforeAll`, em vez de depender do que estiver (ou não) definido no ambiente que roda o
teste. Deixa de existir dependência implícita do fallback interno do serviço.

**Lição para a prova de autoria:** nunca deixar um teste passar "por acidente" dependendo de uma
variável de ambiente não controlada, sempre fixar o estado que o teste precisa.

**Status:** CI verde em `main` e `develop`, https://github.com/gustavovieiira/TCC-USAI2.0/actions

---

## 2026-09-15: Validação manual ponta a ponta (para mostrar amanhã)

Subi o ambiente local de verdade (não só os testes automatizados) pra confirmar que o fluxo funciona:

1. `docker compose up -d mysql`, sobe só o banco (ver `docker-compose.yml` na raiz).
2. `npx prisma migrate dev --name init` dentro de `apps/backend`, cria as tabelas
   (`apps/backend/prisma/migrations/20260915021734_init/`).
3. `npm run prisma:seed --workspace=apps/backend`, roda `apps/backend/prisma/seed.ts`, que cria um
   condomínio de teste (`residencial-jardim-europa`, PIN `1234`) via `prisma.condominio.upsert`.
4. Backend (`npm run dev --workspace=apps/backend`) e frontend (`npm run dev --workspace=apps/frontend`)
   rodando localmente.
5. No navegador: acessei `/cadastro?condominio=residencial-jardim-europa`, preenchi o formulário
   (`apps/frontend/src/features/auth/cadastro/CadastroForm.tsx`), fui redirecionado pro dashboard já
   autenticado. Fiz logout, entrei de novo pela tela de login
   (`apps/frontend/src/features/auth/login/LoginForm.tsx`) com o mesmo e-mail/senha, funcionou.

**Resultado:** RF01, RF02, RF03 e RN03 confirmados funcionando de ponta a ponta contra um MySQL real,
não só nos testes com mock.

**Detalhe de ambiente importante (só nesta máquina):** as portas padrão 3000 e 5173 já estão ocupadas
por outro projeto (`versalengenharia-*`) rodando em Docker nesta máquina. Por isso o `apps/backend/.env`
local usa `PORT=3010` e `apps/frontend/.env` usa `VITE_API_URL=http://localhost:3010/api`, isso é só
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

## 2026-09-14: M0: Fundação do projeto

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
  - **Módulo de autenticação** (`apps/backend/src/modules/auth/`), implementa RF01, RF02, RF03 e RN03
    do RFC:
    - `auth.service.ts`, `AuthService` com `cadastrarMorador` (valida link+PIN do condomínio, impede
      e-mail duplicado, faz hash da senha com bcrypt, emite JWT), `login` (valida credenciais) e
      `refresh` (renova access token a partir do refresh token).
    - `auth.schemas.ts`, validação de entrada com Zod.
    - `auth.controller.ts` / `auth.routes.ts`, expõe `POST /api/auth/cadastro`, `/login`, `/refresh`.
  - **Testes (TDD)** em `apps/backend/tests/`:
    - `modules/auth/auth.service.test.ts`, cobre cadastro (sucesso, condomínio inexistente/inativo,
      PIN errado, e-mail duplicado, senha sempre em hash), login (sucesso, e-mail inexistente, senha
      errada) e refresh (token válido/ inválido). Usa um mock manual do Prisma (sem banco real).
    - `app/health.test.ts`, testa `/health` e `/metrics` com Supertest.
  - `Dockerfile` multi-stage do backend em `apps/backend/Dockerfile`.
- **Frontend**: scaffold inicial via Vite (`apps/frontend`), template React + TypeScript. Tailwind e
  estrutura de `features/` ainda **pendentes** (próximo passo).

**Por que essas decisões:**

- Regras de negócio ficam em `services/` (não no controller) propositalmente, é o que o playbook do
  professor chama de "arquitetura modular" e é o que permite testar a lógica sem precisar de HTTP nem
  banco real (mock do Prisma nos testes).
- `errors.ts` com classes de erro tipadas em vez de `throw new Error(string)`, o `errorHandler.ts`
  central sabe transformar cada uma no status HTTP certo, sem `try/catch` repetido em cada controller.
- Prometheus/Grafana e não um APM pago, é item obrigatório do playbook ("observabilidade") e roda de
  graça em Docker junto com o resto.

**Onde mexer a seguir:** `apps/frontend/src` (Tailwind + páginas de cadastro/login), depois
`docker-compose.yml` na raiz para subir tudo junto (mysql + backend + frontend).

---

<!-- Novas entradas sempre no topo, com data. -->
