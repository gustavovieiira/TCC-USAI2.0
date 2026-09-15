export type StatusLocacao =
  'PENDENTE' | 'APROVADA' | 'PAGA' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA';

export interface LocacaoDTO {
  id: string;
  itemId: string;
  locatarioId: string;
  dataInicio: string;
  dataFim: string;
  valorTotal: number;
  status: StatusLocacao;
  createdAt: string;
  item: {
    id: string;
    titulo: string;
    valorDiaria: number;
    ownerId: string;
  };
}

export interface CriarLocacaoInput {
  itemId: string;
  dataInicio: string;
  dataFim: string;
}
