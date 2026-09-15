import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { extractErrorMessage } from '@/lib/apiClient';
import { formatCurrency, formatDate } from '@/lib/format';
import {
  aprovarLocacao,
  listarComoLocatario,
  listarComoProprietario,
  rejeitarLocacao,
} from '@/features/locacoes/locacoes.api';
import { LocacaoDTO } from '@/features/locacoes/locacoes.types';

type Aba = 'locatario' | 'proprietario';

export function MinhasLocacoesPage() {
  const [aba, setAba] = useState<Aba>('locatario');
  const [comoLocatario, setComoLocatario] = useState<LocacaoDTO[] | null>(null);
  const [comoProprietario, setComoProprietario] = useState<LocacaoDTO[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [processandoId, setProcessandoId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listarComoLocatario(), listarComoProprietario()])
      .then(([locatario, proprietario]) => {
        setComoLocatario(locatario);
        setComoProprietario(proprietario);
      })
      .catch((err) => setErro(extractErrorMessage(err)));
  }, []);

  async function handleAprovar(locacao: LocacaoDTO) {
    setProcessandoId(locacao.id);
    try {
      const atualizada = await aprovarLocacao(locacao.id);
      setComoProprietario(
        (atual) => atual?.map((l) => (l.id === atualizada.id ? atualizada : l)) ?? atual,
      );
    } catch (err) {
      setErro(extractErrorMessage(err));
    } finally {
      setProcessandoId(null);
    }
  }

  async function handleRejeitar(locacao: LocacaoDTO) {
    setProcessandoId(locacao.id);
    try {
      const atualizada = await rejeitarLocacao(locacao.id);
      setComoProprietario(
        (atual) => atual?.map((l) => (l.id === atualizada.id ? atualizada : l)) ?? atual,
      );
    } catch (err) {
      setErro(extractErrorMessage(err));
    } finally {
      setProcessandoId(null);
    }
  }

  const lista = aba === 'locatario' ? comoLocatario : comoProprietario;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Minhas locações</h1>
        <p className="text-sm text-slate-500">Acompanhe o que você alugou e o que emprestou.</p>
      </div>

      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        <button
          onClick={() => setAba('locatario')}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
            aba === 'locatario' ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-500'
          }`}
        >
          Como locatário
        </button>
        <button
          onClick={() => setAba('proprietario')}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
            aba === 'proprietario' ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-500'
          }`}
        >
          Recebidas
        </button>
      </div>

      {erro && <p className="text-sm text-red-600">{erro}</p>}

      {!lista && !erro && (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      )}

      {lista && lista.length === 0 && (
        <EmptyState
          title={
            aba === 'locatario' ? 'Você ainda não alugou nada' : 'Nenhuma solicitação recebida'
          }
          description={
            aba === 'locatario'
              ? 'Explore o catálogo do seu condomínio e solicite uma locação.'
              : 'Quando alguém solicitar um dos seus itens, aparece aqui.'
          }
        />
      )}

      {lista && lista.length > 0 && (
        <div className="flex flex-col gap-3">
          {lista.map((locacao) => (
            <Card key={locacao.id} className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-900">{locacao.item.titulo}</h3>
                  <StatusBadge status={locacao.status} />
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {formatDate(locacao.dataInicio)} → {formatDate(locacao.dataFim)}
                </p>
                <p className="mt-1 font-mono text-sm font-semibold text-slate-900">
                  {formatCurrency(locacao.valorTotal)}
                </p>
              </div>

              {aba === 'proprietario' && locacao.status === 'PENDENTE' && (
                <div className="flex gap-2 sm:flex-col">
                  <Button
                    fullWidth={false}
                    isLoading={processandoId === locacao.id}
                    onClick={() => handleAprovar(locacao)}
                    className="flex-1 sm:flex-none"
                  >
                    Aprovar
                  </Button>
                  <Button
                    variant="danger"
                    fullWidth={false}
                    disabled={processandoId === locacao.id}
                    onClick={() => handleRejeitar(locacao)}
                    className="flex-1 sm:flex-none"
                  >
                    Rejeitar
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
