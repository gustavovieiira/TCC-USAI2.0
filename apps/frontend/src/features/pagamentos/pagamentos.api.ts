import { apiClient } from '@/lib/apiClient';

export interface CriarCobrancaResultado {
  invoiceUrl: string;
}

/** M3 — gera (ou recupera, se já existir) o link de pagamento PIX de uma locação aprovada. */
export async function criarCobranca(locacaoId: string): Promise<CriarCobrancaResultado> {
  const { data } = await apiClient.post<CriarCobrancaResultado>(`/locacoes/${locacaoId}/pagamento`);
  return data;
}
