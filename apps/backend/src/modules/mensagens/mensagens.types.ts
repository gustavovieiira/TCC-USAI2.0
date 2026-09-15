export interface EnviarMensagemInput {
  conteudo: string;
}

export interface MensagemDTO {
  id: string;
  locacaoId: string;
  remetenteId: string;
  conteudo: string;
  createdAt: Date;
}
