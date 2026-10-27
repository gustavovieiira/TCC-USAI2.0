import { StatusLocacao } from '@/features/locacoes/locacoes.types';

export type TipoMovimentacao = 'RETIRADA' | 'DEVOLUCAO';
export type StatusMovimentacao = 'AGUARDANDO_ACEITE' | 'CONCLUIDA' | 'CANCELADA';
export type EstadoConservacao = 'OTIMO' | 'BOM' | 'REGULAR' | 'COM_AVARIAS';

export interface AcessorioMovimentacao {
  nome: string;
  /** Acompanha a operação (marcado) ou não (faltando / não entregue). */
  conferido: boolean;
}

export interface RegistrarMovimentacaoInput {
  tipo: TipoMovimentacao;
  estadoConservacao: EstadoConservacao;
  acessorios: AcessorioMovimentacao[];
  observacoes?: string;
}

export interface AceitarMovimentacaoInput {
  declaracoes: string[];
  senha: string;
}

export interface ParteDTO {
  id: string;
  nome: string;
  apartamento: string | null;
  condominio: string | null;
  cpfMascarado: string | null;
}

export interface SnapshotMovimentacao {
  locacao: {
    id: string;
    dataInicio: string;
    dataFim: string;
    valorTotal: number;
    finalidade: string | null;
  };
  item: {
    id: string;
    titulo: string;
    descricao: string;
    categoria: string;
    fabricante: string | null;
    modelo: string | null;
    numeroSerie: string | null;
    acessorios: string[];
  };
  dono: ParteDTO;
  locatario: ParteDTO;
}

export interface DeclaracaoTermo {
  id: string;
  texto: string;
}

export interface TermoDTO {
  id: string;
  tipo: TipoMovimentacao;
  versao: number;
  titulo: string;
  clausulas: string[];
  declaracoes: DeclaracaoTermo[];
  /** MODELO = texto padrão ainda não aprovado pela revisão jurídica. */
  statusRevisao: string;
  aprovadoEm: string | null;
  createdAt: string;
}

export interface EventoDTO {
  id: string;
  acao: string;
  detalhe: string | null;
  createdAt: string;
  usuario: { id: string; nome: string };
}

export interface AceiteDTO {
  usuario: { id: string; nome: string };
  aceitoEm: string;
  declaracoes: DeclaracaoTermo[];
  assinatura: string;
  ip?: string | null;
  userAgent?: string | null;
}

export interface MovimentacaoResumoDTO {
  id: string;
  numero: number;
  numeroDocumento: string;
  tipo: TipoMovimentacao;
  status: StatusMovimentacao;
  ocorridoEm: string;
  concluidaEm: string | null;
  estadoConservacao: EstadoConservacao;
  entreguePor: { id: string; nome: string };
  recebidoPor: { id: string; nome: string };
  itemTitulo?: string;
  locacaoId?: string;
}

export interface MovimentacaoDetalheDTO extends MovimentacaoResumoDTO {
  locacaoId: string;
  statusLocacao: StatusLocacao;
  acessorios: AcessorioMovimentacao[];
  observacoes: string | null;
  snapshot: SnapshotMovimentacao;
  termo: TermoDTO;
  aceite: AceiteDTO | null;
  eventos: EventoDTO[];
  integridade: { hash: string | null; verificada: boolean | null };
  permissoes: { aceitar: boolean; cancelar: boolean; retificar: boolean };
}

export interface CriarTermoInput {
  tipo: TipoMovimentacao;
  titulo: string;
  clausulas: string[];
  declaracoes: DeclaracaoTermo[];
}
