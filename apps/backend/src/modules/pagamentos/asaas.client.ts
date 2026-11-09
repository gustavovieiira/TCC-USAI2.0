import { AppError } from '@/common/errors';
import { logger } from '@/common/logger';

/**
 * Erros de rede em que o pedido NÃO chegou ao Asaas, então repetir é seguro: conexão reaproveitada
 * que o servidor já tinha fechado (ECONNRESET/EPIPE/UND_ERR_SOCKET/UND_ERR_CLOSED, acontece na
 * primeira chamada depois de um tempo parado), conexão recusada, DNS e timeout ao conectar.
 */
const ERROS_SEGUROS_PARA_REPETIR = new Set([
  'ECONNRESET',
  'EPIPE',
  'UND_ERR_SOCKET',
  'UND_ERR_CLOSED',
  'ECONNREFUSED',
  'ENOTFOUND',
  'EAI_AGAIN',
  'UND_ERR_CONNECT_TIMEOUT',
]);
/** Até 3 tentativas, com pausa crescente: DNS e conexão costumam falhar em rajadas curtas. */
const MAX_TENTATIVAS = 3;
const PAUSA_BASE_MS = 250;

/** O `fetch` do Node embrulha o erro de rede real em `error.cause` (ex.: `{ code: 'ECONNRESET' }`). */
function codigoDoErroDeRede(error: unknown): string | undefined {
  const causa = (error as { cause?: { code?: unknown } } | null)?.cause;
  return typeof causa?.code === 'string' ? causa.code : undefined;
}

/** Status do Asaas que significam "dinheiro recebido": RECEIVED é o do PIX, CONFIRMED o de cartão/boleto. */
export const STATUS_ASAAS_PAGO = ['RECEIVED', 'CONFIRMED'];

export interface AsaasCliente {
  id: string;
}

export interface AsaasCobranca {
  id: string;
  invoiceUrl: string;
  status: string;
}

export interface AsaasStatusCobranca {
  id: string;
  status: string;
  /** Valor da cobrança. */
  value?: number;
  /** Valor líquido depois das taxas do Asaas (o que cai de fato na conta). A diferença para `value` é a taxa. */
  netValue?: number;
}

interface AsaasErroBody {
  errors?: { description?: string }[];
}

/**
 * Wrapper fino sobre a API REST do Asaas (sandbox por padrão, ver ASAAS_BASE_URL). Só PIX é
 * suportado nesta versão (M3). As credenciais só são lidas no momento da chamada, não no
 * construtor, assim um `ASAAS_API_KEY` ausente não quebra nada que só instancie o client (ex.:
 * os testes de outros módulos que sobem o app inteiro).
 */
export class AsaasClient {
  private baseUrl(): string {
    return process.env.ASAAS_BASE_URL ?? 'https://api-sandbox.asaas.com/v3';
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      // Autenticação do Asaas usa o header `access_token` (não é Bearer/Authorization).
      access_token: process.env.ASAAS_API_KEY ?? '',
    };
  }

  /** Faz a chamada; numa falha de rede em que o pedido não chegou ao Asaas, tenta de novo (até 3 vezes). */
  private async enviar(path: string, init: RequestInit): Promise<Response> {
    for (let tentativa = 1; ; tentativa += 1) {
      try {
        return await fetch(`${this.baseUrl()}${path}`, { ...init, headers: this.headers() });
      } catch (error) {
        const codigo = codigoDoErroDeRede(error);
        logger.warn('Falha de conexão com o Asaas', { path, tentativa, codigo });

        const repetir =
          tentativa < MAX_TENTATIVAS &&
          codigo !== undefined &&
          ERROS_SEGUROS_PARA_REPETIR.has(codigo);
        if (!repetir) {
          throw new AppError('Não foi possível conectar ao Asaas', 502, 'ASAAS_INDISPONIVEL');
        }
        await new Promise((resolver) => setTimeout(resolver, PAUSA_BASE_MS * tentativa));
      }
    }
  }

  private async requisitar<T>(path: string, init: RequestInit): Promise<T> {
    const response = await this.enviar(path, init);

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
      body: JSON.stringify({
        name: input.nome,
        cpfCnpj: input.cpfCnpj,
        email: input.email,
        // Os e-mails do Asaas ("Seu pagamento foi confirmado - Fatura ...") levam o nome e o CPF/CNPJ do
        // titular da conta como se ele fosse o vendedor, e duplicam o que a USAI já envia (com o recibo
        // e o acesso). A USAI avisa o cliente por conta própria, então desligamos os do Asaas.
        notificationDisabled: true,
      }),
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

  /** Consulta o status atual da cobrança, base da conferência periódica (rede de segurança do webhook). */
  async buscarCobranca(chargeId: string): Promise<AsaasStatusCobranca> {
    return this.requisitar<AsaasStatusCobranca>(`/payments/${encodeURIComponent(chargeId)}`, {
      method: 'GET',
    });
  }

  /** Best-effort, usado quando uma locação concorrente já foi paga; nunca deve derrubar o chamador. */
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
