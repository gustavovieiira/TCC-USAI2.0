import { StatusLocacao } from '@prisma/client';

export interface CriarLocacaoInput {
  itemId: string;
  dataInicio: Date;
  dataFim: Date;
}

export interface LocacaoDTO {
  id: string;
  itemId: string;
  locatarioId: string;
  dataInicio: Date;
  dataFim: Date;
  valorTotal: number;
  status: StatusLocacao;
  createdAt: Date;
  item: {
    id: string;
    titulo: string;
    valorDiaria: number;
    ownerId: string;
  };
}
