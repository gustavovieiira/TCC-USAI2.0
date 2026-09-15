import { Link } from 'react-router-dom';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <span className="text-2xl font-bold text-brand-600">USAI</span>
        <nav className="flex gap-4">
          <Link
            to="/login"
            className="rounded-lg px-4 py-2 font-medium text-slate-700 hover:bg-slate-100"
          >
            Entrar
          </Link>
          <Link
            to="/cadastro"
            className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700"
          >
            Cadastrar condomínio
          </Link>
        </nav>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col items-center px-6 py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Compartilhe e alugue itens com seus vizinhos
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-slate-600">
          Chega de grupo de WhatsApp perdido. A USAI organiza o empréstimo e a locação de itens
          dentro do seu condomínio: catálogo, aprovação, pagamento e histórico em um só lugar.
        </p>
        <div className="mt-10 flex gap-4">
          <Link
            to="/cadastro"
            className="rounded-lg bg-brand-600 px-6 py-3 font-medium text-white hover:bg-brand-700"
          >
            Começar agora
          </Link>
          <Link
            to="/login"
            className="rounded-lg border border-slate-300 px-6 py-3 font-medium text-slate-700
              hover:bg-slate-50"
          >
            Já tenho conta
          </Link>
        </div>

        <dl className="mt-20 grid grid-cols-1 gap-8 text-left sm:grid-cols-3">
          {[
            { titulo: 'Catálogo por condomínio', texto: 'Veja apenas os itens dos seus vizinhos.' },
            { titulo: 'Pagamento integrado', texto: 'Cobrança automática via PIX após aprovação.' },
            { titulo: 'Histórico completo', texto: 'Acompanhe locações, mensagens e ganhos.' },
          ].map((item) => (
            <div
              key={item.titulo}
              className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-100"
            >
              <dt className="font-semibold text-slate-900">{item.titulo}</dt>
              <dd className="mt-2 text-sm text-slate-600">{item.texto}</dd>
            </div>
          ))}
        </dl>
      </main>
    </div>
  );
}
