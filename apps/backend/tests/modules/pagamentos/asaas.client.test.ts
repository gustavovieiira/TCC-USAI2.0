import { AsaasClient } from '@/modules/pagamentos/asaas.client';
import { AppError } from '@/common/errors';

function mockFetchResponse(ok: boolean, body: unknown) {
  return {
    ok,
    json: async () => body,
  } as Response;
}

describe('AsaasClient.criarCliente', () => {
  it('cria um cliente no Asaas e retorna o id', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(mockFetchResponse(true, { id: 'cus_123', cpfCnpj: '12345678901' }));

    const client = new AsaasClient();
    const result = await client.criarCliente({
      nome: 'Ana Proprietaria',
      cpfCnpj: '12345678901',
      email: 'ana@example.com',
    });

    expect(result.id).toBe('cus_123');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/customers'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ access_token: expect.any(String) }),
      }),
    );
  });

  it('propaga erro do Asaas como AppError 502', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        mockFetchResponse(false, { errors: [{ description: 'cpfCnpj inválido' }] }),
      );

    const client = new AsaasClient();

    await expect(
      client.criarCliente({ nome: 'Ana', cpfCnpj: 'invalido', email: 'ana@example.com' }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it('propaga falha de rede como AppError 502', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('network down'));

    const client = new AsaasClient();

    await expect(
      client.criarCliente({ nome: 'Ana', cpfCnpj: '12345678901', email: 'ana@example.com' }),
    ).rejects.toBeInstanceOf(AppError);
  });
});

describe('AsaasClient.criarCobrancaPix', () => {
  it('cria a cobrança PIX e retorna id + invoiceUrl', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      mockFetchResponse(true, {
        id: 'pay_123',
        invoiceUrl: 'https://sandbox.asaas.com/i/pay_123',
        status: 'PENDING',
      }),
    );

    const client = new AsaasClient();
    const result = await client.criarCobrancaPix({
      customerId: 'cus_123',
      valor: 150,
      vencimento: new Date('2026-10-01'),
      externalReference: 'locacao-1',
      descricao: 'Locação: Furadeira Bosch',
    });

    expect(result).toEqual({
      id: 'pay_123',
      invoiceUrl: 'https://sandbox.asaas.com/i/pay_123',
      status: 'PENDING',
    });
  });
});

describe('AsaasClient.cancelarCobranca', () => {
  it('não lança mesmo se o Asaas falhar (best-effort)', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('network down'));

    const client = new AsaasClient();

    await expect(client.cancelarCobranca('pay_123')).resolves.toBeUndefined();
  });
});
