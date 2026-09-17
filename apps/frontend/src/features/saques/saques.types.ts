export type StatusSaque = 'PENDENTE' | 'APROVADO' | 'REJEITADO';

export interface SaqueDTO {
  id: string;
  userId: string;
  /** Nome de quem solicitou — só vem preenchido na listagem do Admin USAI. */
  solicitanteNome?: string;
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
