import { Papel } from '@prisma/client';

export interface ParticipanteDTO {
  id: string;
  nome: string;
  papel: Papel;
}

export interface ConversaDTO {
  id: string;
  outroParticipante: ParticipanteDTO;
  postOrigemId: string | null;
  createdAt: Date;
  expiraEm: Date;
  ultimaMensagem: { conteudo: string; createdAt: Date } | null;
}

export interface MensagemPrivadaDTO {
  id: string;
  conversaId: string;
  remetenteId: string;
  conteudo: string;
  createdAt: Date;
}

export interface AbrirConversaInput {
  usuarioId: string;
  postOrigemId?: string;
}

export interface EnviarMensagemPrivadaInput {
  conteudo: string;
}
