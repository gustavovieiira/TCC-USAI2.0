import { StatusSaque } from '@prisma/client';

export interface SolicitarSaqueInput {
  valor: number;
  chavePixUsada: string;
}

export interface RejeitarSaqueInput {
  motivoRejeicao: string;
}

export interface ListarSaquesFiltro {
  status?: StatusSaque;
}

export interface SaqueDTO {
  id: string;
  userId: string;
  /** Nome de quem solicitou — só vem preenchido na listagem do Admin USAI (`listarTodas`). */
  solicitanteNome?: string;
  /** Condomínio de quem solicitou — idem, só na visão do Admin USAI. */
  solicitanteCondominio?: string | null;
  valor: number;
  chavePixUsada: string;
  status: StatusSaque;
  motivoRejeicao: string | null;
  createdAt: Date;
  processadoEm: Date | null;
  /** Quando o Admin confirmou a transferência do PIX (status PAGO). */
  pagoEm: Date | null;
}

export interface ContraparteDTO {
  id: string;
  nome: string;
}

/** De onde veio um lançamento: a locação, o item e as duas pontas (só id e nome). */
export interface OrigemDTO {
  locacaoId: string;
  itemTitulo: string;
  dono: ContraparteDTO;
  locatario: ContraparteDTO;
}

/** Uma linha do extrato do SALDO do usuário: dinheiro que entrou (aluguel recebido) ou saiu (saque). */
export interface MovimentoExtratoDTO {
  id: string;
  /** COMISSAO = fatia dos 10% do condomínio que cabe a um síndico. */
  tipo: 'RECEBIMENTO' | 'COMISSAO' | 'SAQUE';
  data: Date;
  descricao: string;
  /** Quem pagou (no recebimento). Nulo no saque. */
  contraparte: ContraparteDTO | null;
  /** Com sinal: positivo entra no saldo, negativo sai do saldo. */
  valor: number;
  /** Base de cálculo: o aluguel que o locatário pagou. */
  valorBruto?: number;
  /** Taxa total do condomínio sobre esse aluguel. */
  taxa?: number;
  taxaPercentual?: number;
  /** Em quantos síndicos a comissão foi dividida. */
  divididoEntre?: number;
  origem?: OrigemDTO;
  /** Período do aluguel (recebimento e comissão). */
  periodo?: { inicio: Date; fim: Date };
  /** APROVADO = Admin aprovou, o PIX ainda não foi transferido. */
  status: 'CONFIRMADO' | 'EM_ANALISE' | 'APROVADO' | 'PAGO' | 'REJEITADO';
  motivo?: string | null;
  /** Chave PIX mascarada — só os 4 últimos caracteres. */
  chavePix?: string;
  processadoEm?: Date | null;
  pagoEm?: Date | null;
}

/** Um aluguel que o usuário PAGOU como locatário — não mexe no saldo, é o que saiu do bolso dele. */
export interface PagamentoExtratoDTO {
  id: string;
  /** Locação paga (rastreio da origem). */
  locacaoId?: string;
  data: Date;
  descricao: string;
  /** O dono do item, quem recebeu. */
  contraparte: ContraparteDTO | null;
  valor: number;
  /** Do que foi pago: a taxa do condomínio e o que foi repassado ao dono. */
  taxa?: number;
  repasseDono?: number;
  taxaPercentual?: number;
  periodo: { inicio: Date; fim: Date };
  status: 'CONFIRMADO' | 'EM_REEMBOLSO';
}

export interface ExtratoDTO {
  resumo: {
    saldoDisponivel: number;
    totalRecebido: number;
    /** Comissões do condomínio recebidas (só síndico). */
    totalComissoes: number;
    /** Saques já transferidos (PAGO). */
    totalSacado: number;
    /** Saques aprovados cujo PIX ainda não foi transferido. */
    aPagar: number;
    emAnalise: number;
  };
  movimentos: MovimentoExtratoDTO[];
  pagamentos: PagamentoExtratoDTO[];
}
