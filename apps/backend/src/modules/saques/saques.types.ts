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

/** Uma linha do extrato do SALDO do usuário: dinheiro que entrou (aluguel recebido) ou saiu (saque). */
export interface MovimentoExtratoDTO {
  id: string;
  tipo: 'RECEBIMENTO' | 'SAQUE';
  data: Date;
  descricao: string;
  /** Quem pagou (no recebimento). Nulo no saque. */
  contraparte: ContraparteDTO | null;
  /** Com sinal: positivo entra no saldo, negativo sai do saldo. */
  valor: number;
  valorBruto?: number;
  taxa?: number;
  /** Período do aluguel (só no recebimento). */
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
  data: Date;
  descricao: string;
  /** O dono do item, quem recebeu. */
  contraparte: ContraparteDTO | null;
  valor: number;
  periodo: { inicio: Date; fim: Date };
  status: 'CONFIRMADO' | 'EM_REEMBOLSO';
}

export interface ExtratoDTO {
  resumo: {
    saldoDisponivel: number;
    totalRecebido: number;
    /** Saques já transferidos (PAGO). */
    totalSacado: number;
    /** Saques aprovados cujo PIX ainda não foi transferido. */
    aPagar: number;
    emAnalise: number;
  };
  movimentos: MovimentoExtratoDTO[];
  pagamentos: PagamentoExtratoDTO[];
}
