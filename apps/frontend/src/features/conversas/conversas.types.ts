import { Papel } from '@/lib/authStorage';
import { StatusLocacao } from '@/features/locacoes/locacoes.types';

export interface ParticipanteDTO {
  id: string;
  nome: string;
  papel: Papel;
}

export interface ConversaDTO {
  id: string;
  outroParticipante: ParticipanteDTO;
  postOrigemId: string | null;
  /** Preenchido quando é o chat de uma locação (e não uma conversa aberta no Mural). */
  locacao: { id: string; itemTitulo: string; status: StatusLocacao } | null;
  createdAt: string;
  /** Nulo no chat de locação, que não expira. */
  expiraEm: string | null;
  ultimaMensagem: { conteudo: string; createdAt: string } | null;
  /** Mensagens do outro participante que eu ainda não li. */
  naoLidas: number;
}

export interface MensagemPrivadaDTO {
  id: string;
  conversaId: string;
  remetenteId: string;
  conteudo: string;
  createdAt: string;
}

export interface AbrirConversaInput {
  usuarioId: string;
  postOrigemId?: string;
}

export interface EnviarMensagemPrivadaInput {
  conteudo: string;
}

export interface EnviarMensagemPrivadaAck {
  ok: boolean;
  mensagem?: MensagemPrivadaDTO;
  erro?: string;
}
