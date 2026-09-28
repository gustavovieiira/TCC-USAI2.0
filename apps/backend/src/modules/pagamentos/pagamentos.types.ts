export interface CriarCobrancaResultado {
  invoiceUrl: string;
}

/** Payload do evento `locacao:atualizada` (socket) — patch mínimo pra tela reagir sem recarregar. */
export interface LocacaoAtualizadaEvento {
  locacaoId: string;
  status: 'PAGA' | 'CANCELADA';
}
