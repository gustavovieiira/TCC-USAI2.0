import { StatusLocacao } from '@prisma/client';

export interface MoradorDTO {
  id: string;
  nome: string;
  email: string;
  apartamento: string | null;
  createdAt: Date;
}

export interface LocacaoAtivaDTO {
  id: string;
  status: StatusLocacao;
  dataInicio: Date;
  dataFim: Date;
  valorTotal: number;
  item: {
    id: string;
    titulo: string;
    ownerId: string;
  };
  locatario: {
    id: string;
    nome: string;
  };
}

export interface CondominioDTO {
  id: string;
  nome: string;
  linkSlug: string;
  pin: string;
  ativo: boolean;
}

export interface AtualizarPinInput {
  pin: string;
}
