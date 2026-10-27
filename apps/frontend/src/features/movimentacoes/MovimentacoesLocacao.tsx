import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { extractErrorMessage } from '@/lib/apiClient';
import { formatDateHora } from '@/lib/format';
import { LocacaoDTO } from '@/features/locacoes/locacoes.types';
import { useNotificacoesContext } from '@/features/notificacoes/useNotificacoes';
import { listarMovimentacoesDaLocacao } from './movimentacoes.api';
import { MovimentacaoResumoDTO, TipoMovimentacao } from './movimentacoes.types';
import { RegistrarMovimentacaoModal } from './RegistrarMovimentacaoModal';
import { CLASSE_STATUS, ROTULO_STATUS, ROTULO_TIPO } from './rotulos';

interface MovimentacoesLocacaoProps {
  locacao: LocacaoDTO;
  /** Id de quem está olhando — define se é o dono (entrega) ou o locatário (devolve). */
  userId: string | undefined;
}

/** Locações em que já pode haver (ou já houve) retirada/devolução. */
const STATUS_COM_MOVIMENTACAO: LocacaoDTO['status'][] = ['PAGA', 'EM_ANDAMENTO', 'CONCLUIDA'];

/**
 * Retirada e devolução do item dentro do card da locação: o histórico dos documentos (com o aceite
 * de cada um) e o botão da próxima etapa pra quem pode executá-la — o dono registra a entrega, o
 * locatário registra a devolução; quem recebe assina o termo na tela do documento.
 */
export function MovimentacoesLocacao({ locacao, userId }: MovimentacoesLocacaoProps) {
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoResumoDTO[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [registrando, setRegistrando] = useState<TipoMovimentacao | null>(null);
  const { ultimaRecebida } = useNotificacoesContext();

  const exibir = STATUS_COM_MOVIMENTACAO.includes(locacao.status);
  // Muda quando chega aviso de movimentação (o outro lado aceitou, cancelou…): recarrega a lista.
  const recarregarComAviso = ultimaRecebida?.tipo.startsWith('MOVIMENTACAO_')
    ? ultimaRecebida.id
    : null;

  const carregar = useCallback(() => {
    listarMovimentacoesDaLocacao(locacao.id)
      .then(setMovimentacoes)
      .catch((err) => setErro(extractErrorMessage(err)));
  }, [locacao.id]);

  useEffect(() => {
    if (exibir) carregar();
  }, [exibir, locacao.status, recarregarComAviso, carregar]);

  if (!exibir) return null;

  const ehDono = !!userId && userId === locacao.item.ownerId;
  const ehLocatario = !!userId && userId === locacao.locatarioId;
  const ativa = (tipo: TipoMovimentacao) =>
    movimentacoes?.some((m) => m.tipo === tipo && m.status !== 'CANCELADA') ?? false;

  const podeRegistrarEntrega = ehDono && locacao.status === 'PAGA' && !ativa('RETIRADA');
  const podeRegistrarDevolucao =
    ehLocatario && locacao.status === 'EM_ANDAMENTO' && !ativa('DEVOLUCAO');

  return (
    <div className="mt-3 border-t border-dashed border-paper-line pt-3">
      <p className="font-meta text-xs uppercase tracking-wide text-ink-faint">
        Retirada e devolução
      </p>

      {erro && <p className="mt-1 text-sm text-carmim-700">{erro}</p>}

      {movimentacoes && movimentacoes.length === 0 && (
        <p className="mt-1 text-sm text-ink-soft">
          {locacao.status === 'PAGA'
            ? ehDono
              ? 'Pagamento confirmado. Registre a entrega do item ao locatário.'
              : 'Pagamento confirmado. Aguardando o proprietário registrar a entrega do item.'
            : 'Nenhum registro de retirada ou devolução.'}
        </p>
      )}

      {movimentacoes && movimentacoes.length > 0 && (
        <ul className="mt-1 flex flex-col gap-1">
          {movimentacoes.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-2 text-sm">
              <Link
                to={`/movimentacoes/${m.id}`}
                className="font-semibold text-barro-700 hover:underline"
              >
                {ROTULO_TIPO[m.tipo]} · {m.numeroDocumento}
              </Link>
              <span className={`notch-sm px-2 py-0.5 text-xs font-bold ${CLASSE_STATUS[m.status]}`}>
                {ROTULO_STATUS[m.status]}
              </span>
              <span className="text-xs text-ink-faint">{formatDateHora(m.ocorridoEm)}</span>
              {m.status === 'AGUARDANDO_ACEITE' && userId === m.recebidoPor.id && (
                <Link
                  to={`/movimentacoes/${m.id}`}
                  className="text-xs font-bold text-carmim-700 hover:underline"
                >
                  Confira e aceite o termo ›
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}

      {(podeRegistrarEntrega || podeRegistrarDevolucao) && (
        <div className="mt-2">
          <Button
            fullWidth={false}
            onClick={() => setRegistrando(podeRegistrarEntrega ? 'RETIRADA' : 'DEVOLUCAO')}
          >
            {podeRegistrarEntrega ? 'Registrar entrega' : 'Registrar devolução'}
          </Button>
        </div>
      )}

      {registrando && (
        <RegistrarMovimentacaoModal
          locacaoId={locacao.id}
          itemTitulo={locacao.item.titulo}
          tipo={registrando}
          acessoriosDoItem={locacao.item.acessorios ?? []}
          onFechar={() => setRegistrando(null)}
          onRegistrado={() => {
            setRegistrando(null);
            carregar();
          }}
        />
      )}
    </div>
  );
}
