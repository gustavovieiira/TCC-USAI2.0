import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CeuNoturno } from '@/components/fachada/CeuNoturno';
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

/** Opção de escolha (plano ou período): cartão com marcador de seleção, acessível como radio. */
function Opcao({
  nome,
  valor,
  marcado,
  aoEscolher,
  children,
}: {
  nome: string;
  valor: string;
  marcado: boolean;
  aoEscolher: () => void;
  children: ReactNode;
}) {
  return (
    <label
      className={`relative flex cursor-pointer flex-col gap-0.5 rounded-[16px] border-2 bg-white p-4 transition duration-200
        focus-within:ring-4 focus-within:ring-fachada-tinta/30 ${
          marcado
            ? 'border-fachada-coral-texto shadow-[0_0_0_4px_rgb(255_107_74/0.22)]'
            : 'border-fachada-tinta/15 hover:-translate-y-0.5 hover:border-fachada-tinta/40'
        }`}
    >
      <input
        type="radio"
        name={nome}
        value={valor}
        checked={marcado}
        onChange={aoEscolher}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={`absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full transition ${
          marcado ? 'scale-100 bg-fachada-coral-texto' : 'scale-75 bg-fachada-tinta/10'
        }`}
      >
        {marcado && (
          <svg
            viewBox="0 0 24 24"
            className="h-3 w-3"
            fill="none"
            stroke="#FFF8EC"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12l4.5 4.5L19 7" />
          </svg>
        )}
      </span>
      {children}
    </label>
  );
}

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
    <div className="mundo-fachada relative min-h-screen overflow-hidden">
      <CeuNoturno />

      <div className="relative">
        <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
          <Link to="/" aria-label="USAI — voltar para a tela inicial">
            <Logo altura={36} className="text-fachada-papel" />
          </Link>
          <Link
            to="/login"
            className="px-4 py-2 font-marca font-semibold text-fachada-papel-suave transition-colors hover:text-fachada-papel"
          >
            Já tenho conta
          </Link>
        </header>

        <main className="mx-auto grid max-w-6xl gap-8 px-5 pb-20 pt-2 sm:px-8 lg:grid-cols-[1.45fr_1fr]">
          <div
            className="sobre-claro entra rounded-[28px] bg-fachada-papel p-6 text-fachada-tinta
              shadow-[0_34px_60px_-28px_rgb(0_0_0/0.85)] sm:p-9"
          >
            <h1 className="font-marca text-[2rem] font-extrabold leading-[1.04] tracking-[-0.03em] sm:text-4xl">
              Contratar para o meu condomínio
            </h1>
            <p className="mt-2 text-fachada-tinta-suave">
              Cadastre o condomínio, pague o primeiro período por PIX e receba o acesso por e-mail.
            </p>

            {erroPlanos && (
              <p role="alert" className="mt-6 text-sm font-medium text-fachada-coral-texto">
                Não foi possível carregar os planos. Recarregue a página.
              </p>
            )}

            {dados && (
              <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-8">
                <fieldset className="flex flex-col gap-3">
                  <legend className="mb-1 font-marca text-lg font-bold">
                    1. Plano (pela quantidade de moradores)
                  </legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {dados.planos.map((p) => (
                      <Opcao
                        key={p.codigo}
                        nome="plano"
                        valor={p.codigo}
                        marcado={p.codigo === planoCodigo}
                        aoEscolher={() => setPlanoCodigo(p.codigo)}
                      >
                        <span className="flex items-center gap-2 pr-6 font-marca text-lg font-extrabold">
                          {p.nome}
                          {p.teste && (
                            <span className="rounded-full bg-fachada-luz px-2 py-0.5 font-sans text-xs font-bold uppercase text-fachada-tinta">
                              teste
                            </span>
                          )}
                        </span>
                        <span className="text-sm text-fachada-tinta-suave">
                          até {p.limiteMoradores} moradores
                        </span>
                        <span className="font-marca font-bold text-fachada-coral-texto">
                          a partir de {formatCurrency(p.valorMensal)}/mês
                        </span>
                      </Opcao>
                    ))}
                  </div>
                </fieldset>

                <fieldset className="flex flex-col gap-3">
                  <legend className="mb-1 font-marca text-lg font-bold">
                    2. Período de cobrança (quanto mais longo, maior o desconto)
                  </legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {dados.periodos.map((p) => {
                      const valor = plano ? precoDe(plano, p.codigo) : undefined;
                      return (
                        <Opcao
                          key={p.codigo}
                          nome="periodo"
                          valor={p.codigo}
                          marcado={p.codigo === periodoCodigo}
                          aoEscolher={() => setPeriodoCodigo(p.codigo)}
                        >
                          <span className="flex items-center gap-2 pr-6 font-marca text-lg font-extrabold">
                            {p.nome}
                            {p.desconto > 0 && (
                              <span className="rounded-full bg-fachada-folha/30 px-2 py-0.5 font-sans text-xs font-bold text-fachada-folha-texto">
                                −{p.desconto}%
                              </span>
                            )}
                          </span>
                          {valor && (
                            <>
                              <span className="font-marca font-bold text-fachada-coral-texto">
                                {formatCurrency(valor.valorTotal)}
                              </span>
                              <span className="text-xs text-fachada-tinta-suave">
                                {p.meses === 1
                                  ? 'cobrado todo mês'
                                  : `${formatCurrency(valor.valorMensalEquivalente)}/mês`}
                              </span>
                            </>
                          )}
                        </Opcao>
                      );
                    })}
                  </div>
                </fieldset>

                <fieldset className="flex flex-col gap-4">
                  <legend className="mb-1 font-marca text-lg font-bold">
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

                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={declaro}
                    onChange={(e) => setDeclaro(e.target.checked)}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-fachada-coral-texto"
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
                  <p role="alert" className="text-sm font-medium text-fachada-coral-texto">
                    {erro}
                  </p>
                )}

                <Button
                  type="submit"
                  isLoading={enviando}
                  disabled={!plano || !periodo || !declaro}
                >
                  {enviando ? 'Gerando o PIX…' : 'Continuar para o pagamento'}
                </Button>
              </form>
            )}
          </div>

          <aside className="flex flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-[24px] bg-fachada-predio p-6 text-fachada-papel">
              <h2 className="font-marca text-xl font-extrabold">Como funciona</h2>
              <ol className="mt-3 flex flex-col gap-3 text-sm text-fachada-papel-suave">
                <li>
                  <strong className="text-fachada-papel">1. Você paga o PIX</strong> do primeiro
                  período.
                </li>
                <li>
                  <strong className="text-fachada-papel">2. Confirmado o pagamento,</strong> o
                  condomínio é ativado e o link para criar sua senha chega por e-mail.
                </li>
                <li>
                  <strong className="text-fachada-papel">3. No painel do síndico</strong> você pega
                  o link e o PIN e envia aos moradores.
                </li>
              </ol>
            </div>

            {plano && periodo && preco && (
              <div
                className="sobre-claro -rotate-1 rounded-[18px] bg-fachada-papel p-6 text-fachada-tinta
                  shadow-[0_22px_36px_-20px_rgb(0_0_0/0.85)]"
              >
                <p className="font-mao text-2xl font-bold leading-none text-fachada-coral-texto">
                  Resumo
                </p>
                <p className="mt-2 font-marca text-lg font-bold leading-tight">
                  Plano {plano.nome} · até {plano.limiteMoradores} moradores
                </p>
                <p className="text-sm text-fachada-tinta-suave">
                  {periodo.nome}
                  {periodo.desconto > 0 && ` · desconto de ${periodo.desconto}%`}
                </p>
                <p className="mt-1 font-marca text-4xl font-extrabold tracking-tight">
                  {formatCurrency(preco.valorTotal)}
                  <span className="font-sans text-sm font-normal text-fachada-tinta-suave">
                    {' '}
                    {frequenciaDoPeriodo(periodo.meses)}
                  </span>
                </p>
                {preco.economia > 0 && (
                  <p className="mt-1 text-sm font-semibold text-fachada-folha-texto">
                    Você economiza {formatCurrency(preco.economia)} em relação ao mensal.
                  </p>
                )}
                <p className="mt-3 text-xs text-fachada-tinta-suave">
                  Se o período não for renovado, o acesso dos moradores é suspenso até o próximo
                  pagamento. Na renovação você pode trocar de período.
                </p>
              </div>
            )}
          </aside>
        </main>
      </div>
    </div>
  );
}
