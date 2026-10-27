export type StatusLocacao =
  'PENDENTE' | 'APROVADA' | 'PAGA' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA';

export interface LocacaoDTO {
  id: string;
  itemId: string;
  locatarioId: string;
  dataInicio: string;
  dataFim: string;
  valorTotal: number;
  /** Para que o locatário vai usar o item (informado no pedido). */
  finalidade?: string | null;
  status: StatusLocacao;
  createdAt: string;
  item: {
    id: string;
    titulo: string;
    valorDiaria: number;
    ownerId: string;
    /** Acessórios que acompanham o item (conferidos na retirada e na devolução). */
    acessorios?: string[];
  };
}

export interface CriarLocacaoInput {
  itemId: string;
  dataInicio: string;
  dataFim: string;
  finalidade?: string;
}
