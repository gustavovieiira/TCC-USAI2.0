import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '@/lib/format';
import { frequenciaDoPeriodo, listarPlanos, PlanosDTO, PlanoDTO, precoDe } from './assinaturas.api';

/** Menor plano que comporta a quantidade de pessoas informada (null se nenhum comporta). */
export function planoIdeal(planos: PlanoDTO[], pessoas: number): PlanoDTO | null {
  if (!Number.isFinite(pessoas) || pessoas < 1) return null;
  // O plano de teste (R$ 2,00) nunca é recomendado.
  return (
    planos
      .filter((plano) => !plano.teste)
      .sort((a, b) => a.limiteMoradores - b.limiteMoradores)
      .find((plano) => plano.limiteMoradores >= pessoas) ?? null
  );
}

const INCLUSO = [
  'Catálogo, locação e mural do condomínio',
  'Pagamento por PIX com confirmação automática',
  'Termo de responsabilidade na retirada e na devolução',
  'Extrato com a taxa repassada ao condomínio',
];

/** Seção "Planos e preços" da tela inicial: o síndico escolhe pelo tamanho e pelo período. */
export function PlanosPrecos() {
  const [dados, setDados] = useState<PlanosDTO | null>(null);
  const [erro, setErro] = useState(false);
  const [pessoas, setPessoas] = useState('');
  const [periodoCodigo, setPeriodoCodigo] = useState('MENSAL');

  useEffect(() => {
    listarPlanos()
      .then(setDados)
      .catch(() => setErro(true));
  }, []);

  const todos = dados?.planos ?? null;
  const planos = todos ? todos.filter((p) => !p.teste) : null;
  const planoTeste = todos?.find((p) => p.teste) ?? null;
  const periodos = dados?.periodos ?? [];
  const periodo = periodos.find((p) => p.codigo === periodoCodigo) ?? periodos[0];

  const quantidade = Number(pessoas);
  const ideal = planos ? planoIdeal(planos, quantidade) : null;
  const maior = planos?.reduce((max, p) => Math.max(max, p.limiteMoradores), 0) ?? 0;
  const informou = pessoas.trim() !== '' && quantidade >= 1;

  return (
    <section id="planos" className="scroll-mt-6 border-y border-paper-line bg-paper-surface/70">
      <div className="mx-auto max-w-screen-2xl px-6 py-16 lg:px-12">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold text-ink lg:text-4xl">Planos e preços</h2>
          <p className="mt-2 text-ink-soft">
            Escolha pelo tamanho do seu condomínio e pague no período que preferir: quanto mais
            tempo, maior o desconto. Tudo por PIX e sem taxa de adesão. Todos os planos têm todas as
            funções.
          </p>
        </div>

        {periodos.length > 0 && (
          <div
            role="group"
            aria-label="Período de cobrança"
            className="mx-auto mt-8 flex max-w-2xl flex-wrap justify-center gap-2"
          >
            {periodos.map((p) => {
              const ativo = p.codigo === periodoCodigo;
              return (
                <button
                  key={p.codigo}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => setPeriodoCodigo(p.codigo)}
                  className={`notch-sm px-4 py-2 text-sm font-semibold transition ${
                    ativo
                      ? 'bg-ink text-ink-inverse'
                      : 'border border-paper-line bg-paper-surface text-ink-soft hover:bg-paper'
                  }`}
                >
                  {p.nome}
                  {p.desconto > 0 && (
                    <span
                      className={`ml-2 font-meta text-xs ${ativo ? 'text-jade-300' : 'text-jade-700'}`}
                    >
                      −{p.desconto}%
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className="mx-auto mt-8 flex max-w-xl flex-col gap-2">
          <label htmlFor="qtd-pessoas" className="text-sm font-medium text-ink">
            Quantas pessoas devem usar a USAI?
          </label>
          <input
            id="qtd-pessoas"
            type="number"
            inputMode="numeric"
            min={1}
            value={pessoas}
            onChange={(e) => setPessoas(e.target.value)}
            placeholder="Ex.: 40"
            className="notch-sm min-h-[44px] w-full border border-ink/40 bg-paper-surface px-4 py-2.5
              text-ink outline-none transition focus:border-ink"
          />
          <p className="text-xs text-ink-faint">
            O limite do plano conta as contas cadastradas, não todos os moradores do prédio.
          </p>
          {planos && informou && (
            <p role="status" className="text-sm text-ink-soft">
              {ideal ? (
                <>
                  Para <strong className="text-ink">{quantidade} pessoas</strong>, o plano{' '}
                  <strong className="text-ink">{ideal.nome}</strong> é o ideal (a partir de{' '}
                  {formatCurrency(ideal.valorMensal)}/mês).
                </>
              ) : (
                <>
                  {quantidade} pessoas passam do maior plano ({maior}). Ainda não temos plano para
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

        {!dados && !erro && (
          <p className="mt-8 text-center text-sm text-ink-faint">Carregando planos…</p>
        )}

        {planos && periodo && (
          <ul className="mx-auto mt-10 grid max-w-screen-xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {planos.map((plano) => {
              const preco = precoDe(plano, periodo.codigo);
              if (!preco) return null;
              const recomendado = ideal?.codigo === plano.codigo;
              const destacado = recomendado || (!ideal && plano.destaque);
              const comDesconto = periodo.desconto > 0;
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
                  <div className="text-ink">
                    {comDesconto && (
                      <p className="text-sm text-ink-faint line-through">
                        {formatCurrency(plano.valorMensal)} / mês
                      </p>
                    )}
                    <p>
                      <span className="font-display text-4xl font-bold">
                        {formatCurrency(preco.valorMensalEquivalente)}
                      </span>
                      <span className="text-sm text-ink-soft"> / mês</span>
                    </p>
                    {comDesconto ? (
                      <p className="mt-1 text-sm text-ink-soft">
                        {formatCurrency(preco.valorTotal)} cobrados{' '}
                        {frequenciaDoPeriodo(periodo.meses)}
                        <span className="block font-semibold text-jade-700">
                          Economia de {formatCurrency(preco.economia)} ({periodo.desconto}%)
                        </span>
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-ink-soft">Cobrado todo mês, sem desconto</p>
                    )}
                  </div>
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
                    to={`/contratar?plano=${plano.codigo}&periodo=${periodo.codigo}`}
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

        {planoTeste && periodo && (
          <PlanoDeTeste plano={planoTeste} periodoCodigo={periodo.codigo} meses={periodo.meses} />
        )}
      </div>
    </section>
  );
}

/**
 * Card do plano de teste (R$ 2,00): aparece só com o modo de teste ligado no servidor e serve para
 * validar o PIX em produção. Fica separado dos planos de verdade e fora da recomendação.
 */
function PlanoDeTeste({
  plano,
  periodoCodigo,
  meses,
}: {
  plano: PlanoDTO;
  periodoCodigo: string;
  meses: number;
}) {
  const preco = precoDe(plano, periodoCodigo);
  if (!preco) return null;

  return (
    <div
      data-testid="plano-teste"
      className="notch mx-auto mt-6 flex max-w-screen-xl flex-col gap-4 border-2 border-dashed
        border-mostarda-500 bg-mostarda-100/40 p-6 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <span className="notch-sm bg-mostarda-500 px-3 py-0.5 font-meta text-[11px] uppercase tracking-wide text-ink">
          Plano de teste
        </span>
        <h3 className="mt-2 font-display text-2xl font-bold text-ink">{plano.nome}</h3>
        <p className="text-sm text-ink-soft">
          {plano.descricao} Até {plano.limiteMoradores} moradores. Visível só enquanto o modo de
          teste estiver ligado.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:items-end">
        <p className="text-ink">
          <span className="font-display text-3xl font-bold">
            {formatCurrency(preco.valorTotal)}
          </span>
          <span className="text-sm text-ink-soft"> {frequenciaDoPeriodo(meses)}</span>
        </p>
        <Link
          to={`/contratar?plano=${plano.codigo}&periodo=${periodoCodigo}`}
          className="notch inline-flex min-h-[44px] items-center justify-center border-[1.5px] border-ink bg-paper-surface px-5 py-2.5 text-center font-bold text-ink hover:bg-paper"
        >
          Contratar o plano de teste
        </Link>
      </div>
    </div>
  );
}
