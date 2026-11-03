import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '@/lib/format';
import { listarPlanos, PlanoDTO } from './assinaturas.api';

/** Menor plano que comporta a quantidade de moradores informada (null se nenhum comporta). */
export function planoIdeal(planos: PlanoDTO[], moradores: number): PlanoDTO | null {
  if (!Number.isFinite(moradores) || moradores < 1) return null;
  return (
    [...planos]
      .sort((a, b) => a.limiteMoradores - b.limiteMoradores)
      .find((plano) => plano.limiteMoradores >= moradores) ?? null
  );
}

const INCLUSO = [
  'Catálogo, locação e mural do condomínio',
  'Pagamento por PIX com confirmação automática',
  'Termo de responsabilidade na retirada e na devolução',
  'Extrato com a taxa repassada ao síndico',
];

/** Seção "Planos e preços" da tela inicial: o síndico escolhe pelo número de moradores. */
export function PlanosPrecos() {
  const [planos, setPlanos] = useState<PlanoDTO[] | null>(null);
  const [erro, setErro] = useState(false);
  const [moradores, setMoradores] = useState('');

  useEffect(() => {
    listarPlanos()
      .then(setPlanos)
      .catch(() => setErro(true));
  }, []);

  const quantidade = Number(moradores);
  const ideal = planos ? planoIdeal(planos, quantidade) : null;
  const maior = planos?.reduce((max, p) => Math.max(max, p.limiteMoradores), 0) ?? 0;
  const informou = moradores.trim() !== '' && quantidade >= 1;

  return (
    <section id="planos" className="scroll-mt-6 border-y border-paper-line bg-paper-surface/70">
      <div className="mx-auto max-w-screen-2xl px-6 py-16 lg:px-12">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold text-ink lg:text-4xl">Planos e preços</h2>
          <p className="mt-2 text-ink-soft">
            Escolha pelo tamanho do seu condomínio. Mensalidade por PIX e sem taxa de adesão. Todos
            os planos têm todas as funções.
          </p>
        </div>

        <div className="mx-auto mt-8 flex max-w-xl flex-col gap-2">
          <label htmlFor="qtd-moradores" className="text-sm font-medium text-ink">
            Quantos moradores tem o seu condomínio?
          </label>
          <input
            id="qtd-moradores"
            type="number"
            inputMode="numeric"
            min={1}
            value={moradores}
            onChange={(e) => setMoradores(e.target.value)}
            placeholder="Ex.: 64"
            className="notch-sm min-h-[44px] w-full border border-ink/40 bg-paper-surface px-4 py-2.5
              text-ink outline-none transition focus:border-ink"
          />
          {planos && informou && (
            <p role="status" className="text-sm text-ink-soft">
              {ideal ? (
                <>
                  Para <strong className="text-ink">{quantidade} moradores</strong>, o plano{' '}
                  <strong className="text-ink">{ideal.nome}</strong> é o ideal (
                  {formatCurrency(ideal.valorMensal)}/mês).
                </>
              ) : (
                <>
                  {quantidade} moradores passam do maior plano ({maior}). Ainda não temos plano para
                  esse tamanho.
                </>
              )}
            </p>
          )}
        </div>

        {erro && (
          <p role="alert" className="mt-8 text-center text-sm text-carmim-700">
            Não foi possível carregar os planos agora. Tente recarregar a página.
          </p>
        )}

        {!planos && !erro && (
          <p className="mt-8 text-center text-sm text-ink-faint">Carregando planos…</p>
        )}

        {planos && (
          <ul className="mx-auto mt-10 grid max-w-5xl gap-5 md:grid-cols-3">
            {planos.map((plano) => {
              const recomendado = ideal?.codigo === plano.codigo;
              const destacado = recomendado || (!ideal && plano.destaque);
              return (
                <li
                  key={plano.codigo}
                  className={`notch flex flex-col gap-4 border p-6 shadow-paper ${
                    destacado
                      ? 'border-barro-500 bg-paper-surface ring-2 ring-barro-500'
                      : 'border-paper-line bg-paper-surface'
                  }`}
                >
                  {destacado && (
                    <span className="notch-sm self-start bg-barro-500 px-3 py-0.5 font-meta text-[11px] uppercase tracking-wide text-paper-surface">
                      {recomendado ? 'Ideal para você' : 'Mais indicado'}
                    </span>
                  )}
                  <div>
                    <h3 className="font-display text-2xl font-bold text-ink">{plano.nome}</h3>
                    <p className="text-sm text-ink-soft">{plano.descricao}</p>
                  </div>
                  <p className="text-ink">
                    <span className="font-display text-4xl font-bold">
                      {formatCurrency(plano.valorMensal)}
                    </span>
                    <span className="text-sm text-ink-soft"> / mês</span>
                  </p>
                  <p className="font-semibold text-ink">Até {plano.limiteMoradores} moradores</p>
                  <ul className="flex flex-col gap-1.5 text-sm text-ink-soft">
                    {INCLUSO.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span aria-hidden="true" className="text-jade-700">
                          ✓
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to={`/contratar?plano=${plano.codigo}`}
                    className={`notch mt-auto inline-flex min-h-[44px] items-center justify-center px-5 py-2.5 text-center font-bold ${
                      destacado
                        ? 'bg-barro-500 text-paper-surface shadow-press hover:bg-barro-700'
                        : 'border-[1.5px] border-ink bg-paper-surface text-ink hover:bg-paper'
                    }`}
                  >
                    Contratar o {plano.nome}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
