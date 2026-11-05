---
name: USAI — A Fachada
description: Um prédio brasileiro visto à noite; cada janela acesa é um vizinho com algo para emprestar.
colors:
  noite: '#0D3B44'
  noite-fundo: '#092A31'
  predio: '#14505B'
  predio-claro: '#1B6672'
  luz: '#FFC24B'
  luz-clara: '#FFE19A'
  luz-escura: '#C98A12'
  coral: '#FF6B4A'
  coral-escuro: '#D94A2B'
  coral-texto: '#B8361A'
  folha: '#6BC28A'
  folha-escura: '#2F8F57'
  folha-texto: '#1E6B3E'
  papel: '#FFF8EC'
  papel-suave: '#B7CFCB'
  tinta: '#0B2A30'
  tinta-suave: '#36565B'
typography:
  display:
    fontFamily: 'Bricolage Grotesque, system-ui, sans-serif'
    fontSize: '4.1rem'
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: '-0.035em'
  titulo:
    fontFamily: 'Bricolage Grotesque, system-ui, sans-serif'
    fontSize: '3rem'
    fontWeight: 800
    lineHeight: 1.04
    letterSpacing: '-0.03em'
  display-celular:
    fontFamily: 'Bricolage Grotesque, system-ui, sans-serif'
    fontSize: '2.55rem'
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: '-0.035em'
  titulo-celular:
    fontFamily: 'Bricolage Grotesque, system-ui, sans-serif'
    fontSize: '2rem'
    fontWeight: 800
    lineHeight: 1.04
    letterSpacing: '-0.03em'
  titulo-cartao:
    fontFamily: 'Bricolage Grotesque, system-ui, sans-serif'
    fontSize: '1.7rem'
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: '-0.025em'
  chamada-final:
    fontFamily: 'Bricolage Grotesque, system-ui, sans-serif'
    fontSize: '2.1rem'
    fontWeight: 800
    lineHeight: 1.03
    letterSpacing: '-0.035em'
  preco:
    fontFamily: 'Bricolage Grotesque, system-ui, sans-serif'
    fontSize: '2.7rem'
    fontWeight: 800
    lineHeight: 1
    letterSpacing: '-0.02em'
  corpo:
    fontFamily: 'Public Sans, system-ui, sans-serif'
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: 1.6
  corpo-pequeno:
    fontFamily: 'Public Sans, system-ui, sans-serif'
    fontSize: '0.95rem'
    fontWeight: 400
    lineHeight: 1.6
  bilhete:
    fontFamily: 'Caveat, Segoe Script, cursive'
    fontSize: '1.65rem'
    fontWeight: 700
    lineHeight: 1.15
rounded:
  janela: '7px'
  botao: '14px'
  bilhete: '14px'
  bloco: '26px'
components:
  botao-escuro:
    backgroundColor: '{colors.tinta}'
    textColor: '{colors.papel}'
    rounded: '{rounded.botao}'
    height: '52px'
    padding: '0 26px'
  botao-coral:
    backgroundColor: '{colors.coral}'
    textColor: '{colors.tinta}'
    rounded: '{rounded.botao}'
    height: '52px'
    padding: '0 26px'
  botao-luz:
    backgroundColor: '{colors.luz}'
    textColor: '{colors.tinta}'
    rounded: '{rounded.botao}'
    height: '52px'
    padding: '0 26px'
  bilhete:
    backgroundColor: '{colors.papel}'
    textColor: '{colors.tinta}'
    rounded: '{rounded.bilhete}'
    padding: '16px 24px'
  plano-destaque:
    backgroundColor: '{colors.luz}'
    textColor: '{colors.tinta}'
    rounded: '{rounded.bloco}'
    padding: '36px 28px 28px'
---

# Design System: USAI — A Fachada

## Overview

**A Fachada** é a identidade visual da USAI desde a tela inicial: um prédio de apartamentos brasileiro visto de
frente, à noite, em que cada janela é um vizinho. Emprestar é uma janela acendendo; a cestinha de corda desce
com o item. O tom é caloroso e específico, nunca institucional: cores chapadas, ilustração desenhada para esta
marca e nenhum material fingido (sem metal, granito, vidro ou gradiente decorativo).

Substitui a identidade anterior (papel creme, fonte serifada e terracota). A tela inicial já usa o sistema; o app
(catálogo, locações, mural, painéis) ainda usa os tokens antigos e será migrado em etapas.

## Colors

Estratégia **comprometida**: cada seção é um campo de cor inteiro, nunca um acento solto.

- **Noite (`noite`, `noite-fundo`)**: o céu e o fundo das seções escuras. Texto sobre ele: `papel` (11,5:1) e
  `papel-suave` (7,4:1).
- **Prédio (`predio`, `predio-claro`)**: a fachada e as faixas médias. `papel-suave` sobre `predio-claro` não
  passa (4,0:1); nesse fundo use `papel`.
- **Coral (`coral`)**: a parede pintada com o título e o botão de compra. Texto sobre coral: `tinta` (5,4:1).
  Para texto pequeno sobre claro use `coral-texto` (5,6:1); `coral-escuro` é só para elementos grandes e
  decorativos.
- **Luz (`luz`)**: janela acesa, destaque do plano, o dinheiro (seção dos 10%). Texto sobre ela: `tinta` (9,4:1).
- **Folha (`folha`)**: "disponível". Sobre claro use `folha-texto` (6,2:1), nunca `folha`.
- **Papel (`papel`)**: o bilhete, os cartões de plano e a seção de segurança. Texto: `tinta` (14,3:1) e
  `tinta-suave` (7,5:1).

## Typography

- **Bricolage Grotesque** (800) para títulos, em caixa mista, com tracking apertado (−0,03em). Tem personalidade
  suficiente para não parecer fonte de sistema.
- **Public Sans** para texto corrido: 16 px, entrelinha 1,6, medida de 65 a 75 caracteres.
- **Caveat** (700) só para o "bilhete do vizinho": a chamada à interação na cena, o número dos passos e o título
  do exemplo dos 10%. Nunca para parágrafos.

## Layout

A primeira dobra é uma **cena de rua** de ponta a ponta: a empena coral com o título à esquerda, o prédio das
janelas à direita, os dois pisando na mesma calçada, e embaixo a rua com o bilhete. As seções seguintes alternam
campos de cor (noite, prédio, papel, luz, coral) e variam a densidade: janelas ilustradas escalonadas, linha do
tempo, grade de regras, bloco escuro de responsabilidade. Miolo de até 1536 px; margens de 20 px no celular e
48 px no desktop. O espaço acima de um título é maior que abaixo.

## Elevation & Depth

Profundidade só por **sombras suaves com deslocamento e desfoque** (`0 12px 22px -10px`), nunca bloco duro. A luz
das janelas acesas ganha um halo (`drop-shadow` açafrão). Nada de vidro, blur de fundo ou gradiente decorativo.

## Shapes

Arredondado e amigável: janelas com 7 px, botões e bilhetes com 14 px, blocos e planos com 26 px. O bilhete tem
−1° de inclinação; os passos de "Seu condomínio no ar" alternam ±1°. Pictogramas de traço único (2 px, pontas
redondas) em círculo coral.

## Components

- **Botões**: `botao-escuro` (ação principal sobre cor viva), `botao-coral` (sobre fundo claro), `botao-luz`
  (sobre fundo escuro) e `botao-contorno` (secundário). 52 px de altura; sobem 3 px ao passar o mouse e afundam
  ao clicar.
- **Janela da cena**: acende em cascata ao carregar; as que têm item são botões (Enter e Espaço funcionam) e
  mostram o item no bilhete; "Pedir emprestado" vira a janela coral.
- **Bilhete**: papel, Caveat, −1°; é onde a cena responde ao toque.
- **Plano**: cartão claro de 26 px; o recomendado é açafrão, sobe 12 px e leva a etiqueta coral.
- **Perguntas**: blocos `predio` que abrem com deslize e o botão `+` açafrão girando 45°.

## Do's and Don'ts

- **Faça** uma ação principal por tela e deixe-a no maior contraste (botão escuro sobre coral).
- **Faça** todo estado ser forma ou luz (janela acesa, coral reservado), nunca só cor.
- **Faça** a animação ter motivo (acender, descer a cesta, desenhar o fio) e respeitar "reduzir movimento".
- **Não** use creme com serifa e terracota, metal escovado, granito, gradiente em texto nem sombra dura.
- **Não** coloque etiqueta pequena acima de título, nem numere seções sem que a sequência importe.
- **Não** use `papel-suave` sobre `predio-claro`, `folha` como texto sobre claro nem `coral-escuro` em texto
  pequeno.
- **Não** invente depoimentos, clientes ou números: os apartamentos e itens da cena são fictícios e dizem isso.
