import { Papel } from '@/lib/authStorage';

export interface ParticipanteDTO {
  id: string;
  nome: string;
  papel: Papel;
}

export interface ConversaDTO {
  id: string;
  outroParticipante: ParticipanteDTO;
  postOrigemId: string | null;
  createdAt: string;
  expiraEm: string;
  ultimaMensagem: { conteudo: string; createdAt: string } | null;
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
