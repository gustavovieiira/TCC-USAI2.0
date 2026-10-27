import {
  EstadoConservacao,
  StatusLocacao,
  StatusMovimentacao,
  TipoMovimentacao,
} from '@prisma/client';

export interface AcessorioMovimentacao {
  nome: string;
  /** Acompanha a entrega (marcado) ou não (faltando/não entregue). */
  conferido: boolean;
}

export interface RegistrarMovimentacaoInput {
  tipo: TipoMovimentacao;
  estadoConservacao: EstadoConservacao;
  acessorios: AcessorioMovimentacao[];
  observacoes?: string;
}

export interface AceitarMovimentacaoInput {
  /** Ids das declarações marcadas — têm que ser TODAS as do termo. */
  declaracoes: string[];
  /** Reconfirmação de identidade: a senha do usuário que está aceitando. */
  senha: string;
}

export interface ContextoAceite {
  ip?: string;
  userAgent?: string;
}

export interface ParteDTO {
  id: string;
  nome: string;
  apartamento: string | null;
  condominio: string | null;
  /** CPF só com os 2 últimos dígitos (documento circula por e-mail/impressão). */
  cpfMascarado: string | null;
}

/**
 * Foto dos dados no momento do registro: o documento continua igual mesmo que o item ou o perfil
 * das partes mudem depois.
 */
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
  /** MODELO = texto padrão ainda não aprovado pela revisão jurídica da empresa/condomínio. */
  statusRevisao: string;
  aprovadoEm: Date | null;
  createdAt: Date;
}

export interface EventoDTO {
  id: string;
  acao: string;
  detalhe: string | null;
  createdAt: Date;
  usuario: { id: string; nome: string };
}

export interface AceiteDTO {
  usuario: { id: string; nome: string };
  aceitoEm: Date;
  declaracoes: DeclaracaoTermo[];
  assinatura: string;
  /** Só na visão do Admin (auditoria). */
  ip?: string | null;
  userAgent?: string | null;
}

export interface MovimentacaoResumoDTO {
  id: string;
  numero: number;
  numeroDocumento: string;
  tipo: TipoMovimentacao;
  status: StatusMovimentacao;
  ocorridoEm: Date;
  concluidaEm: Date | null;
  estadoConservacao: EstadoConservacao;
  entreguePor: { id: string; nome: string };
  recebidoPor: { id: string; nome: string };
  /** Pra listas do Admin: a qual item/locação o documento se refere. */
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
  integridade: {
    hash: string | null;
    /** Nulo enquanto não concluída; verdadeiro/falso conforme o recálculo bate com o gravado. */
    verificada: boolean | null;
  };
  /** O que quem está consultando pode fazer agora. */
  permissoes: { aceitar: boolean; cancelar: boolean; retificar: boolean };
}

export interface CriarTermoInput {
  tipo: TipoMovimentacao;
  titulo: string;
  clausulas: string[];
  declaracoes: DeclaracaoTermo[];
}
