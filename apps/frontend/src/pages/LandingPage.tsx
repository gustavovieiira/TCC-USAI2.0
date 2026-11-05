import { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { JanelasAcendendo } from '@/components/fachada/JanelasAcendendo';
import { Logo } from '@/components/ui/Logo';
import { PlanosPrecos } from '@/features/assinaturas/PlanosPrecos';
import { useConfiguracao } from '@/features/configuracao/ConfiguracaoContext';
import { CenaHero } from '@/features/landing/CenaHero';
import { RodapeLanding } from '@/features/landing/RodapeLanding';
import {
  CONTRATACAO,
  DESTINO_DO_CAIXA,
  PASSOS,
  PERGUNTAS,
  PILARES,
  RESPONSABILIDADES,
  SEGURANCA,
} from '@/features/landing/conteudo';
import { JanelaItens, JanelaServicos, JanelaVizinhos } from '@/features/landing/JanelasIlustradas';
import { Revelar, useNaTela } from '@/features/landing/revelar';

const MIOLO = 'mx-auto max-w-screen-2xl px-5 sm:px-8 lg:px-12';
const LINK_NAV =
  'px-3 py-2 font-marca text-[0.98rem] font-semibold text-fachada-papel-suave transition-colors hover:text-fachada-papel';

const JANELAS_DOS_PILARES = [JanelaItens, JanelaServicos, JanelaVizinhos];
const DESLOCAMENTO_DOS_PILARES = ['md:mt-0', 'md:mt-10', 'md:mt-4'];

function Titulo({
  children,
  apoio,
  escuro = true,
}: {
  children: ReactNode;
  apoio?: ReactNode;
  escuro?: boolean;
}) {
  return (
    <div>
      <h2
        className={`font-marca text-[2rem] font-extrabold leading-[1.04] tracking-[-0.03em] sm:text-5xl ${
          escuro ? 'text-fachada-papel' : 'text-fachada-tinta'
        }`}
      >
        {children}
      </h2>
      {apoio && (
        <p
          className={`mt-3 max-w-2xl text-base leading-relaxed sm:text-lg ${
            escuro ? 'text-fachada-papel-suave' : 'text-fachada-tinta-suave'
          }`}
        >
          {apoio}
        </p>
      )}
    </div>
  );
}

function Selo({ n, escuro = false }: { n: number; escuro?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-marca text-xl font-extrabold ${
        escuro ? 'bg-fachada-tinta text-fachada-luz' : 'bg-fachada-luz text-fachada-tinta'
      }`}
    >
      {n}
    </span>
  );
}

/** Pictograma de traço único num círculo coral (mesma linguagem das janelas). */
function Pictograma({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-fachada-coral">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="#0B2A30"
        strokeWidth="2"
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

/** Quanto de cada R$ 100 alugados fica com o dono e com o condomínio (exemplo ilustrativo). */
function DivisaoDoAluguel() {
  const [ref, naTela] = useNaTela<HTMLDivElement>();

  return (
    <div
      ref={ref}
      data-vivo={naTela}
      className="rounded-[28px] bg-fachada-tinta p-8 text-fachada-papel sm:p-10"
    >
      <p className="font-mao text-3xl font-bold leading-none text-fachada-luz">
        Exemplo: um aluguel de R$ 100,00
      </p>
      <div
        className="mt-6 flex h-7 w-full overflow-hidden rounded-full bg-fachada-noite"
        role="img"
        aria-label="90% para o dono do item e 10% para o condomínio"
      >
        <div
          className="barra-cresce h-full bg-fachada-papel"
          style={{ '--alvo': '90%' } as CSSProperties}
        />
        <div
          className="barra-cresce h-full bg-fachada-coral"
          style={{ '--alvo': '10%' } as CSSProperties}
        />
      </div>
      <dl className="mt-7 flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="flex items-center gap-2.5 text-sm text-fachada-papel-suave">
            <span className="h-3 w-3 rounded-full bg-fachada-papel" aria-hidden="true" />
            Para o morador dono do item
          </dt>
          <dd className="font-marca text-3xl font-extrabold tracking-tight">R$ 90,00</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="flex items-center gap-2.5 text-sm text-fachada-papel-suave">
            <span className="h-3 w-3 rounded-full bg-fachada-coral" aria-hidden="true" />
            Para o condomínio
          </dt>
          <dd className="font-marca text-3xl font-extrabold tracking-tight text-fachada-coral">
            R$ 10,00
          </dd>
        </div>
      </dl>
      <p className="mt-7 border-t border-fachada-papel/20 pt-4 text-xs text-fachada-papel-suave">
        Cada centavo aparece no extrato do dono e no do condomínio, com a origem e a taxa aplicada.
      </p>
    </div>
  );
}

/** Os quatro passos do "Como funciona", ligados por um fio que se desenha ao entrar na tela. */
function LinhaDoTempo() {
  const [ref, naTela] = useNaTela<HTMLOListElement>();

  return (
    <ol
      ref={ref}
      data-vivo={naTela}
      className="relative mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8"
    >
      <svg
        className="absolute left-6 right-6 top-6 hidden h-2 w-[calc(100%-3rem)] lg:block"
        preserveAspectRatio="none"
        viewBox="0 0 100 2"
        aria-hidden="true"
      >
        <path
          d="M0 1H100"
          pathLength={1}
          className="traco"
          style={{ '--comprimento': 1 } as CSSProperties}
          stroke="#FFC24B"
          strokeWidth="2"
          strokeDasharray="1"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          fill="none"
        />
      </svg>
      {PASSOS.map((passo, indice) => (
        <Revelar as="li" key={passo.titulo} atraso={indice * 140} className="relative">
          <Selo n={indice + 1} />
          <h3 className="mt-5 font-marca text-xl font-bold leading-tight text-fachada-papel">
            {passo.titulo}
          </h3>
          <p className="mt-2 text-[0.95rem] leading-relaxed text-fachada-papel-suave">
            {passo.texto}
          </p>
        </Revelar>
      ))}
    </ol>
  );
}

const INCLINACAO = ['-rotate-1', 'rotate-1', '-rotate-[0.5deg]', 'rotate-[1.2deg]'];

export function LandingPage() {
  const { configuracao } = useConfiguracao();

  return (
    <div id="topo" className="mundo-fachada min-h-screen font-sans">
      <div className="relative">
        <header
          className={`${MIOLO} absolute inset-x-0 top-0 z-20 flex items-center justify-between py-5`}
        >
          <Logo altura={38} className="text-fachada-papel" />
          <nav className="flex items-center gap-1 sm:gap-2" aria-label="Principal">
            <a href="#como-funciona" className={`hidden lg:block ${LINK_NAV}`}>
              Como funciona
            </a>
            <a href="#seguranca" className={`hidden lg:block ${LINK_NAV}`}>
              Segurança
            </a>
            <a href="#planos" className={`hidden sm:block ${LINK_NAV}`}>
              Planos
            </a>
            <Link to="/login" className={`hidden sm:block ${LINK_NAV}`}>
              Entrar
            </Link>
            <Link to="/contratar" className="botao-luz !min-h-[44px] !px-4 !text-[0.95rem]">
              Contratar
            </Link>
          </nav>
        </header>

        <div className="pt-20 lg:pt-24">
          <CenaHero />
        </div>
      </div>

      <main>
        <section className={`${MIOLO} py-20`}>
          <Revelar>
            <Titulo apoio="Tudo o que um vizinho pode oferecer ou precisar, num ambiente só do seu condomínio.">
              Muito além de itens parados
            </Titulo>
          </Revelar>
          <ul className="mt-12 grid gap-12 md:grid-cols-3 md:gap-8">
            {PILARES.map((pilar, indice) => {
              const Janela = JANELAS_DOS_PILARES[indice];
              return (
                <Revelar
                  as="li"
                  key={pilar.titulo}
                  atraso={indice * 140}
                  className={DESLOCAMENTO_DOS_PILARES[indice]}
                >
                  <div className="mx-auto w-full max-w-[230px]">
                    <Janela />
                  </div>
                  <h3 className="mt-6 font-marca text-2xl font-bold leading-tight text-fachada-papel">
                    {pilar.titulo}
                  </h3>
                  <p className="mt-2 text-[0.97rem] leading-relaxed text-fachada-papel-suave">
                    {pilar.texto}
                  </p>
                </Revelar>
              );
            })}
          </ul>
        </section>

        <section id="como-funciona" className="scroll-mt-6 bg-fachada-predio">
          <div className={`${MIOLO} py-20`}>
            <Revelar>
              <Titulo apoio="Do anúncio à devolução, cada etapa fica registrada.">
                Como funciona
              </Titulo>
            </Revelar>
            <LinhaDoTempo />
          </div>
        </section>

        <section
          id="seguranca"
          className="sobre-claro scroll-mt-6 bg-fachada-papel text-fachada-tinta"
        >
          <div className={`${MIOLO} py-20`}>
            <Revelar>
              <Titulo
                escuro={false}
                apoio="Negociar com vizinho é confortável, mas combinado sem registro dá dor de cabeça. Por isso cada etapa tem regra e deixa rastro."
              >
                Segurança em cada negociação
              </Titulo>
            </Revelar>

            <ul className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {SEGURANCA.map((item, indice) => (
                <Revelar
                  as="li"
                  key={item.titulo}
                  atraso={(indice % 3) * 110}
                  className="flex gap-4"
                >
                  <Pictograma>{item.icone}</Pictograma>
                  <div>
                    <h3 className="font-marca text-xl font-bold leading-tight">{item.titulo}</h3>
                    <p className="mt-1.5 text-[0.95rem] leading-relaxed text-fachada-tinta-suave">
                      {item.texto}
                    </p>
                  </div>
                </Revelar>
              ))}
            </ul>

            <Revelar className="sobre-escuro mt-16 grid gap-8 rounded-[28px] bg-fachada-noite p-8 text-fachada-papel lg:grid-cols-[1fr_1.4fr] lg:p-12">
              <div>
                <h3 className="font-marca text-3xl font-extrabold leading-[1.05] tracking-[-0.02em]">
                  Quem responde pelo material alugado?
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-fachada-papel-suave">
                  Isso fica combinado antes de o item sair da casa do dono. O termo de
                  responsabilidade, aceito na retirada, registra o que cada um assumiu.
                </p>
              </div>
              <ul className="flex flex-col gap-3.5 text-[0.95rem] leading-relaxed">
                {RESPONSABILIDADES.map((regra) => (
                  <li key={regra} className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-2 h-2.5 w-2.5 shrink-0 rounded-[3px] bg-fachada-luz"
                    />
                    {regra}
                  </li>
                ))}
              </ul>
            </Revelar>
          </div>
        </section>

        <section className="sobre-luz bg-fachada-luz text-fachada-tinta">
          <div
            className={`${MIOLO} grid items-center gap-12 py-20 lg:grid-cols-[1.1fr_1fr] lg:gap-16`}
          >
            <div>
              <Revelar>
                <Titulo
                  escuro={false}
                  apoio="Quando os vizinhos compartilham, o condomínio é remunerado. Não é um favor: faz parte do funcionamento da plataforma."
                >
                  O condomínio também ganha
                </Titulo>
              </Revelar>
              <ul className="mt-9 flex flex-col gap-7">
                {DESTINO_DO_CAIXA.map((item, indice) => (
                  <Revelar as="li" key={item.titulo} atraso={indice * 120} className="flex gap-4">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-fachada-tinta text-fachada-luz"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="18"
                        height="18"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M5 12l4.5 4.5L19 7" />
                      </svg>
                    </span>
                    <div>
                      <h3 className="font-marca text-xl font-bold leading-tight">{item.titulo}</h3>
                      <p className="mt-1 text-[0.95rem] leading-relaxed text-fachada-tinta">
                        {item.texto}
                      </p>
                    </div>
                  </Revelar>
                ))}
              </ul>
            </div>
            <Revelar atraso={160}>
              <DivisaoDoAluguel />
            </Revelar>
          </div>
        </section>

        <section className={`${MIOLO} py-20`}>
          <Revelar>
            <Titulo apoio="Do pagamento ao primeiro vizinho cadastrado.">
              Seu condomínio no ar
            </Titulo>
          </Revelar>
          <ol className="mt-12 grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
            {CONTRATACAO.map((passo, indice) => (
              <Revelar
                as="li"
                key={passo.titulo}
                atraso={indice * 120}
                className={`sobre-claro rounded-[18px] bg-fachada-papel p-6 text-fachada-tinta shadow-[0_18px_30px_-18px_rgb(0_0_0/0.7)] ${INCLINACAO[indice]}`}
              >
                <p className="font-mao text-4xl font-bold leading-none text-fachada-coral-texto">
                  {indice + 1}
                </p>
                <h3 className="mt-2 font-marca text-xl font-bold leading-tight">{passo.titulo}</h3>
                <p className="mt-2 text-[0.95rem] leading-relaxed text-fachada-tinta-suave">
                  {passo.texto}
                </p>
              </Revelar>
            ))}
          </ol>
        </section>

        <PlanosPrecos />

        <section id="perguntas" className="mx-auto max-w-4xl scroll-mt-6 px-5 py-20 sm:px-8">
          <Revelar>
            <Titulo>Perguntas frequentes</Titulo>
          </Revelar>
          <div className="mt-10 flex flex-col gap-3">
            {PERGUNTAS.map((item, indice) => (
              <Revelar
                as="details"
                key={item.pergunta}
                atraso={(indice % 4) * 70}
                className="group rounded-[18px] bg-fachada-predio open:bg-fachada-predio-claro"
              >
                <summary
                  className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 font-marca text-lg font-bold
                    leading-tight text-fachada-papel marker:content-none"
                >
                  {item.pergunta}
                  <span
                    aria-hidden="true"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-fachada-luz text-xl font-bold
                      text-fachada-tinta transition-transform duration-300 group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="resposta px-6 pb-6 text-[0.95rem] leading-relaxed text-fachada-papel">
                  {item.resposta}
                </p>
              </Revelar>
            ))}
          </div>
        </section>

        <section className="sobre-coral bg-fachada-coral text-fachada-tinta">
          <div className={`${MIOLO} flex flex-col items-center gap-7 py-20 text-center`}>
            <JanelasAcendendo />
            <h2 className="max-w-3xl font-marca text-[2.1rem] font-extrabold leading-[1.03] tracking-[-0.035em] sm:text-6xl">
              Seu condomínio já tem tudo que precisa
            </h2>
            <p className="max-w-xl text-lg font-medium">
              Só falta organizar. Contrate o plano, compartilhe o link com os vizinhos e comece a
              emprestar.
            </p>
            <Link to="/contratar" className="botao-escuro mt-1">
              Contratar para o meu condomínio
            </Link>
          </div>
        </section>
      </main>

      <RodapeLanding
        miolo={MIOLO}
        rodapeInstitucional={configuracao.rodapeInstitucional}
        nomeInstitucional={configuracao.nomeInstitucional}
      />
    </div>
  );
}
