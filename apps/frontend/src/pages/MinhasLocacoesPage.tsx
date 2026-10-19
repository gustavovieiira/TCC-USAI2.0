import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { abrirConversaDaLocacao } from '@/features/conversas/conversas.api';
import { LocacaoDTO } from '@/features/locacoes/locacoes.types';
import { useNotificacoesContext } from '@/features/notificacoes/useNotificacoes';
import { useLocacaoAtualizada } from '@/features/locacoes/useLocacaoAtualizada';
import { criarCobranca } from '@/features/pagamentos/pagamentos.api';

type Aba = 'locatario' | 'proprietario';

export function MinhasLocacoesPage() {
  const navigate = useNavigate();
  const [aba, setAba] = useState<Aba>('locatario');
  const [comoLocatario, setComoLocatario] = useState<LocacaoDTO[] | null>(null);
  const [comoProprietario, setComoProprietario] = useState<LocacaoDTO[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [processandoId, setProcessandoId] = useState<string | null>(null);

  // Notificação ao vivo de locação/pagamento (pedido novo, aprovação...) → recarrega as listas.
  const { ultimaRecebida } = useNotificacoesContext();
  const recarregarComNotificacao =
    ultimaRecebida && /^(LOCACAO|PAGAMENTO)_/.test(ultimaRecebida.tipo) ? ultimaRecebida.id : null;

  useEffect(() => {
    Promise.all([listarComoLocatario(), listarComoProprietario()])
      .then(([locatario, proprietario]) => {
        setComoLocatario(locatario);
        setComoProprietario(proprietario);
      })
      .catch((err) => setErro(extractErrorMessage(err)));
  }, [recarregarComNotificacao]);

  useLocacaoAtualizada((evento) => {
    const aplicar = (lista: LocacaoDTO[] | null) =>
      lista?.map((l) => (l.id === evento.locacaoId ? { ...l, status: evento.status } : l)) ?? lista;

    setComoLocatario(aplicar);
    setComoProprietario(aplicar);
  });

  /** O chat da locação vive na página de Conversas: abre (criando se for a primeira vez) e vai pra lá. */
  async function handleAbrirConversa(locacaoId: string) {
    try {
      const conversa = await abrirConversaDaLocacao(locacaoId);
      navigate(`/conversas/${conversa.id}`);
    } catch (err) {
      setErro(extractErrorMessage(err));
    }
  }

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

  /** M3 — abre o link de pagamento PIX do Asaas numa aba nova; a volta pra PAGA chega sozinha via socket. */
  async function handlePagar(locacao: LocacaoDTO) {
    setProcessandoId(locacao.id);
    try {
      const { invoiceUrl } = await criarCobranca(locacao.id);
      window.open(invoiceUrl, '_blank', 'noopener,noreferrer');
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
        <h1 className="font-display text-2xl font-bold text-ink">Minhas locações</h1>
        <p className="text-sm text-ink-soft">Acompanhe o que você alugou e o que emprestou.</p>
      </div>

      <div className="flex gap-1 border border-paper-line bg-paper-surface p-1">
        <button
          onClick={() => setAba('locatario')}
          className={`flex-1 py-2 text-sm font-semibold transition ${
            aba === 'locatario' ? 'notch-sm bg-ink text-ink-inverse' : 'text-ink-soft'
          }`}
        >
          Como locatário
        </button>
        <button
          onClick={() => setAba('proprietario')}
          className={`flex-1 py-2 text-sm font-semibold transition ${
            aba === 'proprietario' ? 'notch-sm bg-ink text-ink-inverse' : 'text-ink-soft'
          }`}
        >
          Recebidas
        </button>
      </div>

      {erro && <p className="text-sm text-carmim-700">{erro}</p>}

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
                  <h3 className="font-display font-semibold text-ink">{locacao.item.titulo}</h3>
                  <StatusBadge status={locacao.status} />
                </div>
                <p className="mt-1 text-sm text-ink-soft">
                  {formatDate(locacao.dataInicio)} → {formatDate(locacao.dataFim)}
                </p>
                <p className="mt-1 font-display text-sm font-semibold text-ink">
                  {formatCurrency(locacao.valorTotal)}
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:items-end">
                <button
                  type="button"
                  onClick={() => handleAbrirConversa(locacao.id)}
                  className="text-sm font-semibold text-barro-700 hover:underline"
                >
                  Mensagens
                </button>

                {aba === 'proprietario' && locacao.status === 'PENDENTE' && (
                  <div className="flex gap-2">
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

                {aba === 'locatario' && locacao.status === 'APROVADA' && (
                  <Button
                    fullWidth={false}
                    isLoading={processandoId === locacao.id}
                    onClick={() => handlePagar(locacao)}
                  >
                    Pagar agora
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
