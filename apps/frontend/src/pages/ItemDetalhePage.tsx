import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { extractErrorMessage } from '@/lib/apiClient';
import { getStoredUser } from '@/lib/authStorage';
import { calcularDias, formatCurrency } from '@/lib/format';
import { buscarItem } from '@/features/itens/itens.api';
import { ItemDTO } from '@/features/itens/itens.types';
import { solicitarLocacao } from '@/features/locacoes/locacoes.api';

function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ItemDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = getStoredUser();

  const [item, setItem] = useState<ItemDTO | null>(null);
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null);

  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [erroSolicitacao, setErroSolicitacao] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    buscarItem(id)
      .then(setItem)
      .catch((err) => setErroCarregamento(extractErrorMessage(err)));
  }, [id]);

  if (erroCarregamento) {
    return <p className="text-sm text-red-600">{erroCarregamento}</p>;
  }

  if (!item) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  const ehDono = user?.id === item.ownerId;
  const dias = calcularDias(dataInicio, dataFim);
  const valorEstimado = dias * item.valorDiaria;

  async function handleSolicitar(event: FormEvent) {
    event.preventDefault();
    if (!item) return;
    setErroSolicitacao(null);
    setIsLoading(true);

    try {
      await solicitarLocacao({ itemId: item.id, dataInicio, dataFim });
      setSucesso(true);
    } catch (err) {
      setErroSolicitacao(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <div className="aspect-[16/9] w-full overflow-hidden rounded-2xl bg-slate-100">
        {item.imagens[0] ? (
          <img src={item.imagens[0]} alt={item.titulo} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            Sem foto
          </div>
        )}
      </div>

      <div>
        <span className="text-xs font-semibold uppercase tracking-wide text-brand-600">
          {item.categoria}
        </span>
        <h1 className="text-2xl font-bold text-slate-900">{item.titulo}</h1>
        <p className="mt-1 font-mono text-lg font-semibold text-slate-900">
          {formatCurrency(item.valorDiaria)}
          <span className="ml-1 font-sans text-sm font-normal text-slate-500">/ dia</span>
        </p>
      </div>

      <Card>
        <h2 className="mb-2 font-semibold text-slate-900">Descrição</h2>
        <p className="whitespace-pre-line text-sm text-slate-600">{item.descricao}</p>
      </Card>

      {ehDono ? (
        <Card className="bg-slate-50 text-sm text-slate-500 ring-0">
          Este item é seu — acompanhe as solicitações em{' '}
          <Link to="/locacoes" className="font-semibold text-brand-600 hover:underline">
            Minhas locações
          </Link>
          .
        </Card>
      ) : sucesso ? (
        <Card className="flex flex-col items-center gap-3 text-center">
          <p className="font-semibold text-slate-900">Solicitação enviada!</p>
          <p className="text-sm text-slate-500">
            O dono do item vai aprovar ou rejeitar o pedido em breve.
          </p>
          <Link
            to="/locacoes"
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white
              hover:bg-brand-700"
          >
            Ver minhas locações
          </Link>
        </Card>
      ) : (
        <Card>
          <h2 className="mb-4 font-semibold text-slate-900">Solicitar locação</h2>
          <form onSubmit={handleSolicitar} className="flex flex-col gap-4" noValidate>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="dataInicio" className="text-sm font-medium text-slate-700">
                  De
                </label>
                <input
                  id="dataInicio"
                  type="date"
                  required
                  min={hoje()}
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none
                    transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="dataFim" className="text-sm font-medium text-slate-700">
                  Até
                </label>
                <input
                  id="dataFim"
                  type="date"
                  required
                  min={dataInicio || hoje()}
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none
                    transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </div>
            </div>

            {dias > 0 && (
              <p className="text-sm text-slate-600">
                {dias} {dias === 1 ? 'diária' : 'diárias'} ·{' '}
                <span className="font-mono font-semibold text-slate-900">
                  {formatCurrency(valorEstimado)}
                </span>
              </p>
            )}

            {erroSolicitacao && (
              <p role="alert" className="text-sm text-red-600">
                {erroSolicitacao}
              </p>
            )}

            <Button type="submit" isLoading={isLoading} disabled={dias === 0}>
              Solicitar locação
            </Button>
          </form>
        </Card>
      )}

      <button
        onClick={() => navigate(-1)}
        className="text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        ← Voltar
      </button>
    </div>
  );
}
