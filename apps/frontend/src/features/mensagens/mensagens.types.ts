export interface MensagemDTO {
  id: string;
  locacaoId: string;
  remetenteId: string;
  conteudo: string;
  createdAt: string;
}

export interface EnviarMensagemAck {
  ok: boolean;
  mensagem?: MensagemDTO;
  erro?: string;
}
