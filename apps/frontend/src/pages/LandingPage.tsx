import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { MarcaUsai } from '@/components/ui/MarcaUsai';
import { PlanosPrecos } from '@/features/assinaturas/PlanosPrecos';
import { useConfiguracao } from '@/features/configuracao/ConfiguracaoContext';

function Icone({ children }: { children: ReactNode }) {
  return (
    <span className="notch-sm flex h-11 w-11 shrink-0 items-center justify-center bg-barro-100 text-barro-700">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6"
        aria-hidden="true"
      >
        {children}
      </svg>
    </span>
  );
}

interface Cartao {
  titulo: string;
  texto: string;
  icone: ReactNode;
}

const PILARES: Cartao[] = [
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
      'Precisa de um eletricista, uma maquiadora, uma diarista ou aulas particulares? Peça no Mural e quem presta o serviço no condomínio responde. Você também pode divulgar o seu trabalho para os vizinhos.',
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

const PASSOS = [
  {
    titulo: 'Anuncie ou procure',
    texto:
      'Publique o que está parado em casa — com foto, fabricante, modelo e acessórios — ou encontre no catálogo o que seus vizinhos oferecem.',
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

const SEGURANCA: Cartao[] = [
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

const RESPONSABILIDADES = [
  'Quem aluga responde pela guarda e pela conservação do item enquanto ele estiver com você.',
  'O item só pode ser usado para a finalidade informada e durante o período combinado.',
  'É vedado emprestar, ceder ou sublocar o item a terceiros sem autorização do dono.',
  'Perda, dano, defeito ou qualquer incidente deve ser avisado na hora ao dono e, se for o caso, ao síndico.',
  'A devolução é no estado registrado na retirada, ressalvado o desgaste natural do uso adequado.',
];

const DESTINO_DO_CAIXA = [
  {
    titulo: '10% de cada locação fica com o condomínio',
    texto:
      'De todo aluguel pago pela plataforma, 10% vão para o condomínio, e o dono do item recebe os outros 90%.',
  },
  {
    titulo: 'Extrato detalhado, sem caixa-preta',
    texto:
      'O condomínio acompanha de qual locação veio cada valor, qual taxa foi aplicada e quanto já foi retirado, com recibo de cada operação.',
  },
  {
    titulo: 'Dinheiro para melhorias internas',
    texto:
      'Pintura, jardim, equipamentos, pequenos reparos: o condomínio decide o destino, e a USAI registra tudo. Quanto mais os vizinhos compartilham, mais o caixa cresce.',
  },
];

const CONTRATACAO = [
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

const PERGUNTAS = [
  {
    pergunta: 'Quem pode participar?',
    resposta:
      'Só moradores do condomínio que contratou a USAI. O cadastro exige o link e o PIN que o síndico compartilha, e cada condomínio enxerga apenas os próprios itens.',
  },
  {
    pergunta: 'Como o dono do item recebe?',
    resposta:
      'Quando o PIX é confirmado, o valor do aluguel, já descontados os 10% do condomínio, entra no saldo do dono. Ele pede o saque pelo próprio app e acompanha tudo no extrato, com recibo.',
  },
  {
    pergunta: 'E se o item estragar ou se perder?',
    resposta:
      'O estado e os acessórios são conferidos e registrados na retirada e de novo na devolução. O termo diz que quem alugou responde pela guarda e pela conservação e deve avisar o dono e o síndico de qualquer incidente. A plataforma documenta o que aconteceu; a solução é combinada entre as partes, com o síndico quando for preciso.',
  },
  {
    pergunta: 'Posso pedir ou oferecer serviços?',
    resposta:
      'Sim. No Mural você pede ajuda (eletricista, maquiadora, diarista, aulas particulares e o que mais precisar) e quem presta o serviço no condomínio responde. Dá para divulgar o seu trabalho aos vizinhos também. Valor e horário são combinados direto pelo chat privado.',
  },
  {
    pergunta: 'Os moradores pagam mensalidade?',
    resposta:
      'Não. Quem assina um plano é o condomínio, pelo síndico. Na locação, o locatário paga o valor combinado e, desse valor, 10% vão para o condomínio e 90% para o dono do item.',
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

/** Cartões de exemplo (ilustração da tela inicial, não são dados reais). */
function Ilustracao() {
  return (
    <div
      className="relative mx-auto flex w-full max-w-sm flex-col gap-3 lg:max-w-md"
      aria-hidden="true"
    >
      <div className="notch border border-paper-line bg-paper-surface p-4 shadow-paper-2">
        <p className="font-meta text-[10px] uppercase tracking-wide text-ink-faint">Catálogo</p>
        <p className="mt-1 font-display text-lg font-bold text-ink">Furadeira de impacto</p>
        <p className="text-sm text-ink-soft">Maleta e jogo de brocas inclusos</p>
        <p className="mt-2 font-display font-semibold text-barro-700">R$ 20,00 / dia</p>
      </div>
      <div className="notch ml-6 border border-paper-line bg-paper-surface p-4 shadow-paper">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink">
          <span className="h-2.5 w-2.5 rounded-full bg-jade-500" />
          Pagamento confirmado via PIX
        </p>
        <p className="mt-1 text-xs text-ink-soft">O período está reservado para você.</p>
      </div>
      <div className="notch mr-6 border border-paper-line bg-paper-surface p-4 shadow-paper">
        <p className="font-meta text-[10px] uppercase tracking-wide text-ink-faint">
          Termo de retirada
        </p>
        <p className="mt-1 text-sm text-ink">☑ Recebi o item e conferi o estado de conservação.</p>
        <p className="text-xs text-jade-700">✔ Assinado e verificado</p>
      </div>
      <div className="absolute -right-3 -top-4 rotate-6 opacity-95">
        <MarcaUsai tamanho={44} />
      </div>
      <p className="text-center text-[11px] text-ink-faint">Exemplo ilustrativo</p>
    </div>
  );
}

/** Quanto de cada R$ 100 alugados fica com o dono e com o condomínio (exemplo ilustrativo). */
function DivisaoDoAluguel() {
  return (
    <div className="notch border border-paper-line bg-paper-surface p-6 shadow-paper-2">
      <p className="font-meta text-xs uppercase tracking-wide text-ink-faint">
        Exemplo: um aluguel de R$ 100,00
      </p>
      <div
        className="mt-4 flex h-4 w-full overflow-hidden"
        role="img"
        aria-label="90% para o dono do item e 10% para o condomínio"
      >
        <div className="h-full bg-barro-500" style={{ width: '90%' }} />
        <div className="h-full bg-jade-500" style={{ width: '10%' }} />
      </div>
      <dl className="mt-4 flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="flex items-center gap-2 text-sm text-ink">
            <span className="h-3 w-3 bg-barro-500" aria-hidden="true" />
            Para o morador dono do item
          </dt>
          <dd className="font-display text-xl font-bold text-ink">R$ 90,00</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="flex items-center gap-2 text-sm text-ink">
            <span className="h-3 w-3 bg-jade-500" aria-hidden="true" />
            Para o condomínio
          </dt>
          <dd className="font-display text-xl font-bold text-jade-700">R$ 10,00</dd>
        </div>
      </dl>
      <p className="mt-4 border-t border-dashed border-paper-line pt-3 text-xs text-ink-faint">
        Cada centavo aparece no extrato do dono e no do condomínio, com a origem e a taxa aplicada.
      </p>
    </div>
  );
}

export function LandingPage() {
  const { configuracao } = useConfiguracao();

  return (
    <div className="min-h-screen bg-paper bg-cortica bg-cortica-grid">
      <header className="mx-auto flex max-w-screen-2xl items-center justify-between px-6 py-6 lg:px-12">
        <Logo altura={40} className="text-ink" />
        <nav className="flex items-center gap-1 sm:gap-3" aria-label="Principal">
          <a
            href="#como-funciona"
            className="hidden px-3 py-2 font-semibold text-ink-soft hover:text-ink lg:block"
          >
            Como funciona
          </a>
          <a
            href="#seguranca"
            className="hidden px-3 py-2 font-semibold text-ink-soft hover:text-ink lg:block"
          >
            Segurança
          </a>
          <a
            href="#planos"
            className="hidden px-3 py-2 font-semibold text-ink-soft hover:text-ink sm:block"
          >
            Planos
          </a>
          <Link to="/login" className="px-3 py-2 font-semibold text-ink-soft hover:text-ink">
            Entrar
          </Link>
          <Link
            to="/contratar"
            className="notch min-h-[44px] bg-barro-500 px-4 py-2 font-bold text-paper-surface
              shadow-press hover:bg-barro-700"
          >
            Contratar
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-screen-2xl items-center gap-12 px-6 py-14 md:grid-cols-[1.1fr_1fr] md:py-24 lg:gap-16 lg:px-12">
          <div>
            <span className="notch-sm bg-barro-100 px-3 py-1 font-meta text-xs uppercase tracking-wider text-barro-700">
              para condomínios residenciais
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[0.98] tracking-tight text-ink sm:text-5xl lg:text-6xl xl:text-7xl">
              Itens e serviços entre vizinhos, com segurança e regras claras
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft lg:text-xl">
              Chega de grupo de WhatsApp perdido. A USAI organiza o empréstimo e a locação de itens,
              e a procura por serviços, dentro do seu condomínio: catálogo, aprovação, pagamento por
              PIX, termo de responsabilidade e histórico em um só lugar. E o condomínio ainda recebe
              10% de cada locação.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/contratar"
                className="notch min-h-[44px] bg-barro-500 px-6 py-3 font-bold text-paper-surface
                  shadow-press hover:bg-barro-700"
              >
                Contratar para meu condomínio
              </Link>
              <Link
                to="/login"
                className="notch min-h-[44px] border-[1.5px] border-ink bg-paper-surface px-6 py-3
                  font-bold text-ink hover:bg-paper"
              >
                Já tenho conta
              </Link>
            </div>
            <p className="mt-5 text-sm text-ink-soft">
              Seu condomínio já usa a USAI?{' '}
              <Link to="/cadastro" className="font-semibold text-barro-700 hover:underline">
                Cadastre-se com o link do síndico
              </Link>
            </p>
          </div>
          <Ilustracao />
        </section>

        <section className="mx-auto max-w-screen-2xl px-6 pb-6 pt-4 lg:px-12">
          <h2 className="font-display text-3xl font-bold text-ink lg:text-4xl">
            Muito além de itens parados
          </h2>
          <p className="mt-1 max-w-2xl text-ink-soft">
            Tudo o que um vizinho pode oferecer ou precisar, num ambiente só do seu condomínio.
          </p>
          <ul className="mt-8 grid gap-5 md:grid-cols-3">
            {PILARES.map((pilar) => (
              <li
                key={pilar.titulo}
                className="notch flex flex-col gap-3 border border-paper-line bg-paper-surface p-6 shadow-paper"
              >
                <Icone>{pilar.icone}</Icone>
                <h3 className="font-display text-xl font-semibold text-ink">{pilar.titulo}</h3>
                <p className="text-sm leading-relaxed text-ink-soft">{pilar.texto}</p>
              </li>
            ))}
          </ul>
        </section>

        <section
          id="como-funciona"
          className="mt-14 scroll-mt-6 border-y border-paper-line bg-paper-surface/70"
        >
          <div className="mx-auto max-w-screen-2xl px-6 py-14 lg:px-12">
            <h2 className="font-display text-3xl font-bold text-ink lg:text-4xl">Como funciona</h2>
            <p className="mt-1 text-ink-soft">
              Do anúncio à devolução, cada etapa fica registrada.
            </p>
            <ol className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {PASSOS.map((passo, indice) => (
                <li key={passo.titulo} className="flex flex-col gap-2">
                  <span className="notch-sm flex h-10 w-10 items-center justify-center bg-ink font-display text-lg font-bold text-ink-inverse">
                    {indice + 1}
                  </span>
                  <h3 className="font-display text-lg font-semibold text-ink">{passo.titulo}</h3>
                  <p className="text-sm leading-relaxed text-ink-soft">{passo.texto}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          id="seguranca"
          className="mx-auto max-w-screen-2xl scroll-mt-6 px-6 py-16 lg:px-12"
        >
          <h2 className="font-display text-3xl font-bold text-ink lg:text-4xl">
            Segurança em cada negociação
          </h2>
          <p className="mt-1 max-w-2xl text-ink-soft">
            Negociar com vizinho é confortável, mas combinado sem registro dá dor de cabeça. Por
            isso cada etapa tem regra e deixa rastro.
          </p>
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SEGURANCA.map((item) => (
              <li
                key={item.titulo}
                className="notch flex flex-col gap-3 border border-paper-line bg-paper-surface p-6 shadow-paper"
              >
                <Icone>{item.icone}</Icone>
                <h3 className="font-display text-lg font-semibold text-ink">{item.titulo}</h3>
                <p className="text-sm leading-relaxed text-ink-soft">{item.texto}</p>
              </li>
            ))}
          </ul>

          <div className="notch mt-8 grid gap-6 border border-paper-line bg-paper-surface p-6 shadow-paper-2 lg:grid-cols-[1fr_1.4fr] lg:p-8">
            <div>
              <h3 className="font-display text-2xl font-bold text-ink">
                Quem responde pelo material alugado?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                Isso fica combinado antes de o item sair da casa do dono. O termo de
                responsabilidade, aceito na retirada, registra o que cada um assumiu.
              </p>
            </div>
            <ul className="flex flex-col gap-2.5 text-sm text-ink">
              {RESPONSABILIDADES.map((regra) => (
                <li key={regra} className="flex gap-2.5">
                  <span aria-hidden="true" className="mt-0.5 text-jade-700">
                    ✓
                  </span>
                  {regra}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-y border-paper-line bg-paper-surface/70">
          <div className="mx-auto grid max-w-screen-2xl items-center gap-10 px-6 py-16 lg:grid-cols-[1.2fr_1fr] lg:gap-16 lg:px-12">
            <div>
              <h2 className="font-display text-3xl font-bold text-ink lg:text-4xl">
                O condomínio também ganha
              </h2>
              <p className="mt-2 max-w-2xl text-ink-soft">
                Quando os vizinhos compartilham, o condomínio é remunerado. Não é um favor: faz
                parte do funcionamento da plataforma.
              </p>
              <ul className="mt-6 flex flex-col gap-5">
                {DESTINO_DO_CAIXA.map((item) => (
                  <li key={item.titulo} className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className="notch-sm mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center bg-jade-500 text-sm font-bold text-jade-100"
                    >
                      ✓
                    </span>
                    <div>
                      <h3 className="font-display text-lg font-semibold text-ink">{item.titulo}</h3>
                      <p className="text-sm leading-relaxed text-ink-soft">{item.texto}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <DivisaoDoAluguel />
          </div>
        </section>

        <section className="mx-auto max-w-screen-2xl px-6 py-14 lg:px-12">
          <h2 className="font-display text-3xl font-bold text-ink lg:text-4xl">
            Seu condomínio no ar
          </h2>
          <p className="mt-1 text-ink-soft">Do pagamento ao primeiro vizinho cadastrado.</p>
          <ol className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {CONTRATACAO.map((passo, indice) => (
              <li key={passo.titulo} className="flex flex-col gap-2">
                <span className="notch-sm flex h-10 w-10 items-center justify-center bg-barro-500 font-display text-lg font-bold text-paper-surface">
                  {indice + 1}
                </span>
                <h3 className="font-display text-lg font-semibold text-ink">{passo.titulo}</h3>
                <p className="text-sm leading-relaxed text-ink-soft">{passo.texto}</p>
              </li>
            ))}
          </ol>
        </section>

        <PlanosPrecos />

        <section id="perguntas" className="mx-auto max-w-4xl scroll-mt-6 px-6 py-16">
          <h2 className="font-display text-3xl font-bold text-ink lg:text-4xl">
            Perguntas frequentes
          </h2>
          <div className="mt-8 flex flex-col gap-3">
            {PERGUNTAS.map((item) => (
              <details
                key={item.pergunta}
                className="notch group border border-paper-line bg-paper-surface px-5 py-4 shadow-paper"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-semibold text-ink">
                  {item.pergunta}
                  <span
                    aria-hidden="true"
                    className="text-xl text-barro-700 transition group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">{item.resposta}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="bg-ink text-ink-inverse">
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-6 py-14 text-center">
            <MarcaUsai tamanho={56} />
            <h2 className="font-display text-3xl font-bold">
              Seu condomínio já tem tudo que precisa
            </h2>
            <p className="max-w-xl text-ink-inverse-soft">
              Só falta organizar. Contrate o plano, compartilhe o link com os vizinhos e comece a
              emprestar.
            </p>
            <Link
              to="/contratar"
              className="notch mt-2 min-h-[44px] bg-barro-500 px-6 py-3 font-bold text-paper-surface
                shadow-press hover:bg-barro-400"
            >
              Contratar para o meu condomínio
            </Link>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-screen-2xl flex-col gap-3 px-6 py-8 text-sm text-ink-soft lg:px-12">
        <Logo altura={28} className="text-ink" />
        <p className="max-w-2xl text-xs text-ink-faint">{configuracao.rodapeInstitucional}</p>
        <p className="text-xs text-ink-faint">{configuracao.nomeInstitucional}</p>
      </footer>
    </div>
  );
}
