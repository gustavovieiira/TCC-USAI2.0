import { useEffect, useRef } from 'react';
import { createConversaSocket, LocacaoAtualizadaEvento } from '@/lib/socket';

/**
 * M3 — avisa em tempo real quando uma locação muda de status por causa de um pagamento
 * confirmado no Asaas: quem pagou vê PAGA, quem perdeu a corrida (locação concorrente pro mesmo
 * item/período) vê CANCELADA. Sem polling nem botão de atualizar — o servidor empurra pela sala
 * pessoal do usuário (ver `realtime/emitter.ts` no backend), a mesma infra já usada pelas
 * notificações de conversa.
 */
export function useLocacaoAtualizada(onAtualizada: (evento: LocacaoAtualizadaEvento) => void) {
  const callbackRef = useRef(onAtualizada);
  callbackRef.current = onAtualizada;

  useEffect(() => {
    const socket = createConversaSocket();
    socket.on('locacao:atualizada', (evento) => callbackRef.current(evento));

    return () => {
      socket.disconnect();
    };
  }, []);
}
