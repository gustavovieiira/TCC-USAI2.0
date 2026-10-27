export interface CriarItemInput {
  titulo: string;
  descricao: string;
  categoria: string;
  valorDiaria: number;
  fabricante?: string;
  modelo?: string;
  numeroSerie?: string;
  acessorios?: string[];
  imagens?: string[];
}

export interface AtualizarItemInput {
  titulo?: string;
  descricao?: string;
  categoria?: string;
  valorDiaria?: number;
  fabricante?: string;
  modelo?: string;
  numeroSerie?: string;
  acessorios?: string[];
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
  /** Identificação do bem (opcionais, o que o dono souber informar). */
  fabricante: string | null;
  modelo: string | null;
  numeroSerie: string | null;
  acessorios: string[];
  ativo: boolean;
  ownerId: string;
  condominioId: string;
  imagens: string[];
  createdAt: Date;
}
