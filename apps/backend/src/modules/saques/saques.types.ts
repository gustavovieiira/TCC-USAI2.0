import { StatusSaque } from '@prisma/client';

export interface SolicitarSaqueInput {
  valor: number;
  chavePixUsada: string;
}

export interface RejeitarSaqueInput {
  motivoRejeicao: string;
}

export interface ListarSaquesFiltro {
  status?: StatusSaque;
}

export interface SaqueDTO {
  id: string;
  userId: string;
  /** Nome de quem solicitou — só vem preenchido na listagem do Admin USAI (`listarTodas`). */
  solicitanteNome?: string;
  valor: number;
  chavePixUsada: string;
  status: StatusSaque;
  motivoRejeicao: string | null;
  createdAt: Date;
  processadoEm: Date | null;
}
