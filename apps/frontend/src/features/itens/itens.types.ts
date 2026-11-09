export type TipoAnuncio = 'ITEM' | 'SERVICO';
/** Item: por dia. Serviço: por hora ou por serviço (preço fechado). */
export type UnidadeCobranca = 'DIA' | 'HORA' | 'SERVICO';

export interface ItemDTO {
  /** Anúncios antigos não trazem o campo: são itens cobrados por dia. */
  tipo?: TipoAnuncio;
  unidadeCobranca?: UnidadeCobranca;
  /** Quem anuncia ou presta o serviço (nome e apartamento, como no Mural). */
  proprietario?: { nome: string; apartamento: string | null } | null;
  id: string;
  titulo: string;
  descricao: string;
  categoria: string;
  valorDiaria: number;
  /** Identificação do bem (opcionais, o que o dono souber informar). */
  fabricante?: string | null;
  modelo?: string | null;
  numeroSerie?: string | null;
  acessorios?: string[];
  ativo: boolean;
  ownerId: string;
  condominioId: string;
  imagens: string[];
  createdAt: string;
}

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
}

export interface ListarItensFiltro {
  categoria?: string;
  tipo?: TipoAnuncio;
}
