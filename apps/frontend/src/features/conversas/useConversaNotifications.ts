import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createConversaSocket } from '@/lib/socket';
import { getStoredUser } from '@/lib/authStorage';
import {
  contarMensagensNaoLidas,
  EVENTO_CONVERSAS_LIDAS,
  listarMinhasConversas,
} from './conversas.api';

interface ToastState {
  conversaId: string;
  nome: string;
}

/**
 * Entra em todas as salas de conversa do usuário ao carregar o app (não só quando o chat está
 * aberto), pra poder avisar de mensagem nova em qualquer tela: bolinha no "Conversas" do menu +
 * toast com o nome de quem mandou. A bolinha vem da contagem gravada no servidor (sobrevive a
 * recarregar a página) e é reconferida a cada troca de tela. Ignorado pra Admin USAI, que não acessa Conversas.
 */
export function useConversaNotifications(ativo: boolean) {
  const location = useLocation();
  const navigate = useNavigate();
  const [hasUnread, setHasUnread] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const nomesPorConversa = useRef(new Map<string, string>());
  const pathnameRef = useRef(location.pathname);

  useEffect(() => {
    pathnameRef.current = location.pathname;
    if (!ativo) return undefined;

    let cancelado = false;
    const conferir = () =>
      contarMensagensNaoLidas()
        .then((total) => {
          if (!cancelado) setHasUnread(total > 0);
        })
        .catch(() => undefined);

    void conferir();
    // A tela da conversa avisa quando acabou de gravar que leu — reconfere a contagem.
    window.addEventListener(EVENTO_CONVERSAS_LIDAS, conferir);

    return () => {
      cancelado = true;
      window.removeEventListener(EVENTO_CONVERSAS_LIDAS, conferir);
    };
  }, [location.pathname, ativo]);

  useEffect(() => {
    const user = getStoredUser();
    if (!ativo || !user) return undefined;

    let cancelado = false;
    const socket = createConversaSocket();

    listarMinhasConversas()
      .then((conversas) => {
        if (cancelado) return;
        conversas.forEach((conversa) => {
          nomesPorConversa.current.set(conversa.id, conversa.outroParticipante.nome);
          socket.emit('conversa:entrar', conversa.id, () => undefined);
        });
      })
      .catch(() => undefined);

    socket.on('conversa:mensagem:nova', (mensagem) => {
      if (mensagem.remetenteId === user.id) return;

      const conversaAberta = pathnameRef.current === `/conversas/${mensagem.conversaId}`;
      if (conversaAberta) return;

      setHasUnread(true);
      setToast({
        conversaId: mensagem.conversaId,
        nome: nomesPorConversa.current.get(mensagem.conversaId) ?? 'Alguém',
      });
    });

    return () => {
      cancelado = true;
      socket.disconnect();
    };
  }, [ativo]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  function abrirToast() {
    if (!toast) return;
    navigate(`/conversas/${toast.conversaId}`);
    setToast(null);
  }

  return { hasUnread, toast, abrirToast, fecharToast: () => setToast(null) };
}
