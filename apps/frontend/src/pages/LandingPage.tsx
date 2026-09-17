import { Link } from 'react-router-dom';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-paper bg-cortica bg-cortica-grid">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <span className="inline-flex items-center gap-2 font-display text-2xl font-bold text-ink">
          <span className="notch-sm h-5 w-5 bg-barro-500" aria-hidden="true" />
          USAI
        </span>
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

      <main className="mx-auto flex max-w-5xl flex-col items-center px-6 py-20 text-center">
        <span className="notch-sm bg-barro-100 px-3 py-1 font-meta text-xs uppercase tracking-wider text-barro-700">
          o mural da portaria, não o dashboard
        </span>
        <h1 className="mt-5 font-display text-4xl font-bold leading-[0.98] tracking-tight text-ink sm:text-5xl">
          Compartilhe e alugue itens com seus vizinhos
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">
          Chega de grupo de WhatsApp perdido. A USAI organiza o empréstimo e a locação de itens
          dentro do seu condomínio: mural, catálogo, aprovação e histórico em um só lugar.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
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

        <dl className="mt-20 grid grid-cols-1 gap-5 text-left sm:grid-cols-3">
          {[
            {
              titulo: 'Mural do condomínio',
              texto: 'Avisos do síndico e pedidos de ajuda, num só feed.',
            },
            { titulo: 'Catálogo por condomínio', texto: 'Veja apenas os itens dos seus vizinhos.' },
            { titulo: 'Conversa privada', texto: 'Combine a entrega direto com quem emprestou.' },
          ].map((item) => (
            <div
              key={item.titulo}
              className="notch border border-paper-line bg-paper-surface p-6 shadow-paper"
            >
              <dt className="font-display font-semibold text-ink">{item.titulo}</dt>
              <dd className="mt-2 text-sm text-ink-soft">{item.texto}</dd>
            </div>
          ))}
        </dl>
      </main>
    </div>
  );
}
