import { CSSProperties, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

/* ------------------------------------------------------------------------------------------------
 * A cena da primeira dobra: um prédio brasileiro à noite, cada janela é um vizinho.
 * Todos os apartamentos, itens e preços aqui são de DEMONSTRAÇÃO (fictícios) e a tela avisa isso.
 * ---------------------------------------------------------------------------------------------- */

type ChaveIcone = 'escada' | 'furadeira' | 'barraca' | 'cadeirinha' | 'livros' | 'bicicleta';

/** Pictogramas de traço único, desenhados numa caixa de 40x40. */
const ICONES: Record<ChaveIcone, string> = {
  escada: 'M12 4 8 36M28 4l4 32M10 12h18M9 22h20M8.5 30h23',
  furadeira: 'M5 12h20a5 5 0 0 1 5 5v3H5zM11 20v14h8V20M30 16h8',
  barraca: 'M4 34 20 6l16 28zM20 6v28M14 34l6-12 6 12',
  cadeirinha: 'M12 6c-4 0-6 3-6 7v13h26v-6c0-6-4-9-9-9h-5V6zM10 30v6M30 30v6',
  livros: 'M6 8h12a4 4 0 0 1 4 4v22a4 4 0 0 0-4-4H6zM34 8H22v26a4 4 0 0 1 4-4h8z',
  bicicleta: 'M10 28a6 6 0 1 0 .1 0M30 28a6 6 0 1 0 .1 0M10 28l8-14h10l4 14M18 14l4 14M14 12h6',
};

interface Apto {
  id: string;
  andar: number;
  coluna: number;
  acesaInicial: boolean;
  pessoa?: boolean;
  item?: { icone: ChaveIcone; nome: string; detalhe: string; preco: string };
  reserva?: { quem: string; ate: string };
}

const APTOS: Apto[] = [
  // 4º andar
  {
    id: '401',
    andar: 0,
    coluna: 0,
    acesaInicial: true,
    item: {
      icone: 'livros',
      nome: 'Coleção de livros infantis',
      detalhe: '12 volumes',
      preco: 'R$ 8 / dia',
    },
  },
  { id: '402', andar: 0, coluna: 1, acesaInicial: true, pessoa: true },
  { id: '403', andar: 0, coluna: 2, acesaInicial: false },
  { id: '404', andar: 0, coluna: 3, acesaInicial: false },
  // 3º andar
  { id: '301', andar: 1, coluna: 0, acesaInicial: false },
  {
    id: '302',
    andar: 1,
    coluna: 1,
    acesaInicial: true,
    item: {
      icone: 'escada',
      nome: 'Escada de 7 degraus',
      detalhe: 'Alumínio',
      preco: 'R$ 12 / dia',
    },
    reserva: { quem: 'Apto 202', ate: '08/11' },
  },
  { id: '303', andar: 1, coluna: 2, acesaInicial: false },
  {
    id: '304',
    andar: 1,
    coluna: 3,
    acesaInicial: true,
    item: {
      icone: 'furadeira',
      nome: 'Furadeira de impacto',
      detalhe: 'Maleta e jogo de brocas',
      preco: 'R$ 20 / dia',
    },
  },
  // 2º andar
  { id: '201', andar: 2, coluna: 0, acesaInicial: true, pessoa: true },
  { id: '202', andar: 2, coluna: 1, acesaInicial: true, pessoa: true },
  {
    id: '203',
    andar: 2,
    coluna: 2,
    acesaInicial: true,
    item: {
      icone: 'barraca',
      nome: 'Barraca para 4 pessoas',
      detalhe: 'Com cobertura para chuva',
      preco: 'R$ 15 / dia',
    },
  },
  { id: '204', andar: 2, coluna: 3, acesaInicial: false },
  // 1º andar
  {
    id: '101',
    andar: 3,
    coluna: 0,
    acesaInicial: true,
    item: {
      icone: 'cadeirinha',
      nome: 'Cadeirinha de bebê',
      detalhe: 'Para carro, até 18 kg',
      preco: 'R$ 10 / dia',
    },
  },
  { id: '102', andar: 3, coluna: 1, acesaInicial: false },
  {
    id: '103',
    andar: 3,
    coluna: 2,
    acesaInicial: true,
    item: {
      icone: 'bicicleta',
      nome: 'Bicicleta aro 26',
      detalhe: 'Com capacete',
      preco: 'R$ 14 / dia',
    },
  },
  { id: '104', andar: 3, coluna: 3, acesaInicial: true, pessoa: true },
];

const COLUNAS_X = [67, 181, 295, 409];
const ANDARES_Y = [118, 230, 342, 454];
const LARGURA = 84;
const ALTURA = 82;

/** Estrelas em posições fixas (deterministas) para o céu não mudar a cada render. */
const ESTRELAS = Array.from({ length: 34 }, (_, i) => ({
  x: (i * 211) % 1440,
  y: 30 + ((i * 97) % 330),
  r: i % 5 === 0 ? 2.2 : 1.3,
  atraso: (i * 370) % 3400,
}));

const SILHUETAS_CASA = new Set(['402', '201', '104']);

function PictogramaItem({ chave }: { chave: ChaveIcone }) {
  return (
    <svg
      x={(LARGURA - 40) / 2}
      y={(ALTURA - 40) / 2 + 2}
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      stroke="#0B2A30"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={ICONES[chave]} />
    </svg>
  );
}

function Pessoa({ movendo }: { movendo: boolean }) {
  return (
    <g className={movendo ? 'silhueta' : undefined}>
      <circle cx={LARGURA / 2} cy={ALTURA / 2 - 6} r="9" fill="#0B2A30" opacity="0.85" />
      <path
        d={`M${LARGURA / 2 - 20} ${ALTURA - 6}c2-14 10-19 20-19s18 5 20 19z`}
        fill="#0B2A30"
        opacity="0.85"
      />
    </g>
  );
}

export function CenaHero() {
  const [acesas, setAcesas] = useState<Set<string>>(() => new Set());
  const [reservadas, setReservadas] = useState<Set<string>>(
    () => new Set(APTOS.filter((a) => a.reserva).map((a) => a.id)),
  );
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const bilheteRef = useRef<HTMLDivElement>(null);
  const [aviso, setAviso] = useState('');

  const porId = useMemo(() => new Map(APTOS.map((a) => [a.id, a])), []);

  // As janelas acendem em cascata quando a página carrega...
  useEffect(() => {
    const quadro = requestAnimationFrame(() =>
      setAcesas(new Set(APTOS.filter((a) => a.acesaInicial).map((a) => a.id))),
    );
    return () => cancelAnimationFrame(quadro);
  }, []);

  // ...e, de vez em quando, um vizinho sem item acende ou apaga a luz (a vida do prédio).
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const livres = APTOS.filter((a) => !a.item).map((a) => a.id);
    const intervalo = setInterval(() => {
      const id = livres[Math.floor(Math.random() * livres.length)];
      setAcesas((atual) => {
        const proximo = new Set(atual);
        if (proximo.has(id)) proximo.delete(id);
        else proximo.add(id);
        return proximo;
      });
    }, 2600);
    return () => clearInterval(intervalo);
  }, []);

  // O bilhete fica embaixo do prédio; em telas baixas ele está fora da vista, e quem clicou na
  // janela veria só um contorno. Traz o bilhete para a tela (só o necessário) ao escolher uma janela.
  useEffect(() => {
    if (!selecionada) return;
    const reduzido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    bilheteRef.current?.scrollIntoView?.({
      block: 'nearest',
      behavior: reduzido ? 'auto' : 'smooth',
    });
  }, [selecionada]);

  function selecionar(id: string) {
    setSelecionada((atual) => (atual === id ? null : id));
  }

  function aoTeclar(evento: KeyboardEvent<SVGGElement>, id: string) {
    if (evento.key === 'Enter' || evento.key === ' ') {
      evento.preventDefault();
      selecionar(id);
    }
  }

  function alternarReserva(apto: Apto) {
    if (!apto.item) return;
    const proximo = new Set(reservadas);
    const devolvendo = proximo.has(apto.id);
    if (devolvendo) proximo.delete(apto.id);
    else proximo.add(apto.id);
    setReservadas(proximo);
    setAviso(
      `${apto.item.nome}: ${devolvendo ? 'devolvido, disponível de novo' : 'reservado para você'}.`,
    );
  }

  const atual = selecionada ? porId.get(selecionada) : undefined;
  const atualReservada = atual ? reservadas.has(atual.id) : false;

  return (
    <section className="bg-fachada-noite">
      <div className="relative overflow-hidden">
        {/* Céu: estrelas que piscam, lua e nuvens à deriva, prédios ao longe. */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 1440 800"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <g fill="#FFF8EC">
            {ESTRELAS.map((e, i) => (
              <circle
                key={i}
                cx={e.x}
                cy={e.y}
                r={e.r}
                className="estrela"
                style={{ '--atraso': `${e.atraso}ms` } as CSSProperties}
              />
            ))}
          </g>
          <circle cx="1330" cy="130" r="42" fill="#FFE19A" />
          <circle cx="1317" cy="119" r="8" fill="#F3CB74" />
          <circle cx="1344" cy="146" r="5.5" fill="#F3CB74" />
          <g className="nuvem" fill="#14505B" opacity="0.55">
            <rect x="140" y="170" width="170" height="26" rx="13" />
            <rect x="185" y="152" width="96" height="28" rx="14" />
            <rect x="860" y="96" width="140" height="22" rx="11" />
            <rect x="895" y="80" width="78" height="24" rx="12" />
          </g>
          <g fill="#0A3139">
            <rect x="0" y="600" width="90" height="200" />
            <rect x="100" y="540" width="70" height="260" />
            <rect x="180" y="610" width="110" height="190" />
            <rect x="1180" y="560" width="100" height="240" />
            <rect x="1290" y="620" width="80" height="180" />
            <rect x="1380" y="570" width="70" height="230" />
          </g>
        </svg>

        <div className="relative mx-auto grid max-w-screen-2xl items-end gap-0 px-0 lg:grid-cols-[1.08fr_1fr] lg:px-12">
          {/* A empena coral: o título pintado na parede do prédio. */}
          <div className="sobre-coral relative mt-2 rounded-t-[26px] bg-fachada-coral px-6 pb-14 pt-8 sm:px-12 sm:pt-10 lg:mt-6 lg:rounded-t-[34px] lg:px-14 lg:pb-16">
            <div className="flex gap-2.5" aria-hidden="true">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <span
                  key={i}
                  data-acesa={acesas.size > 0 && i % 3 !== 1}
                  style={{ '--atraso': `${900 + i * 130}ms` } as CSSProperties}
                  className="relative block h-10 w-7 overflow-hidden rounded-[5px] bg-fachada-tinta"
                >
                  <span className="janela-luz absolute inset-[3px] rounded-[3px] bg-fachada-luz" />
                </span>
              ))}
            </div>

            <h1
              className="entra mt-9 font-marca text-[2.55rem] font-extrabold leading-[1.02] tracking-[-0.035em]
              text-fachada-tinta sm:text-6xl lg:text-[4.1rem]"
            >
              Itens e serviços entre vizinhos, com segurança e regras claras
            </h1>
            <p
              className="entra mt-6 max-w-xl text-lg font-medium leading-relaxed text-fachada-tinta"
              style={{ '--atraso': '120ms' } as CSSProperties}
            >
              Chega de grupo de WhatsApp perdido. A USAI organiza o empréstimo e a locação de itens,
              e a procura por serviços, dentro do seu condomínio: catálogo, aprovação, pagamento por
              PIX, termo de responsabilidade e histórico em um só lugar. E o valor do aluguel vai
              direto para quem emprestou o item.
            </p>
            <div
              className="entra mt-9 flex flex-wrap items-center gap-4"
              style={{ '--atraso': '240ms' } as CSSProperties}
            >
              <Link to="/contratar" className="botao-escuro">
                Contratar para meu condomínio
              </Link>
              <Link to="/login" className="botao-contorno text-fachada-tinta">
                Já tenho conta
              </Link>
            </div>
            <p
              className="entra mt-7 text-sm font-medium text-fachada-tinta"
              style={{ '--atraso': '320ms' } as CSSProperties}
            >
              Seu condomínio já usa a USAI?{' '}
              <Link
                to="/cadastro"
                className="font-bold underline underline-offset-2 hover:no-underline"
              >
                Cadastre-se com o link do síndico
              </Link>
            </p>
          </div>

          {/* O prédio dos vizinhos. */}
          <div className="mx-auto w-full max-w-[520px] px-4 pt-10 lg:max-w-none lg:px-0 lg:pl-10">
            <svg
              viewBox="0 0 560 602"
              className="mx-auto block h-auto w-full max-w-[520px]"
              role="group"
              aria-label="Prédio de apartamentos à noite; cada janela é um vizinho (exemplo ilustrativo)"
            >
              {/* Caixa d'água e antena */}
              <rect x="74" y="38" width="86" height="42" rx="10" fill="#1B6672" />
              <rect x="82" y="80" width="6" height="14" fill="#14505B" />
              <rect x="146" y="80" width="6" height="14" fill="#14505B" />
              <path
                d="M486 80V16M470 30h32M476 46h20"
                stroke="#14505B"
                strokeWidth="4"
                strokeLinecap="round"
              />

              {/* Corpo do prédio */}
              <rect x="20" y="90" width="520" height="512" fill="#14505B" />
              <rect x="8" y="78" width="544" height="20" rx="4" fill="#1B6672" />

              {/* Portaria */}
              <rect x="228" y="540" width="104" height="62" rx="6" fill="#0B2A30" />
              <rect x="238" y="550" width="38" height="52" fill="#FFC24B" opacity="0.9" />
              <rect x="284" y="550" width="38" height="52" fill="#FFC24B" opacity="0.65" />
              <rect x="218" y="530" width="124" height="12" rx="3" fill="#FF6B4A" />

              {/* Janelas */}
              {APTOS.map((apto, i) => {
                const x = COLUNAS_X[apto.coluna];
                const y = ANDARES_Y[apto.andar];
                const acesa = acesas.has(apto.id);
                const reservada = reservadas.has(apto.id);
                const interativa = Boolean(apto.item);
                const escolhida = selecionada === apto.id;
                const rotulo = apto.item
                  ? `Apartamento ${apto.id}: ${apto.item.nome}, ${reservada ? 'reservado' : 'disponível'}. Ative para ver os detalhes.`
                  : undefined;

                return (
                  <g
                    key={apto.id}
                    transform={`translate(${x} ${y})`}
                    data-acesa={acesa}
                    style={{ '--atraso': `${i * 75}ms` } as CSSProperties}
                  >
                    {/* Grupo de dentro: o efeito de hover (scale em CSS) não pode ficar no grupo que tem o
                        translate, senão o CSS apaga a posição e a janela pula e treme sob o mouse. */}
                    <g
                      {...(interativa
                        ? {
                            role: 'button',
                            tabIndex: 0,
                            'aria-pressed': escolhida,
                            'aria-label': rotulo,
                            className: 'janela-toque',
                            onClick: () => selecionar(apto.id),
                            onKeyDown: (e: KeyboardEvent<SVGGElement>) => aoTeclar(e, apto.id),
                          }
                        : { 'aria-hidden': true })}
                    >
                      {/* parapeito */}
                      <rect
                        x="-7"
                        y={ALTURA}
                        width={LARGURA + 14}
                        height="9"
                        rx="2"
                        fill="#1B6672"
                      />
                      {/* vidro apagado */}
                      <rect width={LARGURA} height={ALTURA} rx="7" fill="#082329" />
                      {/* vidro aceso (opacidade animada) */}
                      <g className="janela-luz">
                        <rect
                          width={LARGURA}
                          height={ALTURA}
                          rx="7"
                          fill={reservada ? '#FF6B4A' : '#FFC24B'}
                        />
                        {apto.item && <PictogramaItem chave={apto.item.icone} />}
                        {apto.pessoa && !apto.item && (
                          <Pessoa movendo={SILHUETAS_CASA.has(apto.id)} />
                        )}
                      </g>
                      {/* caixilho */}
                      <path
                        d={`M${LARGURA / 2} 0V${ALTURA}M0 ${ALTURA * 0.62}H${LARGURA}`}
                        stroke="#14505B"
                        strokeWidth="3"
                        opacity="0.9"
                      />
                      <rect
                        width={LARGURA}
                        height={ALTURA}
                        rx="7"
                        fill="none"
                        stroke={escolhida ? '#FFE19A' : '#1B6672'}
                        strokeWidth={escolhida ? 5 : 4}
                      />
                    </g>
                  </g>
                );
              })}

              {/* Vasinho e ar-condicionado: o prédio tem vida */}
              <g aria-hidden="true">
                <rect x="146" y="204" width="34" height="14" rx="3" fill="#B7CFCB" opacity="0.85" />
                <circle cx="266" cy="318" r="9" fill="#6BC28A" />
                <rect x="258" y="320" width="16" height="9" rx="2" fill="#FF6B4A" />
                <circle cx="380" cy="430" r="9" fill="#6BC28A" />
                <rect x="372" y="432" width="16" height="9" rx="2" fill="#FFC24B" />
              </g>

              {/* A cestinha de corda: o empréstimo descendo da janela do 304 */}
              <g aria-hidden="true" style={{ '--queda': '246px' } as CSSProperties}>
                <circle cx="516" cy="300" r="6" fill="#B7CFCB" />
                <rect className="corda" x="515" y="304" width="2" height="262" fill="#B7CFCB" />
                <g className="cesta">
                  <path d="M504 306q12-18 24 0" fill="none" stroke="#FFE19A" strokeWidth="2.5" />
                  <rect
                    x="500"
                    y="306"
                    width="32"
                    height="24"
                    rx="5"
                    fill="#C98A12"
                    stroke="#0B2A30"
                    strokeWidth="2.5"
                  />
                  <svg
                    x="506"
                    y="309"
                    width="20"
                    height="20"
                    viewBox="0 0 40 40"
                    fill="none"
                    stroke="#0B2A30"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={ICONES.furadeira} />
                  </svg>
                </g>
              </g>

              {/* Poste de luz na calçada */}
              <g aria-hidden="true">
                <rect x="42" y="540" width="6" height="62" fill="#0B2A30" />
                <rect x="30" y="532" width="30" height="12" rx="6" fill="#FFE19A" />
              </g>
            </svg>
          </div>
        </div>
      </div>

      {/* A rua: o chão dos dois prédios, onde fica o bilhete que responde ao toque na janela. */}
      <div className="border-t-[6px] border-fachada-predio bg-fachada-noite-fundo">
        <div className="mx-auto grid max-w-screen-2xl gap-4 px-5 py-8 sm:px-8 lg:grid-cols-[1.08fr_1fr] lg:px-12">
          <p className="hidden self-center text-sm text-fachada-papel-suave lg:block">
            A USAI é o prédio inteiro: cada janela acesa é um vizinho com algo a oferecer.
          </p>
          <div className="mx-auto w-full max-w-[520px] lg:mx-0 lg:max-w-none lg:pl-10">
            {/* O bilhete do vizinho: responde ao toque na janela. */}
            <div
              ref={bilheteRef}
              className="sobre-claro relative z-10 mx-auto max-w-[520px] -rotate-1 rounded-[14px] bg-fachada-papel px-6 py-4 text-fachada-tinta
              shadow-[0_14px_26px_-14px_rgb(0_0_0/0.6)]"
            >
              {atual?.item ? (
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
                  <div>
                    <p className="font-mao text-2xl font-bold leading-none text-fachada-coral-texto">
                      Apto {atual.id}
                    </p>
                    <p className="mt-1 font-marca text-lg font-bold leading-tight">
                      {atual.item.nome}
                    </p>
                    <p className="text-sm text-fachada-tinta-suave">
                      {atual.item.detalhe} · {atual.item.preco} ·{' '}
                      <strong
                        className={
                          atualReservada ? 'text-fachada-coral-texto' : 'text-fachada-folha-escura'
                        }
                      >
                        {atualReservada
                          ? atual.reserva
                            ? `reservado até ${atual.reserva.ate}`
                            : 'reservado'
                          : 'disponível'}
                      </strong>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => alternarReserva(atual)}
                    className="botao-escuro !min-h-[44px] !px-5 !text-[0.95rem]"
                  >
                    {atualReservada ? 'Devolver' : 'Pedir emprestado'}
                  </button>
                </div>
              ) : (
                <p className="font-mao text-[1.65rem] font-bold leading-tight">
                  Toque numa janela acesa e veja o que o vizinho tem pra emprestar.
                </p>
              )}
              <p className="mt-1 text-xs text-fachada-tinta-suave">
                Exemplo ilustrativo, com apartamentos, itens e preços fictícios.
              </p>
            </div>
            <p role="status" className="sr-only">
              {aviso}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
