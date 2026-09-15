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
  valor: number;
  chavePixUsada: string;
  status: StatusSaque;
  motivoRejeicao: string | null;
  createdAt: Date;
  processadoEm: Date | null;
}
