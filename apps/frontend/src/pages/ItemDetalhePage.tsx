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
    return <p className="text-sm text-carmim-700">{erroCarregamento}</p>;
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
      <div className="notch aspect-[16/9] w-full overflow-hidden bg-[repeating-linear-gradient(135deg,#E4D3BC_0_8px,#DAC6AB_8px_16px)]">
        {item.imagens[0] ? (
          <img src={item.imagens[0]} alt={item.titulo} className="h-full w-full object-cover" />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center font-meta text-xs
            tracking-wide text-ink/50"
          >
            SEM FOTO
          </div>
        )}
      </div>

      <div>
        <span className="font-meta text-xs uppercase tracking-wider text-ink-faint">
          {item.categoria}
        </span>
        <h1 className="font-display text-2xl font-bold text-ink">{item.titulo}</h1>
        <p className="mt-1 font-display text-xl font-bold text-barro-700">
          {formatCurrency(item.valorDiaria)}
          <span className="ml-1 font-sans text-sm font-normal text-ink-soft">/ dia</span>
        </p>
      </div>

      <Card>
        <h2 className="mb-2 font-display font-semibold text-ink">Descrição</h2>
        <p className="whitespace-pre-line text-sm text-ink-soft">{item.descricao}</p>
      </Card>

      {ehDono ? (
        <Card className="bg-paper text-sm text-ink-soft">
          Este item é seu — acompanhe as solicitações em{' '}
          <Link to="/locacoes" className="font-semibold text-barro-700 hover:underline">
            Minhas locações
          </Link>
          .
        </Card>
      ) : sucesso ? (
        <Card className="flex flex-col items-center gap-3 text-center">
          <p className="font-display font-semibold text-ink">Solicitação enviada!</p>
          <p className="text-sm text-ink-soft">
            O dono do item vai aprovar ou rejeitar o pedido em breve.
          </p>
          <Link
            to="/locacoes"
            className="notch bg-barro-500 px-4 py-2 text-sm font-bold text-paper-surface
              shadow-press hover:bg-barro-700"
          >
            Ver minhas locações
          </Link>
        </Card>
      ) : (
        <Card>
          <h2 className="mb-4 font-display font-semibold text-ink">Solicitar locação</h2>
          <form onSubmit={handleSolicitar} className="flex flex-col gap-4" noValidate>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="dataInicio" className="text-sm font-medium text-ink">
                  De
                </label>
                <input
                  id="dataInicio"
                  type="date"
                  required
                  min={hoje()}
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="min-h-[44px] border border-ink/40 bg-paper-surface px-3 py-2 text-sm
                    text-ink outline-none transition focus:border-ink"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="dataFim" className="text-sm font-medium text-ink">
                  Até
                </label>
                <input
                  id="dataFim"
                  type="date"
                  required
                  min={dataInicio || hoje()}
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="min-h-[44px] border border-ink/40 bg-paper-surface px-3 py-2 text-sm
                    text-ink outline-none transition focus:border-ink"
                />
              </div>
            </div>

            {dias > 0 && (
              <p className="text-sm text-ink-soft">
                {dias} {dias === 1 ? 'diária' : 'diárias'} ·{' '}
                <span className="font-display font-semibold text-ink">
                  {formatCurrency(valorEstimado)}
                </span>
              </p>
            )}

            {erroSolicitacao && (
              <p role="alert" className="text-sm text-carmim-700">
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
        className="text-sm font-semibold text-ink-soft hover:text-ink"
      >
        ← Voltar
      </button>
    </div>
  );
}
