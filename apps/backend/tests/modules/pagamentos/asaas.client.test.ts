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

describe('AsaasClient.buscarCobranca', () => {
  it('consulta o status atual da cobrança por GET', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(mockFetchResponse(true, { id: 'pay_123', status: 'RECEIVED' }));

    const client = new AsaasClient();
    const result = await client.buscarCobranca('pay_123');

    expect(result).toEqual({ id: 'pay_123', status: 'RECEIVED' });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/payments/pay_123'),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('propaga erro do Asaas como AppError 502', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(mockFetchResponse(false, { errors: [{ description: 'não encontrada' }] }));

    const client = new AsaasClient();

    await expect(client.buscarCobranca('pay_inexistente')).rejects.toBeInstanceOf(AppError);
  });
});

describe('AsaasClient.cancelarCobranca', () => {
  it('não lança mesmo se o Asaas falhar (best-effort)', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('network down'));

    const client = new AsaasClient();

    await expect(client.cancelarCobranca('pay_123')).resolves.toBeUndefined();
  });
});

describe('AsaasClient — falhas de conexão', () => {
  const erroDeRede = (codigo: string) =>
    Object.assign(new TypeError('fetch failed'), { cause: { code: codigo } });

  // Os testes de cima deixam o fetch espionado: começa limpo pra contar só as chamadas daqui.
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('repete quando a conexão reaproveitada já estava fechada (ECONNRESET) e dá certo na segunda', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockRejectedValueOnce(erroDeRede('ECONNRESET'))
      .mockResolvedValueOnce(mockFetchResponse(true, { id: 'cus_ok' }));

    const client = new AsaasClient();
    const resultado = await client.criarCliente({
      nome: 'Ana',
      cpfCnpj: '52998224725',
      email: 'ana@example.com',
    });

    expect(resultado.id).toBe('cus_ok');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('uma rajada de falhas de DNS ainda se recupera na terceira tentativa', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockRejectedValueOnce(erroDeRede('ENOTFOUND'))
      .mockRejectedValueOnce(erroDeRede('UND_ERR_CONNECT_TIMEOUT'))
      .mockResolvedValueOnce(mockFetchResponse(true, { id: 'pay_1', status: 'PENDING' }));

    const resultado = await new AsaasClient().buscarCobranca('pay_1');

    expect(resultado.id).toBe('pay_1');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it.each(['EPIPE', 'UND_ERR_SOCKET', 'ECONNREFUSED', 'ENOTFOUND', 'UND_ERR_CONNECT_TIMEOUT'])(
    'também repete em %s (o pedido não chegou ao Asaas)',
    async (codigo) => {
      const fetchMock = jest
        .spyOn(global, 'fetch')
        .mockRejectedValueOnce(erroDeRede(codigo))
        .mockResolvedValueOnce(mockFetchResponse(true, { id: 'pay_1', status: 'PENDING' }));

      await new AsaasClient().buscarCobranca('pay_1');

      expect(fetchMock).toHaveBeenCalledTimes(2);
    },
  );

  it('tenta no máximo 3 vezes: se todas falharem, devolve 502 ASAAS_INDISPONIVEL', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockRejectedValue(erroDeRede('ECONNRESET'));

    await expect(new AsaasClient().buscarCobranca('pay_1')).rejects.toMatchObject({
      statusCode: 502,
      code: 'ASAAS_INDISPONIVEL',
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('não repete quando não dá pra garantir que o pedido não chegou (ex.: timeout de resposta)', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockRejectedValue(erroDeRede('ETIMEDOUT'));

    await expect(
      new AsaasClient().criarCobrancaPix({
        customerId: 'cus_1',
        valor: 5,
        vencimento: new Date(),
        externalReference: 'x',
        descricao: 'teste',
      }),
    ).rejects.toMatchObject({ code: 'ASAAS_INDISPONIVEL' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('erro sem causa conhecida também não repete', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('network down'));

    await expect(new AsaasClient().buscarCobranca('pay_1')).rejects.toMatchObject({
      code: 'ASAAS_INDISPONIVEL',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('um erro do Asaas (resposta com status de erro) nunca é repetido', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(mockFetchResponse(false, { errors: [{ description: 'valor mínimo' }] }));

    await expect(new AsaasClient().buscarCobranca('pay_1')).rejects.toMatchObject({
      code: 'ASAAS_ERROR',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
