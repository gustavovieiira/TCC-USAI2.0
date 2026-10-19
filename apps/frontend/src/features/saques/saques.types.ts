export type StatusSaque = 'PENDENTE' | 'APROVADO' | 'REJEITADO';

export interface SaqueDTO {
  id: string;
  userId: string;
  /** Nome de quem solicitou — só vem preenchido na listagem do Admin USAI. */
  solicitanteNome?: string;
  valor: number;
  chavePixUsada: string;
  status: StatusSaque;
  motivoRejeicao: string | null;
  createdAt: string;
  processadoEm: string | null;
}

export interface SolicitarSaqueInput {
  valor: number;
  chavePixUsada: string;
}

export interface ContraparteDTO {
  id: string;
  nome: string;
}

/** Uma linha do extrato do saldo: dinheiro que entrou (aluguel recebido) ou saiu (saque). */
export interface MovimentoExtratoDTO {
  id: string;
  tipo: 'RECEBIMENTO' | 'SAQUE';
  data: string;
  descricao: string;
  /** Quem pagou (no recebimento). Nulo no saque. */
  contraparte: ContraparteDTO | null;
  /** Com sinal: positivo entrou no saldo, negativo saiu. */
  valor: number;
  valorBruto?: number;
  taxa?: number;
  status: 'CONFIRMADO' | 'EM_ANALISE' | 'PAGO' | 'REJEITADO';
  motivo?: string | null;
  /** Chave PIX mascarada (só os 4 últimos caracteres). */
  chavePix?: string;
  processadoEm?: string | null;
}

/** Aluguel que o usuário PAGOU como locatário — não mexe no saldo. */
export interface PagamentoExtratoDTO {
  id: string;
  data: string;
  descricao: string;
  /** Dono do item, quem recebeu. */
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
