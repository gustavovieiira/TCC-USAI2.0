import bcrypt from 'bcryptjs';
import { AssinaturasService } from '@/modules/assinaturas/assinaturas.service';
import { PLANOS, buscarPlano } from '@/modules/assinaturas/planos';

jest.mock('bcryptjs', () => ({
  __esModule: true,
  default: { hash: jest.fn().mockResolvedValue('hash-inutilizavel'), compare: jest.fn() },
}));

const UM_DIA = 86_400_000;

function buildPrismaMock() {
  const prisma: any = {
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    condominio: {
      create: jest.fn(),
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn(),
      delete: jest.fn(),
    },
    assinatura: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
      delete: jest.fn(),
    },
    cobrancaAssinatura: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn(),
    },
    tokenAcesso: {
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn(),
    },
  };
  prisma.$transaction = jest.fn((arg: any) =>
    Array.isArray(arg) ? Promise.all(arg) : arg(prisma),
  );
  return prisma;
}

function buildAsaasMock() {
  return {
    criarCliente: jest.fn().mockResolvedValue({ id: 'cus_1' }),
    criarCobrancaPix: jest
      .fn()
      .mockResolvedValue({ id: 'pay_1', invoiceUrl: 'https://asaas/pay_1', status: 'PENDING' }),
    buscarCobranca: jest.fn(),
  } as any;
}

const mailerVazio = () => ({ enviar: jest.fn().mockResolvedValue(undefined) });

const input = {
  planoCodigo: 'CONDOMINIO',
  nomeCondominio: 'Residencial Aurora',
  nomeSindico: 'Sílvia Souza',
  email: 'silvia@exemplo.com',
  cpfCnpj: '529.982.247-25',
};

function prepararCriacao(prisma: any) {
  prisma.condominio.create.mockImplementation(({ data }: any) =>
    Promise.resolve({ id: 'cond-1', ...data }),
  );
  prisma.user.create.mockImplementation(({ data }: any) =>
    Promise.resolve({ id: 'sindico-1', ...data }),
  );
  prisma.assinatura.create.mockImplementation(({ data }: any) =>
    Promise.resolve({ id: 'assin-1', ...data }),
  );
  prisma.cobrancaAssinatura.create.mockImplementation(({ data }: any) =>
    Promise.resolve({ id: 'cob-1', ...data }),
  );
}

describe('planos', () => {
  it('as faixas crescem junto com o preço e o código acha o plano', () => {
    const limites = PLANOS.map((p) => p.limiteMoradores);
    const valores = PLANOS.map((p) => p.valorMensal);
    expect([...limites].sort((a, b) => a - b)).toEqual(limites);
    expect([...valores].sort((a, b) => a - b)).toEqual(valores);
    expect(buscarPlano('CONDOMINIO')?.destaque).toBe(true);
    expect(buscarPlano('NAO_EXISTE')).toBeUndefined();
  });
});

describe('AssinaturasService.contratar', () => {
  it('cadastra o condomínio inativo, o síndico inativo e abre a 1ª cobrança PIX', async () => {
    const prisma = buildPrismaMock();
    prepararCriacao(prisma);
    const asaas = buildAsaasMock();
    const service = new AssinaturasService(prisma, asaas, mailerVazio());

    const resultado = await service.contratar(input);

    expect(prisma.condominio.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        nome: 'Residencial Aurora',
        ativo: false,
        linkSlug: expect.stringMatching(/^residencial-aurora-[0-9a-f]{4}$/),
        pin: expect.stringMatching(/^\d{6}$/),
      }),
    });
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        papel: 'SINDICO',
        ativo: false,
        cpf: '52998224725',
        senhaHash: 'hash-inutilizavel',
      }),
    });
    expect(prisma.assinatura.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        planoCodigo: 'CONDOMINIO',
        valorMensal: 99,
        limiteMoradores: 100,
        status: 'AGUARDANDO_PAGAMENTO',
      }),
    });
    expect(asaas.criarCliente).toHaveBeenCalledWith({
      nome: 'Sílvia Souza',
      cpfCnpj: '52998224725',
      email: 'silvia@exemplo.com',
    });
    expect(asaas.criarCobrancaPix).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: 'cus_1',
        valor: 99,
        externalReference: 'assinatura:assin-1',
      }),
    );
    expect(resultado).toMatchObject({
      assinaturaId: 'assin-1',
      status: 'AGUARDANDO_PAGAMENTO',
      invoiceUrl: 'https://asaas/pay_1',
      emailMascarado: 's***@exemplo.com',
      plano: { codigo: 'CONDOMINIO', valorMensal: 99, limiteMoradores: 100 },
    });
    expect(bcrypt.hash).toHaveBeenCalled();
  });

  it('recusa plano que não existe', async () => {
    const service = new AssinaturasService(buildPrismaMock(), buildAsaasMock(), mailerVazio());
    await expect(service.contratar({ ...input, planoCodigo: 'XYZ' })).rejects.toMatchObject({
      code: 'PLANO_INVALIDO',
    });
  });

  it('recusa e-mail que já tem conta ativa', async () => {
    const prisma = buildPrismaMock();
    prisma.user.findUnique.mockResolvedValue({ id: 'u', ativo: true, assinaturasContratadas: [] });
    const service = new AssinaturasService(prisma, buildAsaasMock(), mailerVazio());

    await expect(service.contratar(input)).rejects.toMatchObject({ statusCode: 409 });
    expect(prisma.condominio.create).not.toHaveBeenCalled();
  });

  it('recusa CPF/CNPJ que já está em uso', async () => {
    const prisma = buildPrismaMock();
    prisma.user.findFirst.mockResolvedValue({ id: 'outro' });
    const service = new AssinaturasService(prisma, buildAsaasMock(), mailerVazio());

    await expect(service.contratar(input)).rejects.toMatchObject({ statusCode: 409 });
  });

  it('devolve a mesma cobrança se o síndico volta a contratar antes de pagar', async () => {
    const prisma = buildPrismaMock();
    prisma.user.findUnique.mockResolvedValue({
      id: 'sindico-1',
      email: 'silvia@exemplo.com',
      ativo: false,
      assinaturasContratadas: [
        {
          id: 'assin-1',
          planoCodigo: 'ESSENCIAL',
          valorMensal: 49,
          limiteMoradores: 30,
          status: 'AGUARDANDO_PAGAMENTO',
          condominio: { nome: 'Residencial Aurora' },
          cobrancas: [{ invoiceUrl: 'https://asaas/pay_antiga' }],
        },
      ],
    });
    const asaas = buildAsaasMock();
    const service = new AssinaturasService(prisma, asaas, mailerVazio());

    const resultado = await service.contratar(input);

    expect(resultado.invoiceUrl).toBe('https://asaas/pay_antiga');
    expect(resultado.assinaturaId).toBe('assin-1');
    expect(asaas.criarCobrancaPix).not.toHaveBeenCalled();
    expect(prisma.condominio.create).not.toHaveBeenCalled();
  });

  it('desfaz o cadastro quando o Asaas falha, sem deixar condomínio pendente órfão', async () => {
    const prisma = buildPrismaMock();
    prepararCriacao(prisma);
    const asaas = buildAsaasMock();
    asaas.criarCliente.mockRejectedValue(new Error('asaas fora do ar'));
    const service = new AssinaturasService(prisma, asaas, mailerVazio());

    await expect(service.contratar(input)).rejects.toThrow('asaas fora do ar');

    expect(prisma.assinatura.delete).toHaveBeenCalledWith({ where: { id: 'assin-1' } });
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'sindico-1' } });
    expect(prisma.condominio.delete).toHaveBeenCalledWith({ where: { id: 'cond-1' } });
  });
});

describe('AssinaturasService.confirmarCobranca', () => {
  function assinaturaPaga(overrides: Record<string, unknown> = {}) {
    return {
      id: 'assin-1',
      condominioId: 'cond-1',
      responsavelId: 'sindico-1',
      status: 'AGUARDANDO_PAGAMENTO',
      ativaAte: null,
      responsavel: { id: 'sindico-1', nome: 'Sílvia', email: 'silvia@exemplo.com' },
      condominio: { nome: 'Residencial Aurora' },
      ...overrides,
    };
  }

  it('devolve false quando a cobrança não é de uma assinatura (é uma locação)', async () => {
    const prisma = buildPrismaMock();
    prisma.cobrancaAssinatura.findUnique.mockResolvedValue(null);
    const service = new AssinaturasService(prisma, buildAsaasMock(), mailerVazio());

    expect(await service.confirmarCobranca('pay_locacao')).toBe(false);
  });

  it('no 1º pagamento ativa condomínio e síndico e envia o link de acesso por e-mail', async () => {
    const prisma = buildPrismaMock();
    prisma.cobrancaAssinatura.findUnique.mockResolvedValue({
      id: 'cob-1',
      assinaturaId: 'assin-1',
    });
    prisma.cobrancaAssinatura.updateMany.mockResolvedValue({ count: 1 });
    prisma.assinatura.findUniqueOrThrow.mockResolvedValue(assinaturaPaga());
    const mailer = mailerVazio();
    const service = new AssinaturasService(prisma, buildAsaasMock(), mailer);

    expect(await service.confirmarCobranca('pay_1')).toBe(true);

    expect(prisma.assinatura.update).toHaveBeenCalledWith({
      where: { id: 'assin-1' },
      data: { status: 'ATIVA', ativaAte: expect.any(Date) },
    });
    const { ativaAte } = prisma.assinatura.update.mock.calls[0][0].data;
    const dias = (ativaAte.getTime() - Date.now()) / UM_DIA;
    expect(dias).toBeGreaterThan(29.9);
    expect(dias).toBeLessThan(30.1);
    expect(prisma.condominio.update).toHaveBeenCalledWith({
      where: { id: 'cond-1' },
      data: { ativo: true },
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'sindico-1' },
      data: { ativo: true },
    });

    // Só o hash do token vai pro banco; o token em si só existe no link do e-mail.
    const salvo = prisma.tokenAcesso.create.mock.calls[0][0].data;
    expect(salvo.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    const email = mailer.enviar.mock.calls[0][0];
    expect(email.para).toBe('silvia@exemplo.com');
    expect(email.texto).toContain('/definir-senha?token=');
    expect(email.texto).not.toContain(salvo.tokenHash);
  });

  it('é idempotente: o mesmo evento chegando de novo não ativa nem manda e-mail de novo', async () => {
    const prisma = buildPrismaMock();
    prisma.cobrancaAssinatura.findUnique.mockResolvedValue({
      id: 'cob-1',
      assinaturaId: 'assin-1',
    });
    prisma.cobrancaAssinatura.updateMany.mockResolvedValue({ count: 0 });
    const mailer = mailerVazio();
    const service = new AssinaturasService(prisma, buildAsaasMock(), mailer);

    expect(await service.confirmarCobranca('pay_1')).toBe(true);

    expect(prisma.assinatura.update).not.toHaveBeenCalled();
    expect(mailer.enviar).not.toHaveBeenCalled();
  });

  it('numa renovação soma 30 dias ao vencimento atual, sem e-mail de acesso', async () => {
    const prisma = buildPrismaMock();
    const venceEm = new Date(Date.now() + 10 * UM_DIA);
    prisma.cobrancaAssinatura.findUnique.mockResolvedValue({
      id: 'cob-2',
      assinaturaId: 'assin-1',
    });
    prisma.cobrancaAssinatura.updateMany.mockResolvedValue({ count: 1 });
    prisma.assinatura.findUniqueOrThrow.mockResolvedValue(
      assinaturaPaga({ status: 'ATIVA', ativaAte: venceEm }),
    );
    const mailer = mailerVazio();
    const notificacoes = { notificar: jest.fn() } as any;
    const service = new AssinaturasService(prisma, buildAsaasMock(), mailer, notificacoes);

    await service.confirmarCobranca('pay_2');

    const { ativaAte } = prisma.assinatura.update.mock.calls[0][0].data;
    expect(Math.round((ativaAte.getTime() - venceEm.getTime()) / UM_DIA)).toBe(30);
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(mailer.enviar).not.toHaveBeenCalled();
    expect(notificacoes.notificar).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'sindico-1', tipo: 'ASSINATURA_RENOVADA' }),
    );
  });

  it('mantém o condomínio ativo mesmo se o e-mail falhar', async () => {
    const prisma = buildPrismaMock();
    prisma.cobrancaAssinatura.findUnique.mockResolvedValue({
      id: 'cob-1',
      assinaturaId: 'assin-1',
    });
    prisma.cobrancaAssinatura.updateMany.mockResolvedValue({ count: 1 });
    prisma.assinatura.findUniqueOrThrow.mockResolvedValue(assinaturaPaga());
    const mailer = { enviar: jest.fn().mockRejectedValue(new Error('smtp caiu')) };
    const service = new AssinaturasService(prisma, buildAsaasMock(), mailer);

    await expect(service.confirmarCobranca('pay_1')).resolves.toBe(true);
    expect(prisma.condominio.update).toHaveBeenCalled();
  });
});

describe('AssinaturasService.conferirPendentes', () => {
  it('confirma só as mensalidades que o Asaas já mostra como recebidas', async () => {
    const prisma = buildPrismaMock();
    prisma.cobrancaAssinatura.findMany.mockResolvedValue([
      { id: 'a', asaasChargeId: 'pay_a' },
      { id: 'b', asaasChargeId: 'pay_b' },
    ]);
    const asaas = buildAsaasMock();
    asaas.buscarCobranca.mockImplementation((id: string) =>
      Promise.resolve({ id, status: id === 'pay_a' ? 'RECEIVED' : 'PENDING' }),
    );
    const service = new AssinaturasService(prisma, asaas, mailerVazio());
    const confirmar = jest.spyOn(service, 'confirmarCobranca').mockResolvedValue(true);

    expect(await service.conferirPendentes()).toBe(1);
    expect(confirmar).toHaveBeenCalledTimes(1);
    expect(confirmar).toHaveBeenCalledWith('pay_a');
  });
});

describe('AssinaturasService.suspenderVencidas', () => {
  it('suspende a assinatura vencida além da carência e inativa o condomínio', async () => {
    const prisma = buildPrismaMock();
    prisma.assinatura.findMany.mockResolvedValue([
      { id: 'assin-1', condominioId: 'cond-1', responsavelId: 'sindico-1' },
    ]);
    const notificacoes = { notificar: jest.fn() } as any;
    const service = new AssinaturasService(prisma, buildAsaasMock(), mailerVazio(), notificacoes);

    expect(await service.suspenderVencidas()).toBe(1);

    const filtro = prisma.assinatura.findMany.mock.calls[0][0].where;
    expect(filtro.status).toBe('ATIVA');
    const diasDeFolga = (Date.now() - filtro.ativaAte.lt.getTime()) / UM_DIA;
    expect(Math.round(diasDeFolga)).toBe(5);
    expect(prisma.assinatura.update).toHaveBeenCalledWith({
      where: { id: 'assin-1' },
      data: { status: 'SUSPENSA' },
    });
    expect(prisma.condominio.update).toHaveBeenCalledWith({
      where: { id: 'cond-1' },
      data: { ativo: false },
    });
    expect(notificacoes.notificar).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'ASSINATURA_SUSPENSA' }),
    );
  });
});

describe('AssinaturasService.obterPainel e gerarCobrancaMensalidade', () => {
  it('devolve null para condomínio antigo, sem assinatura', async () => {
    const prisma = buildPrismaMock();
    prisma.assinatura.findUnique.mockResolvedValue(null);
    const service = new AssinaturasService(prisma, buildAsaasMock(), mailerVazio());

    expect(await service.obterPainel('cond-antigo')).toBeNull();
  });

  it('mostra o uso do plano e a cobrança em aberto', async () => {
    const prisma = buildPrismaMock();
    prisma.assinatura.findUnique.mockResolvedValue({
      planoCodigo: 'ESSENCIAL',
      valorMensal: 49,
      limiteMoradores: 30,
      status: 'ATIVA',
      ativaAte: new Date(Date.now() + 5 * UM_DIA - 60_000),
      cobrancas: [{ invoiceUrl: 'https://asaas/pay_2', valor: 49, referencia: '2026-12' }],
    });
    prisma.user.count.mockResolvedValue(12);
    const service = new AssinaturasService(prisma, buildAsaasMock(), mailerVazio());

    const painel = await service.obterPainel('cond-1');

    expect(painel).toMatchObject({
      planoNome: 'Essencial',
      limiteMoradores: 30,
      moradoresAtivos: 12,
      status: 'ATIVA',
      diasRestantes: 5,
      cobrancaPendente: { invoiceUrl: 'https://asaas/pay_2', valor: 49, referencia: '2026-12' },
    });
    expect(prisma.user.count).toHaveBeenCalledWith({
      where: { condominioId: 'cond-1', papel: 'MORADOR', ativo: true },
    });
  });

  it('reaproveita a cobrança já aberta em vez de gerar outra', async () => {
    const prisma = buildPrismaMock();
    prisma.assinatura.findUnique.mockResolvedValue({
      id: 'assin-1',
      status: 'ATIVA',
      responsavel: { id: 'sindico-1' },
      cobrancas: [{ invoiceUrl: 'https://asaas/ja_aberta' }],
    });
    const asaas = buildAsaasMock();
    const service = new AssinaturasService(prisma, asaas, mailerVazio());

    expect(await service.gerarCobrancaMensalidade('cond-1')).toEqual({
      invoiceUrl: 'https://asaas/ja_aberta',
    });
    expect(asaas.criarCobrancaPix).not.toHaveBeenCalled();
  });

  it('gera o PIX da próxima mensalidade quando não há nenhum em aberto', async () => {
    const prisma = buildPrismaMock();
    prisma.assinatura.findUnique.mockResolvedValue({
      id: 'assin-1',
      planoCodigo: 'ESSENCIAL',
      valorMensal: 49,
      status: 'ATIVA',
      ativaAte: new Date(Date.now() + 3 * UM_DIA),
      responsavel: {
        id: 'sindico-1',
        nome: 'Sílvia',
        email: 's@e.com',
        cpf: '52998224725',
        asaasCustomerId: 'cus_1',
      },
      cobrancas: [],
    });
    prisma.cobrancaAssinatura.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'c', ...data }),
    );
    const asaas = buildAsaasMock();
    const service = new AssinaturasService(prisma, asaas, mailerVazio());

    expect(await service.gerarCobrancaMensalidade('cond-1')).toEqual({
      invoiceUrl: 'https://asaas/pay_1',
    });
    expect(asaas.criarCliente).not.toHaveBeenCalled();
    expect(asaas.criarCobrancaPix).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: 'cus_1', valor: 49 }),
    );
  });
});

describe('AssinaturasService.reenviarAcesso', () => {
  const assinatura = {
    id: 'assin-1',
    responsavelId: 'sindico-1',
    status: 'ATIVA',
    responsavel: { id: 'sindico-1', nome: 'Sílvia', email: 'silvia@exemplo.com' },
    condominio: { nome: 'Residencial Aurora' },
  };

  it('não reenvia antes do pagamento', async () => {
    const prisma = buildPrismaMock();
    prisma.assinatura.findUnique.mockResolvedValue({
      ...assinatura,
      status: 'AGUARDANDO_PAGAMENTO',
    });
    const service = new AssinaturasService(prisma, buildAsaasMock(), mailerVazio());

    await expect(service.reenviarAcesso('assin-1')).rejects.toMatchObject({
      code: 'PAGAMENTO_PENDENTE',
    });
  });

  it('não reenvia se a senha já foi criada', async () => {
    const prisma = buildPrismaMock();
    prisma.assinatura.findUnique.mockResolvedValue(assinatura);
    prisma.tokenAcesso.findMany.mockResolvedValue([
      { usadoEm: new Date(), createdAt: new Date(0) },
    ]);
    const service = new AssinaturasService(prisma, buildAsaasMock(), mailerVazio());

    await expect(service.reenviarAcesso('assin-1')).rejects.toMatchObject({
      code: 'ACESSO_JA_CRIADO',
    });
  });

  it('segura pedidos em sequência (1 por minuto)', async () => {
    const prisma = buildPrismaMock();
    prisma.assinatura.findUnique.mockResolvedValue(assinatura);
    prisma.tokenAcesso.findMany.mockResolvedValue([{ usadoEm: null, createdAt: new Date() }]);
    const service = new AssinaturasService(prisma, buildAsaasMock(), mailerVazio());

    await expect(service.reenviarAcesso('assin-1')).rejects.toMatchObject({ statusCode: 429 });
  });

  it('manda um link novo e invalida os anteriores', async () => {
    const prisma = buildPrismaMock();
    prisma.assinatura.findUnique.mockResolvedValue(assinatura);
    prisma.tokenAcesso.findMany.mockResolvedValue([
      { usadoEm: null, createdAt: new Date(Date.now() - 5 * 60_000) },
    ]);
    const mailer = mailerVazio();
    const service = new AssinaturasService(prisma, buildAsaasMock(), mailer);

    await service.reenviarAcesso('assin-1');

    expect(prisma.tokenAcesso.updateMany).toHaveBeenCalledWith({
      where: { userId: 'sindico-1', usadoEm: null },
      data: { expiraEm: expect.any(Date) },
    });
    expect(mailer.enviar).toHaveBeenCalledTimes(1);
  });
});
