import { logger } from '@/common/logger';
import type { AsaasClient } from './asaas.client';

/**
 * Taxa que o Asaas cobrou numa cobrança: valor da cobrança menos o líquido que ele informa (`value - netValue`).
 * Se a consulta falhar ou o Asaas não informar o líquido, devolve 0 e registra no log: confirmar um pagamento que já
 * caiu na conta não pode depender dessa consulta.
 */
export async function consultarTaxaAsaas(
  asaas: AsaasClient,
  asaasChargeId: string,
): Promise<number> {
  try {
    const cobranca = await asaas.buscarCobranca(asaasChargeId);
    if (typeof cobranca.value === 'number' && typeof cobranca.netValue === 'number') {
      return Math.max(0, Math.round((cobranca.value - cobranca.netValue) * 100) / 100);
    }
    logger.warn('O Asaas não informou o valor líquido da cobrança; taxa do Asaas gravada como 0', {
      asaasChargeId,
    });
  } catch (error) {
    logger.error('Não foi possível consultar a taxa do Asaas; taxa gravada como 0', {
      asaasChargeId,
      error,
    });
  }
  return 0;
}
