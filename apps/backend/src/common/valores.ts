/**
 * Menor valor que o Asaas aceita numa cobrança (abaixo de R$ 5,00 ele recusa). A plataforma usa
 * este mesmo valor como diária mínima de um item: como toda locação tem pelo menos 1 dia, uma
 * diária de R$ 5,00 ou mais garante que o total sempre possa ser cobrado por PIX.
 */
export const VALOR_MINIMO_COBRANCA = 5;

/** Mensagem exibida quando um valor fica abaixo do mínimo. */
export const MENSAGEM_VALOR_MINIMO =
  'O valor mínimo da diária é R$ 5,00 (o menor valor que a cobrança por PIX aceita)';
