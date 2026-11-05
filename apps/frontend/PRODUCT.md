# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Dois públicos com o mesmo peso, e o visual precisa servir bem aos dois:

- **Síndico** (e quem representa o condomínio): quem contrata a USAI e administra. Chega pela tela
  inicial pública, decide o plano por quantidade de moradores, paga por PIX e recebe o acesso por e-mail.
  Depois usa o painel (link e PIN de convite, moradores, locações ativas, plano, comissão do condomínio).
  Usa sobretudo no computador, em sessões curtas e pontuais.
- **Morador**: usa no dia a dia, em geral no celular. Cadastra-se pelo link e pelo PIN do condomínio e então
  procura itens e serviços de vizinhos, pede locações, paga, retira e devolve com termo, conversa e saca.
- **Admin USAI** (equipe do produto): usa o painel interno de financeiro, extratos, documentos, termos,
  identidade e condomínios.

## Product Purpose

Organizar, **dentro de cada condomínio**, o empréstimo e a locação de itens ociosos entre vizinhos e a procura
por serviços (eletricista, maquiadora etc., pelo Mural), no lugar de grupos de WhatsApp perdidos. O condomínio
contrata a USAI por plano e período, e fica com 10% de cada locação paga pela plataforma. Sucesso: vizinhos
negociando com segurança e regras claras, e o condomínio com uma fonte de receita para melhorias.

## Positioning

Um catálogo **isolado por condomínio** (só vizinhos) em que cada locação tem aprovação do dono, pagamento por
PIX confirmado pela plataforma, termo de responsabilidade de retirada e devolução com aceite por senha,
documento numerado com histórico e a comissão de 10% para o condomínio. Um grupo de mensagens não entrega
esse conjunto.

## Operating Context

- Cobrança do condomínio e das locações por **PIX** (Asaas). O Asaas recusa cobranças abaixo de R$ 5,00, por
  isso a diária mínima de um item é R$ 5,00.
- Fluxo do síndico: contrata, paga o PIX, recebe por e-mail um link (sem prazo, até criar a senha) com o recibo,
  cria a senha e passa o link e o PIN aos moradores. Mensalidade vencida suspende o acesso dos moradores.
- Fluxo do morador: cadastro com PIN, catálogo, pedido, aprovação do dono, PIX, retirada com aceite, chat,
  devolução, saque.
- Documentos (termo, recibo) imprimem em A4 e salvam em PDF pelo navegador.

## Capabilities and Constraints

- Idioma: português do Brasil. Perfis: MORADOR, SINDICO, ADMIN.
- Planos de R$ 149 a R$ 799 por mês, com descontos de 5%, 10% e 20% nos períodos longos. **Valores fictícios**
  (projeto acadêmico).
- **Os textos jurídicos (termos de responsabilidade) ainda são modelo**, sem revisão jurídica.
- Stack: React, Vite, TypeScript e Tailwind no front; Node, Express, Prisma e MySQL no back.
- O redesenho não pode quebrar rotas, funcionalidades nem os 322 testes do frontend (Vitest).
- Em aberto: hospedagem e domínio do deploy, e a conta Asaas de produção (hoje só sandbox).

## Brand Commitments

Só o **nome USAI** é fixo, por decisão do autor. Logo, paleta, tipografia, cantos recortados e a frase "vizinhos
que compartilham" são do visual atual e **podem ser substituídos** no redesenho.

## Evidence on Hand

- Não há depoimentos, clientes, números de uso, imprensa nem casos de sucesso, e nada disso deve ser inventado.
- Existem: o produto funcionando de ponta a ponta no sandbox, a Wiki do repositório, o diário de
  desenvolvimento (`docs/progresso.md`) e testes automatizados (backend 627, frontend 322).
- Canais de suporte reais: WhatsApp (47) 99925-2028 e e-mail usaisuporte@gmail.com.

## Product Principles

1. Afirmar só o que o sistema faz hoje: nada de prova social, número ou promessa jurídica inventados.
2. O condomínio é o centro: sempre "condomínio" (nunca "conta do síndico") e sempre isolado dos demais.
3. Segurança e responsabilidade visíveis em cada negociação (aprovação, PIX confirmado, termo, histórico).
4. Os dois públicos se sentem em casa: o síndico entende o valor e contrata com confiança; o morador faz tudo
   no celular, sem atrito.
5. Clareza antes de enfeite: o dinheiro, os prazos e o que acontece a seguir sempre aparecem de forma explícita.

## Accessibility & Inclusion

Uso predominante no celular, por moradores de perfis variados (inclusive idosos). Alvos de toque de pelo menos
44 px e contraste legível são requisitos práticos; não há um padrão formal (como WCAG AA) declarado pelo autor.
