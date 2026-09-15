export interface CriarItemInput {
  titulo: string;
  descricao: string;
  categoria: string;
  valorDiaria: number;
  imagens?: string[];
}

export interface AtualizarItemInput {
  titulo?: string;
  descricao?: string;
  categoria?: string;
  valorDiaria?: number;
  ativo?: boolean;
}

export interface ListarItensFiltro {
  categoria?: string;
}

export interface ItemDTO {
  id: string;
  titulo: string;
  descricao: string;
  categoria: string;
  valorDiaria: number;
  ativo: boolean;
  ownerId: string;
  condominioId: string;
  imagens: string[];
  createdAt: Date;
}
