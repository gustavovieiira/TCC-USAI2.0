import { StatusLocacao } from '@prisma/client';

export interface CriarLocacaoInput {
  itemId: string;
  dataInicio: Date;
  dataFim: Date;
  /** Para que o locatário vai usar o item. */
  finalidade?: string;
}

export interface LocacaoDTO {
  id: string;
  itemId: string;
  locatarioId: string;
  dataInicio: Date;
  dataFim: Date;
  valorTotal: number;
  finalidade: string | null;
  status: StatusLocacao;
  createdAt: Date;
  item: {
    id: string;
    titulo: string;
    valorDiaria: number;
    ownerId: string;
    /** Acessórios que acompanham o item (conferidos na retirada e na devolução). */
    acessorios: string[];
  };
}
