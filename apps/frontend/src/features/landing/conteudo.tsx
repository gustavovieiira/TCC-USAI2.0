import { ReactNode } from 'react';

/** Textos da tela inicial (só o que o sistema realmente faz hoje; nada de prova social inventada). */
export interface Cartao {
  titulo: string;
  texto: string;
  icone: ReactNode;
}

export const PILARES: Cartao[] = [
  {
    titulo: 'Itens que estão parados',
    texto:
      'Furadeira, escada, barraca, cadeirinha de bebê, jogo de taças. Anuncie com foto, fabricante, modelo e acessórios e receba por diária, ou alugue o que precisa só por alguns dias.',
    icone: (
      <>
        <path d="M3 7l9-4 9 4-9 4-9-4z" />
        <path d="M3 7v10l9 4 9-4V7M12 11v10" />
      </>
    ),
  },
  {
    titulo: 'Serviços e ajuda de quem mora aqui',
    texto:
      'Precisa de um eletricista, uma maquiadora, uma manicure ou aulas particulares? Veja os serviços que os vizinhos oferecem no catálogo, com o valor por hora ou por serviço, e converse pelo chat. Também dá para divulgar o seu trabalho, ou pedir ajuda no Mural.',
    icone: (
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.4 2.4-2.6-.6-.6-2.6 2.6-2.2z" />
    ),
  },
  {
    titulo: 'Vizinhança conectada',
    texto:
      'Avisos do síndico, recados e conversas privadas num só lugar. Combine valor, horário e detalhes direto com o dono do item ou com quem presta o serviço, sem grupo perdido.',
    icone: (
      <>
        <path d="M4 5h16v10H9l-4 4v-4H4V5z" />
        <path d="M8 9h8M8 12h5" />
      </>
    ),
  },
];

export const PASSOS = [
  {
    titulo: 'Anuncie ou procure',
    texto:
      'Publique o que está parado em casa, com foto, fabricante, modelo e acessórios, ou encontre no catálogo o que seus vizinhos oferecem.',
  },
  {
    titulo: 'Combine e aprove',
    texto:
      'Peça o item, informe pra que vai usar e converse direto com o dono. Ele aprova o pedido quando fizer sentido.',
  },
  {
    titulo: 'Pague por PIX',
    texto:
      'O pagamento confirma sozinho. Quem pagar primeiro garante o período, e o dono vê o valor no extrato na hora.',
  },
  {
    titulo: 'Retire e devolva com termo',
    texto:
      'Na entrega e na devolução, quem recebe confere o estado do item e assina o termo de responsabilidade. Tudo vira um documento numerado.',
  },
];

export const SEGURANCA: Cartao[] = [
  {
    titulo: 'Só vizinhos',
    texto:
      'O cadastro exige o link e o PIN que o síndico compartilha. Cada condomínio é um ambiente fechado: você só vê e negocia com quem mora com você.',
    icone: (
      <>
        <path d="M3 21V9l9-6 9 6v12" />
        <path d="M9 21v-6h6v6" />
      </>
    ),
  },
  {
    titulo: 'O dono decide',
    texto:
      'Todo pedido passa pela aprovação de quem emprestou, que vê a finalidade informada e conversa antes de aceitar.',
    icone: <path d="M5 12l4 4 10-10" />,
  },
  {
    titulo: 'Pagamento confirmado sozinho',
    texto:
      'PIX com confirmação automática pela plataforma de pagamento. O período só fica reservado depois de pago, e cada valor entra no extrato.',
    icone: (
      <>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M3 10h18M7 15h3" />
      </>
    ),
  },
  {
    titulo: 'Termo de responsabilidade',
    texto:
      'Na retirada e na devolução, quem recebe confere o estado e os acessórios e aceita o termo, que deixa claro quem responde pelo material em cada etapa.',
    icone: (
      <>
        <path d="M7 3h8l4 4v14H7z" />
        <path d="M15 3v4h4M10 12h6M10 16h6" />
      </>
    ),
  },
  {
    titulo: 'Aceite com a sua senha',
    texto:
      'Para aceitar o termo é preciso digitar a senha de novo, e o sistema registra data e hora. Ninguém assina por engano.',
    icone: (
      <>
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </>
    ),
  },
  {
    titulo: 'Documento e histórico',
    texto:
      'Cada retirada e devolução vira um documento numerado e imprimível, com histórico que não pode ser apagado e verificação de integridade.',
    icone: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
  },
];

export const RESPONSABILIDADES = [
  'Quem aluga responde pela guarda e pela conservação do item enquanto ele estiver com você.',
  'O item só pode ser usado para a finalidade informada e durante o período combinado.',
  'É vedado emprestar, ceder ou sublocar o item a terceiros sem autorização do dono.',
  'Perda, dano, defeito ou qualquer incidente deve ser avisado na hora ao dono e, se for o caso, ao síndico.',
  'A devolução é no estado registrado na retirada, ressalvado o desgaste natural do uso adequado.',
];

export const DESTINO_DO_ALUGUEL = [
  {
    titulo: 'O aluguel vai para o dono do item',
    texto:
      'De cada aluguel pago pela plataforma, o dono recebe o valor pago menos a taxa do PIX, cobrada pelo Asaas. A USAI não fica com uma porcentagem do aluguel.',
  },
  {
    titulo: 'Extrato detalhado, sem caixa-preta',
    texto:
      'Cada aluguel mostra o valor pago, a taxa do PIX e o que entrou no saldo do dono, com recibo de cada operação. Se o condomínio combinar uma comissão, ela aparece separada.',
  },
  {
    titulo: 'Saque quando quiser',
    texto:
      'O dono pede o saque pelo próprio app, informa a chave PIX e acompanha o pedido até o dinheiro chegar.',
  },
];

export const CONTRATACAO = [
  {
    titulo: 'Escolha o plano',
    texto: 'O preço depende da quantidade de moradores. Use o calculador na seção de planos.',
  },
  {
    titulo: 'Cadastre e pague por PIX',
    texto: 'Informe os dados do condomínio e do síndico e pague o primeiro período.',
  },
  {
    titulo: 'Receba o acesso por e-mail',
    texto: 'Com o pagamento confirmado, chega o link para criar a sua senha e entrar.',
  },
  {
    titulo: 'Convide os moradores',
    texto: 'No painel do síndico estão o link e o PIN do condomínio, prontos para compartilhar.',
  },
];

export const PERGUNTAS = [
  {
    pergunta: 'Quem pode participar?',
    resposta:
      'Só moradores do condomínio que contratou a USAI. O cadastro exige o link e o PIN que o síndico compartilha, e cada condomínio enxerga apenas os próprios itens.',
  },
  {
    pergunta: 'Como o dono do item recebe?',
    resposta:
      'Quando o PIX é confirmado, o valor do aluguel, já descontada a taxa do PIX, entra no saldo do dono. Ele pede o saque pelo próprio app e acompanha tudo no extrato, com recibo.',
  },
  {
    pergunta: 'E se o item estragar ou se perder?',
    resposta:
      'O estado e os acessórios são conferidos e registrados na retirada e de novo na devolução. O termo diz que quem alugou responde pela guarda e pela conservação e deve avisar o dono e o síndico de qualquer incidente. A plataforma documenta o que aconteceu; a solução é combinada entre as partes, com o síndico quando for preciso.',
  },
  {
    pergunta: 'Posso pedir ou oferecer serviços?',
    resposta:
      'Sim. No catálogo, os moradores divulgam serviços (eletricista, maquiagem, unha, aulas e o que mais fizerem) com o valor por hora ou por serviço. Você conversa pelo chat privado e combina data, horário e pagamento direto com quem presta, fora da plataforma: a USAI não cobra taxa nem se responsabiliza pelo serviço. Também dá para pedir ajuda no Mural.',
  },
  {
    pergunta: 'Os moradores pagam mensalidade?',
    resposta:
      'Não. Quem assina um plano é o condomínio, pelo síndico. Na locação, o locatário paga o valor combinado e o dono do item recebe esse valor, menos a taxa do PIX.',
  },
  {
    pergunta: 'Qual o valor mínimo de um aluguel?',
    resposta:
      'A diária de um item precisa ser de pelo menos R$ 5,00. É o menor valor que a cobrança por PIX aceita, e a plataforma barra valores menores já na hora de publicar, para nenhum pedido ficar sem como ser pago.',
  },
  {
    pergunta: 'Posso trocar de plano ou de período?',
    resposta:
      'Sim. Na renovação o síndico escolhe entre mensal, trimestral, semestral e anual, e o painel mostra o preço e a economia de cada um. O limite do plano conta as contas de moradores cadastradas.',
  },
  {
    pergunta: 'O que acontece se a mensalidade vencer?',
    resposta:
      'Há 5 dias de tolerância. Depois disso o acesso dos moradores fica suspenso até o síndico pagar o PIX da renovação. O síndico continua entrando no painel para poder pagar.',
  },
];
