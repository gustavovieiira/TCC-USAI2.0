import { StatusLocacao } from '@/features/locacoes/locacoes.types';

export interface MoradorDTO {
  id: string;
  nome: string;
  email: string;
  apartamento: string | null;
  createdAt: string;
}

export interface CondominioDTO {
  id: string;
  nome: string;
  linkSlug: string;
  pin: string;
  ativo: boolean;
}

export interface LocacaoAtivaDTO {
  id: string;
  status: StatusLocacao;
  dataInicio: string;
  dataFim: string;
  valorTotal: number;
  item: { id: string; titulo: string; ownerId: string };
  locatario: { id: string; nome: string };
}
