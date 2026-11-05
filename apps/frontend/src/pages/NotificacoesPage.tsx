import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { FiltroChips } from '@/components/ui/FiltroChips';
import { Spinner } from '@/components/ui/Spinner';
import { formatRelativeTime } from '@/lib/format';
import { NotificacaoDTO } from '@/features/notificacoes/notificacoes.types';
import { useNotificacoesContext } from '@/features/notificacoes/useNotificacoes';
import { escalonar } from '@/lib/animacao';

export function NotificacoesPage() {
  const navigate = useNavigate();
  const { notificacoes, naoLidas, marcarComoLida, marcarTodasComoLidas } = useNotificacoesContext();
  const [filtro, setFiltro] = useState<'TODAS' | 'NAO_LIDAS'>('TODAS');
  const visiveis =
    filtro === 'NAO_LIDAS' ? (notificacoes ?? []).filter((n) => !n.lida) : (notificacoes ?? []);

  function abrir(notificacao: NotificacaoDTO) {
    marcarComoLida(notificacao.id);
    if (notificacao.link) navigate(notificacao.link);
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Notificações</h1>
          <p className="text-sm text-ink-soft">
            Tudo o que aconteceu nas suas locações, pagamentos e saques. Guardamos os últimos 30
            dias.
          </p>
        </div>
        {naoLidas > 0 && (
          <Button variant="ghost" fullWidth={false} onClick={marcarTodasComoLidas}>
            Marcar todas como lidas
          </Button>
        )}
      </div>

      {!notificacoes && (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      )}

      {notificacoes && notificacoes.length === 0 && (
        <EmptyState
          title="Nenhuma notificação ainda"
          description="Quando alguém pedir um item seu, um pagamento cair ou um saque for decidido, você vê aqui."
        />
      )}

      {notificacoes && notificacoes.length > 0 && (
        <FiltroChips
          rotulo="Filtrar notificações"
          valor={filtro}
          onChange={setFiltro}
          opcoes={[
            { valor: 'TODAS', rotulo: 'Todas', total: notificacoes.length },
            { valor: 'NAO_LIDAS', rotulo: 'Não lidas', total: naoLidas },
          ]}
        />
      )}

      {notificacoes && notificacoes.length > 0 && visiveis.length === 0 && (
        <EmptyState
          title="Tudo lido por aqui"
          description="Não há notificações novas. Escolha Todas para rever as anteriores."
        />
      )}

      {visiveis.length > 0 && (
        <ul className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto pr-1">
          {visiveis.map((notificacao, indice) => (
            <li key={notificacao.id} className="entra" style={escalonar(indice, 50)}>
              <button
                type="button"
                onClick={() => abrir(notificacao)}
                className={`notch w-full border p-4 text-left transition hover:bg-paper ${
                  notificacao.lida
                    ? 'border-paper-line bg-paper-surface'
                    : 'border-barro-400 bg-barro-50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-display font-semibold text-ink">
                    {!notificacao.lida && (
                      <span
                        className="mr-2 inline-block h-2 w-2 rounded-full bg-carmim-500"
                        aria-label="Não lida"
                      />
                    )}
                    {notificacao.titulo}
                  </p>
                  <span className="shrink-0 font-meta text-xs text-ink-faint">
                    {formatRelativeTime(notificacao.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink-soft">{notificacao.mensagem}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
