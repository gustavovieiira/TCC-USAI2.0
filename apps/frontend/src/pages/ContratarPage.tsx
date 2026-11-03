import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { TextField } from '@/components/ui/TextField';
import {
  contratar,
  frequenciaDoPeriodo,
  listarPlanos,
  PlanosDTO,
  precoDe,
} from '@/features/assinaturas/assinaturas.api';
import { extractErrorMessage } from '@/lib/apiClient';
import { formatCurrency } from '@/lib/format';

/** Contratação pelo síndico: escolhe o plano e o período, cadastra o condomínio e segue pro PIX. */
export function ContratarPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [dados, setDados] = useState<PlanosDTO | null>(null);
  const [erroPlanos, setErroPlanos] = useState(false);
  const [planoCodigo, setPlanoCodigo] = useState(searchParams.get('plano') ?? '');
  const [periodoCodigo, setPeriodoCodigo] = useState(searchParams.get('periodo') ?? 'MENSAL');

  const [nomeCondominio, setNomeCondominio] = useState('');
  const [nomeSindico, setNomeSindico] = useState('');
  const [email, setEmail] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [declaro, setDeclaro] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    listarPlanos()
      .then((resposta) => {
        setDados(resposta);
        setPlanoCodigo((atual) => {
          if (resposta.planos.some((p) => p.codigo === atual)) return atual;
          return (resposta.planos.find((p) => p.destaque) ?? resposta.planos[0])?.codigo ?? '';
        });
        setPeriodoCodigo((atual) =>
          resposta.periodos.some((p) => p.codigo === atual) ? atual : 'MENSAL',
        );
      })
      .catch(() => setErroPlanos(true));
  }, []);

  const plano = dados?.planos.find((p) => p.codigo === planoCodigo) ?? null;
  const periodo = dados?.periodos.find((p) => p.codigo === periodoCodigo) ?? null;
  const preco = plano && periodo ? precoDe(plano, periodo.codigo) : undefined;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!plano || !periodo) return;
    setErro(null);
    setEnviando(true);

    try {
      const contratacao = await contratar({
        planoCodigo: plano.codigo,
        periodoCodigo: periodo.codigo,
        nomeCondominio,
        nomeSindico,
        email,
        cpfCnpj,
        aceiteTermos: declaro,
      });
      navigate(`/contratacao/${contratacao.assinaturaId}`, { replace: true });
    } catch (err) {
      setErro(extractErrorMessage(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper bg-cortica bg-cortica-grid">
      <header className="mx-auto flex max-w-screen-2xl items-center justify-between px-6 py-6 lg:px-12">
        <Link to="/" aria-label="USAI — voltar para a tela inicial">
          <Logo altura={36} className="text-ink" />
        </Link>
        <Link to="/login" className="px-4 py-2 font-semibold text-ink-soft hover:text-ink">
          Já tenho conta
        </Link>
      </header>

      <main className="mx-auto grid max-w-5xl gap-8 px-6 pb-16 pt-4 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink lg:text-4xl">
            Contratar para o meu condomínio
          </h1>
          <p className="mt-2 text-ink-soft">
            Cadastre o condomínio, pague o primeiro período por PIX e receba o acesso por e-mail.
          </p>

          {erroPlanos && (
            <p role="alert" className="mt-6 text-sm text-carmim-700">
              Não foi possível carregar os planos. Recarregue a página.
            </p>
          )}

          {dados && (
            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-6">
              <fieldset className="flex flex-col gap-3">
                <legend className="mb-1 text-sm font-medium text-ink">
                  1. Plano (pela quantidade de moradores)
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {dados.planos.map((p) => (
                    <label
                      key={p.codigo}
                      className={`notch-sm flex cursor-pointer flex-col gap-0.5 border p-3 transition ${
                        p.codigo === planoCodigo
                          ? 'border-barro-500 bg-paper-surface ring-2 ring-barro-500'
                          : 'border-paper-line bg-paper-surface hover:bg-paper'
                      }`}
                    >
                      <input
                        type="radio"
                        name="plano"
                        value={p.codigo}
                        checked={p.codigo === planoCodigo}
                        onChange={() => setPlanoCodigo(p.codigo)}
                        className="sr-only"
                      />
                      <span className="flex items-center justify-between gap-2 font-display font-bold text-ink">
                        {p.nome}
                        {p.teste && (
                          <span className="notch-sm bg-mostarda-500 px-2 py-0.5 font-meta text-[10px] uppercase text-ink">
                            teste
                          </span>
                        )}
                      </span>
                      <span className="text-sm text-ink-soft">
                        até {p.limiteMoradores} moradores
                      </span>
                      <span className="font-display font-semibold text-barro-700">
                        a partir de {formatCurrency(p.valorMensal)}/mês
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="flex flex-col gap-3">
                <legend className="mb-1 text-sm font-medium text-ink">
                  2. Período de cobrança (quanto mais longo, maior o desconto)
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {dados.periodos.map((p) => {
                    const valor = plano ? precoDe(plano, p.codigo) : undefined;
                    return (
                      <label
                        key={p.codigo}
                        className={`notch-sm flex cursor-pointer flex-col gap-0.5 border p-3 transition ${
                          p.codigo === periodoCodigo
                            ? 'border-barro-500 bg-paper-surface ring-2 ring-barro-500'
                            : 'border-paper-line bg-paper-surface hover:bg-paper'
                        }`}
                      >
                        <input
                          type="radio"
                          name="periodo"
                          value={p.codigo}
                          checked={p.codigo === periodoCodigo}
                          onChange={() => setPeriodoCodigo(p.codigo)}
                          className="sr-only"
                        />
                        <span className="flex items-center justify-between gap-2 font-display font-bold text-ink">
                          {p.nome}
                          {p.desconto > 0 && (
                            <span className="notch-sm bg-jade-100 px-2 py-0.5 font-meta text-xs text-jade-700">
                              −{p.desconto}%
                            </span>
                          )}
                        </span>
                        {valor && (
                          <>
                            <span className="font-display font-semibold text-barro-700">
                              {formatCurrency(valor.valorTotal)}
                            </span>
                            <span className="text-xs text-ink-soft">
                              {p.meses === 1
                                ? 'cobrado todo mês'
                                : `${formatCurrency(valor.valorMensalEquivalente)}/mês`}
                            </span>
                          </>
                        )}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset className="flex flex-col gap-4">
                <legend className="mb-1 text-sm font-medium text-ink">
                  3. Condomínio e síndico
                </legend>
                <TextField
                  label="Nome do condomínio"
                  name="nomeCondominio"
                  required
                  minLength={3}
                  maxLength={80}
                  value={nomeCondominio}
                  onChange={(e) => setNomeCondominio(e.target.value)}
                />
                <TextField
                  label="Seu nome (síndico)"
                  name="nomeSindico"
                  required
                  minLength={2}
                  maxLength={80}
                  value={nomeSindico}
                  onChange={(e) => setNomeSindico(e.target.value)}
                />
                <TextField
                  label="E-mail (o acesso chega aqui)"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <TextField
                  label="CPF do síndico ou CNPJ do condomínio"
                  name="cpfCnpj"
                  inputMode="numeric"
                  required
                  value={cpfCnpj}
                  onChange={(e) => setCpfCnpj(e.target.value)}
                />
              </fieldset>

              <label className="flex items-start gap-3 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={declaro}
                  onChange={(e) => setDeclaro(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-barro-500"
                />
                <span>
                  Declaro que sou o síndico (ou represento o condomínio) e concordo com a cobrança
                  {preco && periodo
                    ? ` de ${formatCurrency(preco.valorTotal)} por PIX ${frequenciaDoPeriodo(periodo.meses)}`
                    : ' por PIX'}
                  .
                </span>
              </label>

              {erro && (
                <p role="alert" className="text-sm text-carmim-700">
                  {erro}
                </p>
              )}

              <Button type="submit" isLoading={enviando} disabled={!plano || !periodo || !declaro}>
                {enviando ? 'Gerando o PIX…' : 'Continuar para o pagamento'}
              </Button>
            </form>
          )}
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="notch border border-paper-line bg-paper-surface p-6 shadow-paper">
            <h2 className="font-display text-lg font-bold text-ink">Como funciona</h2>
            <ol className="mt-3 flex flex-col gap-3 text-sm text-ink-soft">
              <li>
                <strong className="text-ink">1. Você paga o PIX</strong> do primeiro período.
              </li>
              <li>
                <strong className="text-ink">2. Confirmado o pagamento,</strong> o condomínio é
                ativado e o link para criar sua senha chega por e-mail.
              </li>
              <li>
                <strong className="text-ink">3. No painel do síndico</strong> você pega o link e o
                PIN e envia aos moradores.
              </li>
            </ol>
            {plano && periodo && preco && (
              <div className="mt-5 border-t border-dashed border-paper-line pt-4">
                <p className="font-meta text-xs uppercase tracking-wide text-ink-faint">Resumo</p>
                <p className="mt-1 font-display font-semibold text-ink">
                  Plano {plano.nome} · até {plano.limiteMoradores} moradores
                </p>
                <p className="text-sm text-ink-soft">
                  {periodo.nome}
                  {periodo.desconto > 0 && ` · desconto de ${periodo.desconto}%`}
                </p>
                <p className="font-display text-2xl font-bold text-barro-700">
                  {formatCurrency(preco.valorTotal)}
                  <span className="text-sm font-normal text-ink-soft">
                    {' '}
                    {frequenciaDoPeriodo(periodo.meses)}
                  </span>
                </p>
                {preco.economia > 0 && (
                  <p className="text-sm font-semibold text-jade-700">
                    Você economiza {formatCurrency(preco.economia)} em relação ao mensal.
                  </p>
                )}
                <p className="mt-2 text-xs text-ink-faint">
                  Se o período não for renovado, o acesso dos moradores é suspenso até o próximo
                  pagamento. Na renovação você pode trocar de período.
                </p>
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
