import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import {
  aprovarLocacao,
  Locacao,
  listarLocacoesRecebidas,
  listarMinhasLocacoes,
  rejeitarLocacao,
} from '@/features/locacoes/locacoes.api';
import { StatusBadge } from '@/features/locacoes/StatusBadge';
import { extractErrorMessage } from '@/lib/apiClient';
import { formatarPeriodo } from '@/lib/formatters';

export function AcompanhamentoPage() {
  const [minhas, setMinhas] = useState<Locacao[]>([]);
  const [recebidas, setRecebidas] = useState<Locacao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processandoId, setProcessandoId] = useState<string | null>(null);

  async function carregar() {
    setIsLoading(true);
    setError(null);
    try {
      const [minhasResultado, recebidasResultado] = await Promise.all([
        listarMinhasLocacoes(),
        listarLocacoesRecebidas(),
      ]);
      setMinhas(minhasResultado);
      setRecebidas(recebidasResultado);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function handleDecisao(id: string, decisao: 'aprovar' | 'rejeitar') {
    setProcessandoId(id);
    try {
      const atualizada =
        decisao === 'aprovar' ? await aprovarLocacao(id) : await rejeitarLocacao(id);
      setRecebidas((atual) => atual.map((l) => (l.id === id ? atualizada : l)));
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setProcessandoId(null);
    }
  }

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold text-slate-900">Acompanhamento de locações</h1>

      {isLoading && <p className="mt-6 text-slate-500">Carregando...</p>}
      {error && (
        <p role="alert" className="mt-6 text-red-600">
          {error}
        </p>
      )}

      {!isLoading && (
        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <section>
            <h2 className="font-semibold text-slate-900">Solicitações que recebi</h2>
            <p className="text-sm text-slate-500">Itens seus que vizinhos querem alugar.</p>

            <ul className="mt-4 flex flex-col gap-3">
              {recebidas.length === 0 && (
                <li className="text-sm text-slate-500">Nenhuma solicitação recebida ainda.</li>
              )}
              {recebidas.map((locacao) => (
                <li
                  key={locacao.id}
                  className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900">{locacao.item.titulo}</span>
                    <StatusBadge status={locacao.status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {formatarPeriodo(locacao.dataInicio, locacao.dataFim)} · R${' '}
                    {locacao.valorTotal.toFixed(2)}
                  </p>

                  {locacao.status === 'PENDENTE' && (
                    <div className="mt-3 flex gap-2">
                      <button
                        disabled={processandoId === locacao.id}
                        onClick={() => handleDecisao(locacao.id, 'aprovar')}
                        className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white
                          hover:bg-brand-700 disabled:opacity-60"
                      >
                        Aprovar
                      </button>
                      <button
                        disabled={processandoId === locacao.id}
                        onClick={() => handleDecisao(locacao.id, 'rejeitar')}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium
                          text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      >
                        Rejeitar
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-slate-900">Minhas solicitações</h2>
            <p className="text-sm text-slate-500">Itens que você pediu para alugar.</p>

            <ul className="mt-4 flex flex-col gap-3">
              {minhas.length === 0 && (
                <li className="text-sm text-slate-500">
                  Você ainda não solicitou nenhuma locação.
                </li>
              )}
              {minhas.map((locacao) => (
                <li
                  key={locacao.id}
                  className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900">{locacao.item.titulo}</span>
                    <StatusBadge status={locacao.status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {formatarPeriodo(locacao.dataInicio, locacao.dataFim)} · R${' '}
                    {locacao.valorTotal.toFixed(2)}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </AppShell>
  );
}
