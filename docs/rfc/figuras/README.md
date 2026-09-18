# Figuras da RFC

As 30 figuras citadas na RFC (`TCC-FINAL_assinado2.pdf`, v1.1) vivem aqui, fora do documento — o
corpo da RFC referencia cada uma por título e link, em vez de embutir a imagem. Objetivo: manter o
`.docx`/`.pdf` leve e fácil de revisar, com as imagens versionadas normalmente no git.

As Figuras 27–29 (modelo C4) moram em [`docs/architecture/`](../../architecture/), que já tem uma
página própria por nível, com o texto explicativo ao lado do diagrama — aqui elas só aparecem
listadas, com link pra lá.

## 3.1 — Fluxos Principais

| Figura | Título | Resumo |
|---|---|---|
| [1](figura-01.png) | Fluxo 1 — Primeiro Acesso ao Condomínio | Morador acessa link exclusivo, informa PIN, cria conta e é vinculado ao condomínio automaticamente. |
| [2](figura-02.png) | Fluxo 2 — Publicação de Item | Morador preenche título, descrição, categoria, valor e imagens; item é publicado no catálogo. |
| [3](figura-03.png) | Fluxo 3 — Solicitação e Aprovação da Locação | Locatário seleciona item e período; proprietário aprova ou rejeita. |
| [4](figura-04.png) | Fluxo 4 — Máquina de Estados da Locação | Pendente → Aprovada → Paga → Em Andamento → Concluída, com cancelamento a partir de Pendente ou Aprovada. |
| [5](figura-05.png) | Fluxo 5 — Fluxo Financeiro e Saque | Locação paga gera ganho no saldo do proprietário; saque é analisado pelo Admin USAI. |
| [6](figura-06.png) | Fluxo 6 — Gestão do Condomínio | Síndico visualiza link/PIN, altera o PIN e acompanha as locações ativas. |
| [7](figura-07.png) | Fluxo 7 — Fluxos de Exceção | Tratamento dos principais cenários de erro (PIN inválido, item indisponível, saldo insuficiente, etc.). |
| [8](figura-08.jpeg) | Fluxo 8 — Arquitetura Conceitual dos Perfis | Visão geral dos perfis de usuário, módulos do sistema e integração com o Asaas. |
| [9](figura-09.png) | Fluxo 9 — Painel Administrativo USAI | As quatro áreas do Admin: Financeiro Global, Gestão de Saques, Condomínios e Relatórios. |

## 3.2 — Diagramas de Atividade

| Figura | Título | Resumo |
|---|---|---|
| [10](figura-10.jpeg) | Diagrama de Atividade — Morador | Fluxo principal de ações do morador na plataforma. |
| [11](figura-11.png) | Diagrama de Atividade — Síndico | Ações disponíveis para o síndico gerenciar o condomínio. |
| [12](figura-12.png) | Diagrama de Atividade — Financeiro e Saque | Ganho, cadastro de chave Pix e solicitação de repasse. |

## 3.3 — Diagramas de Sequência

| Figura | Título | Resumo |
|---|---|---|
| [13](figura-13.jpeg) | Diagrama de Sequência — Primeiro Acesso | Interações entre os componentes durante o primeiro acesso do morador. |
| [14](figura-14.jpeg) | Diagrama de Sequência — Locação e Pagamento | Fluxo de solicitação, aprovação e pagamento de uma locação. |
| [15](figura-15.jpeg) | Diagrama de Sequência — Saque do Proprietário | Solicitação e processamento de saque pelo proprietário. |
| [16](figura-16.jpeg) | Diagrama de Sequência — Repasse pelo Admin USAI | Fluxo de repasse financeiro realizado pelo Admin USAI. |

## 4.1 — Mockups (UX)

> Mockups originais da v1.1. O visual efetivamente implementado é diferente — ver a
> [identidade visual v2.0](https://github.com/gustavovieiira/TCC-USAI2.0/wiki/Decisoes-Tecnicas) e
> capturas de tela reais na Wiki.

| Figura | Título | Resumo |
|---|---|---|
| [17](figura-17.jpeg) | Tela — Página principal do morador | Painel com banner de boas-vindas e atalhos de "Explorar itens" / "Publicar novo item". |
| [18](figura-18.jpeg) | Tela — Catálogo de itens (Vitrine do condomínio) | Busca e listagem de itens disponíveis no condomínio. |
| [19](figura-19.jpeg) | Tela — Chats | Lista de conversas abertas, com item relacionado e prévia da última mensagem. |
| [20](figura-20.jpeg) | Tela — Anunciar item | Publicação de itens, com indicadores de itens ativos/com foto/valor base. |
| [21](figura-21.jpeg) | Tela — Acompanhamento de locações | Contadores de locações aguardando aprovação, ativas, pedidos em aberto e ganhos concluídos. |
| [22](figura-22.jpeg) | Tela — Área financeira do morador | Ganhos e saques do morador. |
| [23](figura-23.jpeg) | Tela — Painel de gestão do síndico | Controle de acessos e organização de quem entra na plataforma. |
| [24](figura-24.jpeg) | Tela — Configurações do condomínio | Visibilidade e controle sobre usuários cadastrados e anúncios publicados. |
| [25](figura-25.jpeg) | Tela — Dashboard financeiro do Admin USAI | Volume total recebido, saques pendentes/pagos e taxa da plataforma. |
| [26](figura-26.jpeg) | Tela — Painel de saques pendentes | Lista de solicitações com dados do recebedor, valor, chave Pix e status. |

## 5.1 — Modelo C4

| Figura | Título | Onde está |
|---|---|---|
| 27 | Diagrama C4 — Nível 1: Diagrama de Contexto | [`docs/architecture/c4-contexto.md`](../../architecture/c4-contexto.md) |
| 28 | Diagrama C4 — Nível 2: Diagrama de Containers | [`docs/architecture/c4-containers.md`](../../architecture/c4-containers.md) |
| 29 | Diagrama C4 — Nível 3: Diagrama de Componentes | [`docs/architecture/c4-componentes.md`](../../architecture/c4-componentes.md) |

## 5.2 — Modelo de Dados

| Figura | Título | Resumo |
|---|---|---|
| [30](figura-30.jpeg) | Modelo de Dados da plataforma USAI | Entidades e relacionamentos do banco (v1.1 — ver nota de atualização no RFC sobre os modelos adicionados depois: Post, ComentarioPost, ConversaPrivada, MensagemPrivada). |
