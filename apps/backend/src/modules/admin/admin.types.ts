export interface CriarCondominioInput {
  nome: string;
  linkSlug: string;
  pin: string;
}

export interface AtualizarCondominioInput {
  nome?: string;
  pin?: string;
  ativo?: boolean;
}

export interface ListarCondominiosFiltro {
  ativo?: boolean;
}

export interface CondominioDTO {
  id: string;
  nome: string;
  linkSlug: string;
  pin: string;
  ativo: boolean;
  createdAt: Date;
}

export interface CriarSindicoInput {
  nome: string;
  email: string;
  senha: string;
  condominioId: string;
}

export interface SindicoDTO {
  id: string;
  nome: string;
  email: string;
  condominioId: string | null;
}

export interface ResumoSaquesDTO {
  quantidade: number;
  valorTotal: number;
}

export interface ResumoFinanceiroDTO {
  saques: {
    pendente: ResumoSaquesDTO;
    aprovado: ResumoSaquesDTO;
    rejeitado: ResumoSaquesDTO;
  };
  condominiosAtivos: number;
}
