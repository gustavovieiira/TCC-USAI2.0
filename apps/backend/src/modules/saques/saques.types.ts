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
  valor: number;
  chavePixUsada: string;
  status: StatusSaque;
  motivoRejeicao: string | null;
  createdAt: Date;
  processadoEm: Date | null;
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
  status: 'CONFIRMADO' | 'EM_ANALISE' | 'PAGO' | 'REJEITADO';
  motivo?: string | null;
  /** Chave PIX mascarada — só os 4 últimos caracteres. */
  chavePix?: string;
  processadoEm?: Date | null;
}

/** Um aluguel que o usuário PAGOU como locatário — não mexe no saldo, é o que saiu do bolso dele. */
export interface PagamentoExtratoDTO {
  id: string;
  data: Date;
  descricao: string;
  /** O dono do item, quem recebeu. */
  contraparte: ContraparteDTO | null;
  valor: number;
  status: 'CONFIRMADO' | 'EM_REEMBOLSO';
}

export interface ExtratoDTO {
  resumo: {
    saldoDisponivel: number;
    totalRecebido: number;
    totalSacado: number;
    emAnalise: number;
  };
  movimentos: MovimentoExtratoDTO[];
  pagamentos: PagamentoExtratoDTO[];
}
