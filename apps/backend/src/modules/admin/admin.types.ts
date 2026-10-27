import type { OrigemDTO } from '@/modules/saques/saques.types';
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

export interface UsuarioAdminDTO {
  id: string;
  nome: string;
  email: string;
  papel: string;
  condominio: string | null;
  ativo: boolean;
}

/** Uma entrada na conta da plataforma (a USAI): de onde veio, base de cálculo e taxa. */
export interface MovimentoPlataformaDTO {
  id: string;
  data: Date;
  descricao: string;
  valor: number;
  baseCalculo: number | null;
  taxaPercentual: number | null;
  origem: OrigemDTO | null;
}

export interface ExtratoPlataformaDTO {
  totalRetido: number;
  movimentos: MovimentoPlataformaDTO[];
}

export interface ResumoFinanceiroDTO {
  saques: {
    pendente: ResumoSaquesDTO;
    /** Aprovados cujo PIX ainda não foi transferido. */
    aprovado: ResumoSaquesDTO;
    pago: ResumoSaquesDTO;
    rejeitado: ResumoSaquesDTO;
  };
  /** Pra onde foi a taxa dos alugueis: síndicos (comissão) ou plataforma (sem síndico / histórico). */
  taxas: {
    repassadoAosSindicos: number;
    retidoPelaPlataforma: number;
  };
  condominiosAtivos: number;
}
