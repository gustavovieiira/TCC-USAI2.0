export type TipoAnuncio = 'ITEM' | 'SERVICO';
export type UnidadeCobranca = 'DIA' | 'HORA' | 'SERVICO';

export interface CriarItemInput {
  tipo?: TipoAnuncio;
  unidadeCobranca?: UnidadeCobranca;
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
  unidadeCobranca?: UnidadeCobranca;
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
  tipo?: TipoAnuncio;
}

export interface ItemDTO {
  id: string;
  titulo: string;
  descricao: string;
  categoria: string;
  /** Valor do anúncio: por dia (item), por hora ou por serviço, conforme `unidadeCobranca`. */
  valorDiaria: number;
  tipo: TipoAnuncio;
  unidadeCobranca: UnidadeCobranca;
  /** Quem anuncia (nome e apartamento são visíveis aos vizinhos, como no Mural). */
  proprietario: { nome: string; apartamento: string | null } | null;
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
