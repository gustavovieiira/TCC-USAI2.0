import { AppError } from '@/common/errors';

export interface AsaasCliente {
  id: string;
}

export interface AsaasCobranca {
  id: string;
  invoiceUrl: string;
  status: string;
}

interface AsaasErroBody {
  errors?: { description?: string }[];
}

/**
 * Wrapper fino sobre a API REST do Asaas (sandbox por padrão, ver ASAAS_BASE_URL). Só PIX é
 * suportado nesta versão (M3). As credenciais só são lidas no momento da chamada, não no
 * construtor — assim um `ASAAS_API_KEY` ausente não quebra nada que só instancie o client (ex.:
 * os testes de outros módulos que sobem o app inteiro).
 */
export class AsaasClient {
  private baseUrl(): string {
    return process.env.ASAAS_BASE_URL ?? 'https://sandbox.asaas.com/api/v3';
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      // Autenticação do Asaas usa o header `access_token` (não é Bearer/Authorization).
      access_token: process.env.ASAAS_API_KEY ?? '',
    };
  }

  private async requisitar<T>(path: string, init: RequestInit): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl()}${path}`, { ...init, headers: this.headers() });
    } catch {
      throw new AppError('Não foi possível conectar ao Asaas', 502, 'ASAAS_INDISPONIVEL');
    }

    if (!response.ok) {
      const corpo = (await response.json().catch(() => null)) as AsaasErroBody | null;
      const descricao = corpo?.errors?.[0]?.description ?? 'Erro ao comunicar com o Asaas';
      throw new AppError(descricao, 502, 'ASAAS_ERROR');
    }

    return (await response.json()) as T;
  }

  async criarCliente(input: {
    nome: string;
    cpfCnpj: string;
    email: string;
  }): Promise<AsaasCliente> {
    return this.requisitar<AsaasCliente>('/customers', {
      method: 'POST',
      body: JSON.stringify({ name: input.nome, cpfCnpj: input.cpfCnpj, email: input.email }),
    });
  }

  async criarCobrancaPix(input: {
    customerId: string;
    valor: number;
    vencimento: Date;
    externalReference: string;
    descricao: string;
  }): Promise<AsaasCobranca> {
    return this.requisitar<AsaasCobranca>('/payments', {
      method: 'POST',
      body: JSON.stringify({
        customer: input.customerId,
        billingType: 'PIX',
        value: input.valor,
        dueDate: input.vencimento.toISOString().slice(0, 10),
        description: input.descricao,
        externalReference: input.externalReference,
      }),
    });
  }

  /** Best-effort — usado quando uma locação concorrente já foi paga; nunca deve derrubar o chamador. */
  async cancelarCobranca(chargeId: string): Promise<void> {
    try {
      await fetch(`${this.baseUrl()}/payments/${chargeId}`, {
        method: 'DELETE',
        headers: this.headers(),
      });
    } catch {
      // best-effort: se o Asaas não responder, o admin ainda resolve manualmente pelo dashboard.
    }
  }
}
