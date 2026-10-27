import { ExtratoDTO, OrigemDTO } from '@/features/saques/saques.types';
export interface CondominioAdminDTO {
  id: string;
  nome: string;
  linkSlug: string;
  pin: string;
  ativo: boolean;
  createdAt: string;
}

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
    /** Aprovados cujo PIX ainda não foi transferido. */
    aprovado: ResumoSaquesDTO;
    pago: ResumoSaquesDTO;
    rejeitado: ResumoSaquesDTO;
  };
  /** Pra onde foi a taxa dos aluguéis: síndicos (comissão) ou plataforma (sem síndico / histórico). */
  taxas: {
    repassadoAosSindicos: number;
    retidoPelaPlataforma: number;
  };
  condominiosAtivos: number;
}

export interface UsuarioAdminDTO {
  id: string;
  nome: string;
  email: string;
  papel: string;
  condominio: string | null;
  ativo: boolean;
}

export interface MovimentoPlataformaDTO {
  id: string;
  data: string;
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

export interface ExtratoDeUsuarioDTO {
  usuario: UsuarioAdminDTO;
  extrato: ExtratoDTO;
}
