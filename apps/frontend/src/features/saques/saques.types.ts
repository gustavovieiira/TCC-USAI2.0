export type StatusSaque = 'PENDENTE' | 'APROVADO' | 'REJEITADO';

export interface SaqueDTO {
  id: string;
  userId: string;
  valor: number;
  chavePixUsada: string;
  status: StatusSaque;
  motivoRejeicao: string | null;
  createdAt: string;
  processadoEm: string | null;
}

export interface SolicitarSaqueInput {
  valor: number;
  chavePixUsada: string;
}
