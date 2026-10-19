import { createContext, useContext, useEffect, useState } from 'react';
import { createConversaSocket } from '@/lib/socket';
import { getStoredUser } from '@/lib/authStorage';
import {
  listarNotificacoes,
  marcarNotificacaoComoLida,
  marcarTodasNotificacoesComoLidas,
} from './notificacoes.api';
import { NotificacaoDTO } from './notificacoes.types';

export interface NotificacoesEstado {
  /** `null` até a primeira carga terminar. */
  notificacoes: NotificacaoDTO[] | null;
  naoLidas: number;
  /** Última que chegou ao vivo — telas que mostram dados afetados (ex.: Locações) recarregam. */
  ultimaRecebida: NotificacaoDTO | null;
  toast: NotificacaoDTO | null;
  marcarComoLida: (id: string) => void;
  marcarTodasComoLidas: () => void;
  fecharToast: () => void;
}

const ESTADO_VAZIO: NotificacoesEstado = {
  notificacoes: null,
  naoLidas: 0,
  ultimaRecebida: null,
  toast: null,
  marcarComoLida: () => undefined,
  marcarTodasComoLidas: () => undefined,
  fecharToast: () => undefined,
};

/** O AppShell provê o estado uma vez só; sino e página de notificações leem do mesmo lugar. */
export const NotificacoesContext = createContext<NotificacoesEstado>(ESTADO_VAZIO);

export function useNotificacoesContext(): NotificacoesEstado {
  return useContext(NotificacoesContext);
}

/**
 * Carrega as notificações persistidas e escuta `notificacao:nova` na sala pessoal do usuário
 * (mesma infra de `useConversaNotifications`). Vale pra todos os papéis, inclusive Admin USAI.
 */
export function useNotificacoes(ativo: boolean): NotificacoesEstado {
  const [notificacoes, setNotificacoes] = useState<NotificacaoDTO[] | null>(null);
  const [naoLidas, setNaoLidas] = useState(0);
  const [ultimaRecebida, setUltimaRecebida] = useState<NotificacaoDTO | null>(null);
  const [toast, setToast] = useState<NotificacaoDTO | null>(null);

  useEffect(() => {
    if (!ativo || !getStoredUser()) return undefined;

    let cancelado = false;
    const socket = createConversaSocket();

    listarNotificacoes()
      .then((lista) => {
        if (cancelado) return;
        setNotificacoes(lista.notificacoes);
        setNaoLidas(lista.naoLidas);
      })
      .catch(() => undefined);

    socket.on('notificacao:nova', (nova) => {
      setNotificacoes((atual) => (atual ? [nova, ...atual] : [nova]));
      setNaoLidas((atual) => atual + 1);
      setUltimaRecebida(nova);
      setToast(nova);
    });

    return () => {
      cancelado = true;
      socket.disconnect();
    };
  }, [ativo]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  function marcarComoLida(id: string) {
    const alvo = notificacoes?.find((n) => n.id === id);
    if (!alvo || alvo.lida) return;

    setNotificacoes(
      (atual) => atual?.map((n) => (n.id === id ? { ...n, lida: true } : n)) ?? atual,
    );
    setNaoLidas((atual) => Math.max(0, atual - 1));
    marcarNotificacaoComoLida(id).catch(() => undefined);
  }

  function marcarTodasComoLidas() {
    setNotificacoes((atual) => atual?.map((n) => ({ ...n, lida: true })) ?? atual);
    setNaoLidas(0);
    marcarTodasNotificacoesComoLidas().catch(() => undefined);
  }

  return {
    notificacoes,
    naoLidas,
    ultimaRecebida,
    toast,
    marcarComoLida,
    marcarTodasComoLidas,
    fecharToast: () => setToast(null),
  };
}
