/**
 * Menor diária aceita ao publicar um item. É o mínimo que o Asaas aceita numa cobrança por PIX
 * (R$ 5,00); como toda locação tem pelo menos 1 dia, isso garante que o total sempre possa ser
 * cobrado. O backend aplica a mesma regra (`VALOR_MINIMO_COBRANCA`); manter os dois iguais.
 */
export const VALOR_MINIMO_DIARIA = 5;

export const MENSAGEM_VALOR_MINIMO =
  'O valor mínimo da diária é R$ 5,00 (o menor valor que a cobrança por PIX aceita).';
