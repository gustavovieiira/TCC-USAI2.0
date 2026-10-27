import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { MarcaUsai } from '@/components/ui/MarcaUsai';
import { useConfiguracao } from '@/features/configuracao/ConfiguracaoContext';

function Icone({ children }: { children: ReactNode }) {
  return (
    <span className="notch-sm flex h-11 w-11 items-center justify-center bg-barro-100 text-barro-700">
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

const RECURSOS: { titulo: string; texto: string; icone: ReactNode }[] = [
  {
    titulo: 'Mural do condomínio',
    texto: 'Avisos do síndico e pedidos de ajuda dos vizinhos, num só feed.',
    icone: (
      <>
        <path d="M4 5h16v10H9l-4 4v-4H4V5z" />
        <path d="M8 9h8M8 12h5" />
      </>
    ),
  },
  {
    titulo: 'Catálogo só do seu condomínio',
    texto: 'Você vê apenas os itens de quem mora com você. Cada condomínio é um ambiente privado.',
    icone: (
      <>
        <path d="M3 21V9l9-6 9 6v12" />
        <path d="M9 21v-6h6v6" />
      </>
    ),
  },
  {
    titulo: 'Pagamento por PIX',
    texto: 'Cobrança gerada na hora, confirmação automática e saque pedido pelo próprio app.',
    icone: (
      <>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M3 10h18M7 15h3" />
      </>
    ),
  },
  {
    titulo: 'Termo e documento com aceite',
    texto:
      'Termo de responsabilidade, aceite com confirmação de senha e documento pronto pra imprimir ou salvar em PDF.',
    icone: (
      <>
        <path d="M7 3h8l4 4v14H7z" />
        <path d="M15 3v4h4M10 12h6M10 16h6" />
      </>
    ),
  },
  {
    titulo: 'Extrato detalhado',
    texto:
      'O que entrou, de onde veio e que taxa foi aplicada; o que saiu e o que está a caminho. Com recibo de cada operação.',
    icone: (
      <>
        <path d="M5 20V10M12 20V4M19 20v-7" />
      </>
    ),
  },
  {
    titulo: 'O condomínio também ganha',
    texto:
      'A taxa da plataforma é repassada ao síndico, que acompanha tudo com o mesmo extrato transparente.',
    icone: (
      <>
        <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" />
        <path d="M9 12l2 2 4-4" />
      </>
    ),
  },
];

/** Cartões de exemplo (ilustração da tela inicial, não são dados reais). */
function Ilustracao() {
  return (
    <div className="relative mx-auto flex w-full max-w-sm flex-col gap-3" aria-hidden="true">
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

export function LandingPage() {
  const { configuracao } = useConfiguracao();

  return (
    <div className="min-h-screen bg-paper bg-cortica bg-cortica-grid">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <Logo altura={40} className="text-ink" />
        <nav className="flex gap-3">
          <Link to="/login" className="px-4 py-2 font-semibold text-ink-soft hover:text-ink">
            Entrar
          </Link>
          <Link
            to="/cadastro"
            className="notch min-h-[44px] bg-barro-500 px-4 py-2 font-bold text-paper-surface
              shadow-press hover:bg-barro-700"
          >
            Cadastrar condomínio
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-5xl items-center gap-12 px-6 py-14 md:grid-cols-[1.15fr_1fr] md:py-20">
          <div>
            <span className="notch-sm bg-barro-100 px-3 py-1 font-meta text-xs uppercase tracking-wider text-barro-700">
              o mural da portaria, não o dashboard
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[0.98] tracking-tight text-ink sm:text-5xl">
              Compartilhe e alugue itens com seus vizinhos
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
              Chega de grupo de WhatsApp perdido. A USAI organiza o empréstimo e a locação de itens
              dentro do seu condomínio: catálogo, aprovação, pagamento por PIX, termo de
              responsabilidade e histórico em um só lugar.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/cadastro"
                className="notch min-h-[44px] bg-barro-500 px-6 py-3 font-bold text-paper-surface
                  shadow-press hover:bg-barro-700"
              >
                Começar agora
              </Link>
              <Link
                to="/login"
                className="notch min-h-[44px] border-[1.5px] border-ink bg-paper-surface px-6 py-3
                  font-bold text-ink hover:bg-paper"
              >
                Já tenho conta
              </Link>
            </div>
          </div>
          <Ilustracao />
        </section>

        <section className="border-y border-paper-line bg-paper-surface/70">
          <div className="mx-auto max-w-5xl px-6 py-14">
            <h2 className="font-display text-3xl font-bold text-ink">Como funciona</h2>
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

        <section className="mx-auto max-w-5xl px-6 py-14">
          <h2 className="font-display text-3xl font-bold text-ink">Tudo num só lugar</h2>
          <dl className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {RECURSOS.map((recurso) => (
              <div
                key={recurso.titulo}
                className="notch flex flex-col gap-3 border border-paper-line bg-paper-surface p-6 shadow-paper"
              >
                <Icone>{recurso.icone}</Icone>
                <dt className="font-display text-lg font-semibold text-ink">{recurso.titulo}</dt>
                <dd className="text-sm leading-relaxed text-ink-soft">{recurso.texto}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="bg-ink text-ink-inverse">
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-6 py-14 text-center">
            <MarcaUsai tamanho={56} />
            <h2 className="font-display text-3xl font-bold">
              Seu condomínio já tem tudo que precisa
            </h2>
            <p className="max-w-xl text-ink-inverse-soft">
              Só falta organizar. Cadastre o condomínio, compartilhe o link com os vizinhos e comece
              a emprestar.
            </p>
            <Link
              to="/cadastro"
              className="notch mt-2 min-h-[44px] bg-barro-500 px-6 py-3 font-bold text-paper-surface
                shadow-press hover:bg-barro-400"
            >
              Cadastrar condomínio
            </Link>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-8 text-sm text-ink-soft">
        <Logo altura={28} className="text-ink" />
        <p className="max-w-2xl text-xs text-ink-faint">{configuracao.rodapeInstitucional}</p>
        <p className="text-xs text-ink-faint">{configuracao.nomeInstitucional}</p>
      </footer>
    </div>
  );
}
