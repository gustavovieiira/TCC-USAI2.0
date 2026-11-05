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
    <section id="planos" className="scroll-mt-6 bg-fachada-noite-fundo">
      <div className="mx-auto max-w-screen-2xl px-5 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-marca text-[2rem] font-extrabold leading-[1.04] tracking-[-0.03em] text-fachada-papel sm:text-5xl">
            Planos e preços
          </h2>
          <p className="mt-3 text-base leading-relaxed text-fachada-papel-suave sm:text-lg">
            Escolha pelo tamanho do seu condomínio e pague no período que preferir: quanto mais
            tempo, maior o desconto. Tudo por PIX e sem taxa de adesão. Todos os planos têm todas as
            funções.
          </p>
        </div>

        {periodos.length > 0 && (
          <div
            role="group"
            aria-label="Período de cobrança"
            className="mx-auto mt-8 flex max-w-2xl flex-wrap justify-center gap-2.5"
          >
            {periodos.map((p) => {
              const ativo = p.codigo === periodoCodigo;
              return (
                <button
                  key={p.codigo}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => setPeriodoCodigo(p.codigo)}
                  className={`${
                    ativo ? 'botao-luz' : 'botao-contorno text-fachada-papel'
                  } !min-h-[46px] !px-5 !text-[0.95rem]`}
                >
                  {p.nome}
                  {p.desconto > 0 && (
                    <span
                      className={`ml-2 text-xs font-bold ${ativo ? 'text-fachada-tinta' : 'text-fachada-folha'}`}
                    >
                      −{p.desconto}%
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className="sobre-claro mx-auto mt-8 flex max-w-xl flex-col gap-2 rounded-[22px] bg-fachada-papel px-8 py-7 text-fachada-tinta">
          <label htmlFor="qtd-pessoas" className="font-marca text-lg font-bold">
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
            className="min-h-[50px] w-full rounded-[12px] border-2 border-fachada-tinta/25 bg-white px-4
              py-2.5 text-lg text-fachada-tinta outline-none placeholder:text-fachada-tinta-suave/70
              focus:border-fachada-coral-escuro"
          />
          <p className="text-xs text-fachada-tinta-suave">
            O limite do plano conta as contas cadastradas, não todos os moradores do prédio.
          </p>
          {planos && informou && (
            <p role="status" className="text-sm text-fachada-tinta-suave">
              {ideal ? (
                <>
                  Para <strong className="text-fachada-tinta">{quantidade} pessoas</strong>, o plano{' '}
                  <strong className="text-fachada-tinta">{ideal.nome}</strong> é o ideal (a partir
                  de {formatCurrency(ideal.valorMensal)}/mês).
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
          <p role="alert" className="mt-8 text-center text-sm font-semibold text-[#ffb3a6]">
            Não foi possível carregar os planos agora. Tente recarregar a página.
          </p>
        )}

        {!dados && !erro && (
          <p className="mt-8 text-center text-sm text-fachada-papel-suave">Carregando planos…</p>
        )}

        {planos && periodo && (
          <ul className="mx-auto mt-14 grid max-w-screen-xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {planos.map((plano) => {
              const preco = precoDe(plano, periodo.codigo);
              if (!preco) return null;
              const recomendado = ideal?.codigo === plano.codigo;
              const destacado = recomendado || (!ideal && plano.destaque);
              const comDesconto = periodo.desconto > 0;
              return (
                <li
                  key={plano.codigo}
                  className={`sobre-claro relative flex flex-col gap-4 rounded-[26px] p-7 pt-9 text-fachada-tinta
                    shadow-[0_24px_36px_-22px_rgb(0_0_0/0.85)] transition-transform duration-300 hover:-translate-y-1 ${
                      destacado
                        ? 'bg-fachada-luz lg:-translate-y-3 lg:hover:-translate-y-4'
                        : 'bg-fachada-papel'
                    }`}
                >
                  {destacado && (
                    <span className="self-start rounded-full bg-fachada-coral px-3.5 py-1 font-marca text-sm font-bold text-fachada-tinta">
                      {recomendado ? 'Ideal para você' : 'Mais indicado'}
                    </span>
                  )}
                  <div>
                    <h3 className="font-marca text-3xl font-extrabold leading-none tracking-tight">
                      {plano.nome}
                    </h3>
                    <p className="mt-1.5 text-sm text-fachada-tinta-suave">{plano.descricao}</p>
                  </div>
                  <div className="text-fachada-tinta">
                    {comDesconto && (
                      <p className="text-sm text-fachada-tinta-suave line-through">
                        {formatCurrency(plano.valorMensal)} / mês
                      </p>
                    )}
                    <p>
                      <span className="font-marca text-[2.7rem] font-extrabold leading-none tracking-tight">
                        {formatCurrency(preco.valorMensalEquivalente)}
                      </span>
                      <span className="text-sm text-fachada-tinta-suave"> / mês</span>
                    </p>
                    {comDesconto ? (
                      <p className="mt-1 text-sm text-fachada-tinta-suave">
                        {formatCurrency(preco.valorTotal)} cobrados{' '}
                        {frequenciaDoPeriodo(periodo.meses)}
                        <span
                          className={`block font-semibold ${
                            destacado ? 'text-fachada-tinta' : 'text-fachada-folha-texto'
                          }`}
                        >
                          Economia de {formatCurrency(preco.economia)} ({periodo.desconto}%)
                        </span>
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-fachada-tinta-suave">
                        Cobrado todo mês, sem desconto
                      </p>
                    )}
                  </div>
                  <p className="font-marca text-lg font-bold">
                    Até {plano.limiteMoradores} moradores
                  </p>
                  <ul className="flex flex-col gap-2 text-sm text-fachada-tinta-suave">
                    {INCLUSO.map((item) => (
                      <li key={item} className="flex gap-2.5">
                        <span
                          aria-hidden="true"
                          className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-fachada-coral-escuro"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to={`/contratar?plano=${plano.codigo}&periodo=${periodo.codigo}`}
                    className={`mt-auto ${destacado ? 'botao-escuro' : 'botao-coral'}`}
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
      className="mx-auto mt-8 flex max-w-screen-xl flex-col gap-4 rounded-[22px] border-2 border-dashed
        border-fachada-luz bg-fachada-luz/10 p-6 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <span className="inline-block rounded-full bg-fachada-luz px-3 py-0.5 font-marca text-xs font-bold text-fachada-tinta">
          Plano de teste
        </span>
        <h3 className="mt-2 font-marca text-2xl font-bold text-fachada-papel">{plano.nome}</h3>
        <p className="text-sm text-fachada-papel-suave">
          {plano.descricao} Até {plano.limiteMoradores} moradores. Visível só enquanto o modo de
          teste estiver ligado.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:items-end">
        <p className="text-fachada-papel">
          <span className="font-marca text-3xl font-bold">{formatCurrency(preco.valorTotal)}</span>
          <span className="text-sm text-fachada-papel-suave"> {frequenciaDoPeriodo(meses)}</span>
        </p>
        <Link
          to={`/contratar?plano=${plano.codigo}&periodo=${periodoCodigo}`}
          className="botao-luz"
        >
          Contratar o plano de teste
        </Link>
      </div>
    </div>
  );
}
