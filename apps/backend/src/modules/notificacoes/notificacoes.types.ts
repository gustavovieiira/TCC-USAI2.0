export type TipoNotificacao =
  | 'LOCACAO_SOLICITADA'
  | 'LOCACAO_APROVADA'
  | 'LOCACAO_REJEITADA'
  | 'LOCACAO_CANCELADA'
  | 'PAGAMENTO_CONFIRMADO'
  | 'PAGAMENTO_RECEBIDO'
  | 'PAGAMENTO_REEMBOLSO'
  | 'COMISSAO_RECEBIDA'
  | 'MOVIMENTACAO_PENDENTE'
  | 'MOVIMENTACAO_CONCLUIDA'
  | 'MOVIMENTACAO_CANCELADA'
  | 'MOVIMENTACAO_RETIFICADA'
  | 'SAQUE_SOLICITADO'
  | 'SAQUE_APROVADO'
  | 'SAQUE_PAGO'
  | 'SAQUE_REJEITADO'
  | 'MURAL_RESPOSTA';

export interface NovaNotificacao {
  userId: string;
  tipo: TipoNotificacao;
  titulo: string;
  mensagem: string;
  /** Rota do front que a notificação abre ao ser clicada. */
  link?: string;
}

export interface NotificacaoDTO {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  link: string | null;
  lida: boolean;
  createdAt: Date;
}

export interface ListaNotificacoesDTO {
  notificacoes: NotificacaoDTO[];
  naoLidas: number;
}
