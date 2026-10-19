export interface NotificacaoDTO {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  /** Rota do app que a notificação abre ao ser clicada. */
  link: string | null;
  lida: boolean;
  createdAt: string;
}

export interface ListaNotificacoesDTO {
  notificacoes: NotificacaoDTO[];
  naoLidas: number;
}
