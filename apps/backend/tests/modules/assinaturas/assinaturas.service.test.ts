import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { TAMANHO_TOKEN_ACESSO } from '@/modules/auth/auth.service';
import {
  AssinaturasService,
  mascararDocumento,
  numeroDoRecibo,
} from '@/modules/assinaturas/assinaturas.service';
import { LOGO_CID } from '@/modules/assinaturas/assinaturas.emails';
import {
  PERIODOS,
  PLANOS,
  buscarPeriodo,
  buscarPlano,
  buscarPlanoDisponivel,
  planosDisponiveis,
  planoTesteAtivo,
  precoDoPeriodo,
  precosDoPlano,
} from '@/modules/assinaturas/planos';

jest.mock('bcryptjs', () => ({
  __esModule: true,
  default: { hash: jest.fn().mockResolvedValue('hash-inutilizavel'), compare: jest.fn() },
}));

const UM_DIA = 86_400_000;

// Os testes não podem depender do .env de quem roda: o plano de teste começa desligado.
const planoTesteOriginal = process.env.PLANO_TESTE_ATIVO;
beforeEach(() => {
  delete process.env.PLANO_TESTE_ATIVO;
});
afterAll(() => {
  if (planoTesteOriginal === undefined) delete process.env.PLANO_TESTE_ATIVO;
  else process.env.PLANO_TESTE_ATIVO = planoTesteOriginal;
});

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
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn(),
      update: jest.fn(),
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
    cancelarCobranca: jest.fn().mockResolvedValue(undefined),
  } as any;
}

const mailerVazio = () => ({ enviar: jest.fn().mockResolvedValue(undefined) });

const input = {
  planoCodigo: 'CONDOMINIO',
  periodoCodigo: 'MENSAL',
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

  it('quanto mais longo o período, maior o desconto e menor o valor por mês', () => {
    const descontos = PERIODOS.map((p) => p.desconto);
    expect([...descontos].sort((a, b) => a - b)).toEqual(descontos);
    expect(PERIODOS.map((p) => p.codigo)).toEqual(['MENSAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL']);
    expect(buscarPeriodo('MENSAL')).toMatchObject({ meses: 1, dias: 30, desconto: 0 });
    expect(buscarPeriodo('ANUAL')).toMatchObject({ meses: 12, dias: 365, desconto: 20 });
    expect(buscarPeriodo('QUINZENAL')).toBeUndefined();

    for (const plano of PLANOS) {
      const precos = precosDoPlano(plano);
      const porMes = precos.map((p) => p.valorMensalEquivalente);
      expect([...porMes].sort((a, b) => b - a)).toEqual(porMes);
      // o mensal é o mais caro por mês e não dá desconto
      expect(precos[0]).toMatchObject({ valorTotal: plano.valorMensal, economia: 0 });
    }
  });

  it('calcula o valor de cada período com o desconto, arredondado em reais', () => {
    const condominio = buscarPlano('CONDOMINIO')!;
    const preco = (codigo: string) => precoDoPeriodo(condominio, buscarPeriodo(codigo)!);

    expect(condominio.valorMensal).toBe(299);
    expect(preco('MENSAL')).toMatchObject({ valorTotal: 299, economia: 0 });
    // 299 x 3 = 897, menos 5% = 852,15
    expect(preco('TRIMESTRAL')).toMatchObject({ valorTotal: 852, economia: 45 });
    // 299 x 6 = 1794, menos 10% = 1614,60
    expect(preco('SEMESTRAL')).toMatchObject({ valorTotal: 1615, economia: 179 });
    // 299 x 12 = 3588, menos 20% = 2870,40
    expect(preco('ANUAL')).toMatchObject({
      valorTotal: 2870,
      valorMensalEquivalente: 239.17,
      economia: 718,
    });
  });
});

describe('plano de teste (R$ 5,00, o mínimo do Asaas)', () => {
  const original = process.env.PLANO_TESTE_ATIVO;

  afterEach(() => {
    if (original === undefined) delete process.env.PLANO_TESTE_ATIVO;
    else process.env.PLANO_TESTE_ATIVO = original;
  });

  it('fica fora da vitrine e da contratação por padrão', async () => {
    delete process.env.PLANO_TESTE_ATIVO;
    const service = new AssinaturasService(buildPrismaMock(), buildAsaasMock(), mailerVazio());

    expect(service.listarPlanos().planos.map((p) => p.codigo)).not.toContain('TESTE');
    expect(planosDisponiveis().every((p) => !p.teste)).toBe(true);
    expect(buscarPlanoDisponivel('TESTE')).toBeUndefined();

    const prisma = buildPrismaMock();
    const comTeste = new AssinaturasService(prisma, buildAsaasMock(), mailerVazio());
    await expect(comTeste.contratar({ ...input, planoCodigo: 'TESTE' })).rejects.toMatchObject({
      code: 'PLANO_INVALIDO',
    });
    expect(prisma.condominio.create).not.toHaveBeenCalled();
  });

  it('só liga com PLANO_TESTE_ATIVO=true (qualquer outro valor mantém desligado)', () => {
    process.env.PLANO_TESTE_ATIVO = '1';
    expect(planoTesteAtivo()).toBe(false);
    process.env.PLANO_TESTE_ATIVO = 'true';
    expect(planoTesteAtivo()).toBe(true);
  });

  it('ligado, aparece na lista com R$ 5,00 e limite de 3 contas, marcado como teste', () => {
    process.env.PLANO_TESTE_ATIVO = 'true';
    const service = new AssinaturasService(buildPrismaMock(), buildAsaasMock(), mailerVazio());

    const { planos } = service.listarPlanos();
    const teste = planos.find((p) => p.codigo === 'TESTE');

    expect(planos.map((p) => p.codigo)).toEqual([
      'ESSENCIAL',
      'CONDOMINIO',
      'GRANDE',
      'PREMIUM',
      'TESTE',
    ]);
    expect(teste).toMatchObject({ valorMensal: 5, limiteMoradores: 3, teste: true });
    expect(teste?.precos[0]).toMatchObject({ periodoCodigo: 'MENSAL', valorTotal: 5 });
    expect(planos.filter((p) => p.teste)).toHaveLength(1);
  });

  it('ligado, dá pra contratar e o PIX sai de R$ 5,00', async () => {
    process.env.PLANO_TESTE_ATIVO = 'true';
    const prisma = buildPrismaMock();
    prepararCriacao(prisma);
    const asaas = buildAsaasMock();
    const service = new AssinaturasService(prisma, asaas, mailerVazio());

    const resultado = await service.contratar({ ...input, planoCodigo: 'TESTE' });

    expect(prisma.assinatura.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        planoCodigo: 'TESTE',
        valorMensal: 5,
        limiteMoradores: 3,
        valorCiclo: 5,
      }),
    });
    expect(asaas.criarCobrancaPix).toHaveBeenCalledWith(expect.objectContaining({ valor: 5 }));
    expect(resultado).toMatchObject({ plano: { codigo: 'TESTE', nome: 'Teste' }, valorCiclo: 5 });
  });

  it('desligado depois, uma assinatura de teste que já existe continua mostrando o nome do plano', async () => {
    delete process.env.PLANO_TESTE_ATIVO;
    const prisma = buildPrismaMock();
    prisma.assinatura.findUnique.mockResolvedValue({
      planoCodigo: 'TESTE',
      valorMensal: 5,
      limiteMoradores: 3,
      periodoCodigo: 'MENSAL',
      valorCiclo: 5,
      status: 'ATIVA',
      ativaAte: new Date(Date.now() + 5 * UM_DIA),
      cobrancas: [],
    });
    const service = new AssinaturasService(prisma, buildAsaasMock(), mailerVazio());

    const painel = await service.obterPainel('cond-teste');

    expect(painel?.planoNome).toBe('Teste');
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
        valorMensal: 299,
        limiteMoradores: 60,
        periodoCodigo: 'MENSAL',
        valorCiclo: 299,
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
        valor: 299,
        externalReference: 'assinatura:assin-1',
      }),
    );
    expect(prisma.cobrancaAssinatura.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ valor: 299, periodoCodigo: 'MENSAL', dias: 30 }),
    });
    expect(resultado).toMatchObject({
      assinaturaId: 'assin-1',
      status: 'AGUARDANDO_PAGAMENTO',
      invoiceUrl: 'https://asaas/pay_1',
      emailMascarado: 's***@exemplo.com',
      plano: { codigo: 'CONDOMINIO', valorMensal: 299, limiteMoradores: 60 },
      periodo: { codigo: 'MENSAL', meses: 1, desconto: 0 },
      valorCiclo: 299,
    });
    expect(bcrypt.hash).toHaveBeenCalled();
  });

  it('cobra o período escolhido com desconto: o PIX e a cobrança levam o valor e os dias do período', async () => {
    const prisma = buildPrismaMock();
    prepararCriacao(prisma);
    const asaas = buildAsaasMock();
    const service = new AssinaturasService(prisma, asaas, mailerVazio());

    const resultado = await service.contratar({ ...input, periodoCodigo: 'ANUAL' });

    expect(prisma.assinatura.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ periodoCodigo: 'ANUAL', valorCiclo: 2870 }),
    });
    expect(asaas.criarCobrancaPix).toHaveBeenCalledWith(
      expect.objectContaining({ valor: 2870, descricao: expect.stringContaining('anual') }),
    );
    expect(prisma.cobrancaAssinatura.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ valor: 2870, periodoCodigo: 'ANUAL', dias: 365 }),
    });
    expect(resultado).toMatchObject({
      valorCiclo: 2870,
      periodo: { codigo: 'ANUAL', nome: 'Anual', meses: 12, desconto: 20 },
    });
  });

  it('recusa período que não existe', async () => {
    const prisma = buildPrismaMock();
    const service = new AssinaturasService(prisma, buildAsaasMock(), mailerVazio());

    await expect(service.contratar({ ...input, periodoCodigo: 'QUINZENAL' })).rejects.toMatchObject(
      {
        code: 'PERIODO_INVALIDO',
      },
    );
    expect(prisma.condominio.create).not.toHaveBeenCalled();
  });

  it.each([
    ['Residencial Aurora', /^residencial-aurora-[0-9a-f]{4}$/],
    ['  !!! Jardim das Flores !!!  ', /^jardim-das-flores-[0-9a-f]{4}$/],
    ['---Edifício São João---', /^edificio-sao-joao-[0-9a-f]{4}$/],
    ['Condomínio   Vila   Nova', /^condominio-vila-nova-[0-9a-f]{4}$/],
  ])('gera um link limpo (sem hífens soltos nas pontas) para "%s"', async (nome, padrao) => {
    const prisma = buildPrismaMock();
    prepararCriacao(prisma);
    const service = new AssinaturasService(prisma, buildAsaasMock(), mailerVazio());

    await service.contratar({ ...input, nomeCondominio: nome });

    expect(prisma.condominio.create.mock.calls[0][0].data.linkSlug).toMatch(padrao);
  });

  it('um nome só de símbolos ainda gera um link válido', async () => {
    const prisma = buildPrismaMock();
    prepararCriacao(prisma);
    const service = new AssinaturasService(prisma, buildAsaasMock(), mailerVazio());

    await service.contratar({ ...input, nomeCondominio: '!!!???' });

    expect(prisma.condominio.create.mock.calls[0][0].data.linkSlug).toMatch(
      /^condominio-[0-9a-f]{4}$/,
    );
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
          planoCodigo: 'CONDOMINIO',
          valorMensal: 299,
          limiteMoradores: 60,
          periodoCodigo: 'MENSAL',
          valorCiclo: 299,
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

  it('se volta antes de pagar escolhendo outro período, cancela o PIX antigo e abre um novo', async () => {
    const prisma = buildPrismaMock();
    const antiga = {
      id: 'cob-antiga',
      asaasChargeId: 'pay_antiga',
      invoiceUrl: 'https://asaas/pay_antiga',
      periodoCodigo: 'MENSAL',
    };
    const pendente = {
      id: 'assin-1',
      planoCodigo: 'CONDOMINIO',
      valorMensal: 299,
      limiteMoradores: 60,
      periodoCodigo: 'MENSAL',
      valorCiclo: 299,
      status: 'AGUARDANDO_PAGAMENTO',
      condominio: { nome: 'Residencial Aurora' },
      cobrancas: [antiga],
    };
    prisma.user.findUnique.mockResolvedValue({
      id: 'sindico-1',
      email: 'silvia@exemplo.com',
      nome: 'Sílvia Souza',
      cpf: '52998224725',
      asaasCustomerId: 'cus_1',
      ativo: false,
      assinaturasContratadas: [pendente],
    });
    prisma.assinatura.update.mockImplementation(({ data }: any) =>
      Promise.resolve({ ...pendente, ...data }),
    );
    prisma.cobrancaAssinatura.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'cob-nova', ...data }),
    );
    const asaas = buildAsaasMock();
    const service = new AssinaturasService(prisma, asaas, mailerVazio());

    const resultado = await service.contratar({
      ...input,
      planoCodigo: 'GRANDE',
      periodoCodigo: 'SEMESTRAL',
    });

    expect(prisma.assinatura.update).toHaveBeenCalledWith({
      where: { id: 'assin-1' },
      data: expect.objectContaining({
        planoCodigo: 'GRANDE',
        valorMensal: 499,
        limiteMoradores: 150,
        periodoCodigo: 'SEMESTRAL',
        valorCiclo: 2695,
      }),
    });
    expect(prisma.cobrancaAssinatura.updateMany).toHaveBeenCalledWith({
      where: { id: 'cob-antiga', status: 'PENDENTE' },
      data: { status: 'CANCELADO' },
    });
    expect(asaas.cancelarCobranca).toHaveBeenCalledWith('pay_antiga');
    expect(asaas.criarCobrancaPix).toHaveBeenCalledWith(expect.objectContaining({ valor: 2695 }));
    expect(prisma.condominio.create).not.toHaveBeenCalled();
    expect(resultado).toMatchObject({
      invoiceUrl: 'https://asaas/pay_1',
      plano: { codigo: 'GRANDE' },
      periodo: { codigo: 'SEMESTRAL' },
    });
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
      planoCodigo: 'CONDOMINIO',
      status: 'AGUARDANDO_PAGAMENTO',
      ativaAte: null,
      responsavel: {
        id: 'sindico-1',
        nome: 'Sílvia',
        email: 'silvia@exemplo.com',
        cpf: '52998224725',
      },
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
      periodoCodigo: 'MENSAL',
      dias: 30,
      valor: 299,
    });
    prisma.cobrancaAssinatura.updateMany.mockResolvedValue({ count: 1 });
    prisma.assinatura.findUniqueOrThrow.mockResolvedValue(assinaturaPaga());
    const mailer = mailerVazio();
    const service = new AssinaturasService(prisma, buildAsaasMock(), mailer);

    expect(await service.confirmarCobranca('pay_1')).toBe(true);

    expect(prisma.assinatura.update).toHaveBeenCalledWith({
      where: { id: 'assin-1' },
      data: {
        status: 'ATIVA',
        ativaAte: expect.any(Date),
        periodoCodigo: 'MENSAL',
        valorCiclo: 299,
      },
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

  it('grava na cobrança a taxa que o Asaas cobrou (valor − líquido) e até quando o pagamento deixou o condomínio ativo', async () => {
    const prisma = buildPrismaMock();
    prisma.cobrancaAssinatura.findUnique.mockResolvedValue({
      id: 'cob-1',
      assinaturaId: 'assin-1',
      periodoCodigo: 'MENSAL',
      dias: 30,
      valor: 299,
    });
    prisma.cobrancaAssinatura.updateMany.mockResolvedValue({ count: 1 });
    prisma.assinatura.findUniqueOrThrow.mockResolvedValue(assinaturaPaga());
    const asaas = buildAsaasMock();
    asaas.buscarCobranca.mockResolvedValue({
      id: 'pay_1',
      status: 'RECEIVED',
      value: 299,
      netValue: 297.01,
    });
    const service = new AssinaturasService(prisma, asaas, mailerVazio());

    await service.confirmarCobranca('pay_1');

    expect(prisma.cobrancaAssinatura.updateMany).toHaveBeenCalledWith({
      where: { id: 'cob-1', status: 'PENDENTE' },
      data: { status: 'PAGO', pagoEm: expect.any(Date), taxaAsaas: 1.99 },
    });
    const { ativaAte } = prisma.assinatura.update.mock.calls[0][0].data;
    expect(prisma.cobrancaAssinatura.update).toHaveBeenCalledWith({
      where: { id: 'cob-1' },
      data: { ativaAteApos: ativaAte },
    });
  });

  it('se o Asaas não informar a taxa, a mensalidade confirma do mesmo jeito (taxa 0)', async () => {
    const prisma = buildPrismaMock();
    prisma.cobrancaAssinatura.findUnique.mockResolvedValue({
      id: 'cob-1',
      assinaturaId: 'assin-1',
      periodoCodigo: 'MENSAL',
      dias: 30,
      valor: 299,
    });
    prisma.cobrancaAssinatura.updateMany.mockResolvedValue({ count: 1 });
    prisma.assinatura.findUniqueOrThrow.mockResolvedValue(assinaturaPaga());
    const asaas = buildAsaasMock();
    asaas.buscarCobranca.mockRejectedValue(new Error('Asaas fora do ar'));
    const service = new AssinaturasService(prisma, asaas, mailerVazio());

    expect(await service.confirmarCobranca('pay_1')).toBe(true);

    expect(prisma.cobrancaAssinatura.updateMany).toHaveBeenCalledWith({
      where: { id: 'cob-1', status: 'PENDENTE' },
      data: { status: 'PAGO', pagoEm: expect.any(Date), taxaAsaas: 0 },
    });
    expect(prisma.condominio.update).toHaveBeenCalledWith({
      where: { id: 'cond-1' },
      data: { ativo: true },
    });
  });

  it('o e-mail do 1º pagamento traz o recibo: número, forma, pagador (documento mascarado), valor e vigência', async () => {
    const prisma = buildPrismaMock();
    prisma.cobrancaAssinatura.findUnique.mockResolvedValue({
      id: 'abcd1234-ef56-7890-abcd-ef1234567890',
      assinaturaId: 'assin-1',
      periodoCodigo: 'ANUAL',
      dias: 365,
      valor: 2870,
      invoiceUrl: 'https://asaas/comprovante',
    });
    prisma.cobrancaAssinatura.updateMany.mockResolvedValue({ count: 1 });
    prisma.assinatura.findUniqueOrThrow.mockResolvedValue(assinaturaPaga());
    const mailer = mailerVazio();
    const service = new AssinaturasService(prisma, buildAsaasMock(), mailer);

    await service.confirmarCobranca('pay_anual');

    const email = mailer.enviar.mock.calls[0][0];
    expect(email.texto).toContain('RECIBO DE PAGAMENTO nº USAI-ABCD1234');
    expect(email.texto).toContain('Forma de pagamento: PIX');
    expect(email.texto).toContain('Pagador: Sílvia (***.982.247-**)');
    expect(email.texto).toMatch(/Valor pago: R\$\s2\.870,00/);
    expect(email.texto).toContain('Plano Condomínio · Anual');
    expect(email.texto).toContain('Comprovante do PIX: https://asaas/comprovante');
    // o CPF inteiro nunca vai pro e-mail
    expect(email.texto).not.toContain('52998224725');
    expect(email.html).not.toContain('52998224725');
    expect(email.html).toContain('Recibo de pagamento');
    expect(email.anexos?.[0]).toMatchObject({ cid: LOGO_CID, tipo: 'image/png' });
  });

  it('o recibo mostra quando o dinheiro foi recebido, e a vigência bate com os dias pagos', async () => {
    const prisma = buildPrismaMock();
    prisma.cobrancaAssinatura.findUnique.mockResolvedValue({
      id: 'cob-9',
      assinaturaId: 'assin-1',
      periodoCodigo: 'SEMESTRAL',
      dias: 180,
      valor: 1615,
    });
    prisma.cobrancaAssinatura.updateMany.mockResolvedValue({ count: 1 });
    prisma.assinatura.findUniqueOrThrow.mockResolvedValue(assinaturaPaga());
    const mailer = mailerVazio();
    const service = new AssinaturasService(prisma, buildAsaasMock(), mailer);

    await service.confirmarCobranca('pay_sem');

    const { pagoEm } = prisma.cobrancaAssinatura.updateMany.mock.calls[0][0].data;
    expect(pagoEm).toBeInstanceOf(Date);
    const { ativaAte } = prisma.assinatura.update.mock.calls[0][0].data;
    expect(Math.round((ativaAte.getTime() - pagoEm.getTime()) / UM_DIA)).toBe(180);
    expect(mailer.enviar.mock.calls[0][0].texto).toContain('Plano Condomínio · Semestral');
  });

  it('PIX só confirmado, sem o dinheiro na conta (recebido=false): não ativa nem manda e-mail', async () => {
    const prisma = buildPrismaMock();
    prisma.cobrancaAssinatura.findUnique.mockResolvedValue({
      id: 'cob-1',
      assinaturaId: 'assin-1',
      periodoCodigo: 'MENSAL',
      dias: 30,
      valor: 299,
    });
    const mailer = mailerVazio();
    const service = new AssinaturasService(prisma, buildAsaasMock(), mailer);

    // devolve true: a cobrança é de uma assinatura, só que ainda não vale como paga
    expect(await service.confirmarCobranca('pay_1', false)).toBe(true);

    expect(prisma.cobrancaAssinatura.updateMany).not.toHaveBeenCalled();
    expect(prisma.assinatura.update).not.toHaveBeenCalled();
    expect(prisma.condominio.update).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.tokenAcesso.create).not.toHaveBeenCalled();
    expect(mailer.enviar).not.toHaveBeenCalled();
  });

  it('o código do link no e-mail tem exatamente o tamanho que a criação da senha exige, e não precisa de escape', async () => {
    const prisma = buildPrismaMock();
    prisma.cobrancaAssinatura.findUnique.mockResolvedValue({
      id: 'cob-1',
      assinaturaId: 'assin-1',
      periodoCodigo: 'MENSAL',
      dias: 30,
      valor: 299,
    });
    prisma.cobrancaAssinatura.updateMany.mockResolvedValue({ count: 1 });
    prisma.assinatura.findUniqueOrThrow.mockResolvedValue(assinaturaPaga());
    const mailer = mailerVazio();
    const service = new AssinaturasService(prisma, buildAsaasMock(), mailer);

    await service.confirmarCobranca('pay_1');

    const { texto, html } = mailer.enviar.mock.calls[0][0];
    const [, codigo] = /definir-senha\?token=(\S+)/.exec(texto) ?? [];
    expect(codigo).toHaveLength(TAMANHO_TOKEN_ACESSO);
    // só letras, números, "-" e "_": nada que um cliente de e-mail possa quebrar ou reescrever
    expect(codigo).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(html).toContain(`definir-senha?token=${codigo}"`);
    // o que vai pro banco é o hash desse mesmo código
    const salvo = prisma.tokenAcesso.create.mock.calls[0][0].data.tokenHash;
    expect(salvo).toBe(crypto.createHash('sha256').update(codigo).digest('hex'));
  });

  it('é idempotente: o mesmo evento chegando de novo não ativa nem manda e-mail de novo', async () => {
    const prisma = buildPrismaMock();
    prisma.cobrancaAssinatura.findUnique.mockResolvedValue({
      id: 'cob-1',
      assinaturaId: 'assin-1',
      periodoCodigo: 'MENSAL',
      dias: 30,
      valor: 299,
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
      periodoCodigo: 'MENSAL',
      dias: 30,
      valor: 299,
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

  it('libera os dias do período pago: o anual vale 365 dias e vira o período da assinatura', async () => {
    const prisma = buildPrismaMock();
    prisma.cobrancaAssinatura.findUnique.mockResolvedValue({
      id: 'cob-3',
      assinaturaId: 'assin-1',
      periodoCodigo: 'ANUAL',
      dias: 365,
      valor: 2870,
    });
    prisma.cobrancaAssinatura.updateMany.mockResolvedValue({ count: 1 });
    prisma.assinatura.findUniqueOrThrow.mockResolvedValue(assinaturaPaga());
    const service = new AssinaturasService(prisma, buildAsaasMock(), mailerVazio());

    await service.confirmarCobranca('pay_anual');

    const dados = prisma.assinatura.update.mock.calls[0][0].data;
    expect(dados).toMatchObject({ periodoCodigo: 'ANUAL', valorCiclo: 2870 });
    expect((dados.ativaAte.getTime() - Date.now()) / UM_DIA).toBeGreaterThan(364.9);
    expect((dados.ativaAte.getTime() - Date.now()) / UM_DIA).toBeLessThan(365.1);
  });

  it('mantém o condomínio ativo mesmo se o e-mail falhar', async () => {
    const prisma = buildPrismaMock();
    prisma.cobrancaAssinatura.findUnique.mockResolvedValue({
      id: 'cob-1',
      assinaturaId: 'assin-1',
      periodoCodigo: 'MENSAL',
      dias: 30,
      valor: 299,
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

  it('CONFIRMED (autorizado, dinheiro ainda não na conta) não ativa: só RECEIVED conta', async () => {
    const prisma = buildPrismaMock();
    prisma.cobrancaAssinatura.findMany.mockResolvedValue([{ id: 'a', asaasChargeId: 'pay_a' }]);
    const asaas = buildAsaasMock();
    asaas.buscarCobranca.mockResolvedValue({ id: 'pay_a', status: 'CONFIRMED' });
    const service = new AssinaturasService(prisma, asaas, mailerVazio());
    const confirmar = jest.spyOn(service, 'confirmarCobranca').mockResolvedValue(true);

    expect(await service.conferirPendentes()).toBe(0);
    expect(confirmar).not.toHaveBeenCalled();
  });
});

describe('recibo: número e documento mascarado', () => {
  it('o número é a marca mais os 8 primeiros caracteres do id, em maiúsculas', () => {
    expect(numeroDoRecibo('3f9a12bc-1111-2222-3333-444455556666')).toBe('USAI-3F9A12BC');
    expect(numeroDoRecibo('cob-1')).toBe('USAI-COB1');
  });

  it('CPF e CNPJ mostram só o miolo; qualquer outra coisa não mostra nada', () => {
    expect(mascararDocumento('52998224725')).toBe('***.982.247-**');
    expect(mascararDocumento('529.982.247-25')).toBe('***.982.247-**');
    expect(mascararDocumento('11222333000181')).toBe('**.222.333/0001-**');
    expect(mascararDocumento('123')).toBeNull();
    expect(mascararDocumento(null)).toBeNull();
    expect(mascararDocumento(undefined)).toBeNull();
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

describe('AssinaturasService.obterPainel e gerarCobrancaRenovacao', () => {
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
      valorMensal: 149,
      limiteMoradores: 20,
      periodoCodigo: 'TRIMESTRAL',
      valorCiclo: 425,
      status: 'ATIVA',
      ativaAte: new Date(Date.now() + 5 * UM_DIA - 60_000),
      cobrancas: [
        {
          invoiceUrl: 'https://asaas/pay_2',
          valor: 425,
          referencia: '2026-12',
          periodoCodigo: 'TRIMESTRAL',
        },
      ],
    });
    prisma.user.count.mockResolvedValue(12);
    const service = new AssinaturasService(prisma, buildAsaasMock(), mailerVazio());

    const painel = await service.obterPainel('cond-1');

    expect(painel).toMatchObject({
      planoNome: 'Essencial',
      periodoCodigo: 'TRIMESTRAL',
      periodoNome: 'Trimestral',
      valorCiclo: 425,
      limiteMoradores: 20,
      moradoresAtivos: 12,
      status: 'ATIVA',
      diasRestantes: 5,
      cobrancaPendente: {
        invoiceUrl: 'https://asaas/pay_2',
        valor: 425,
        referencia: '2026-12',
        periodoCodigo: 'TRIMESTRAL',
      },
    });
    // renovar por qualquer período, sempre sobre o preço contratado (149/mês)
    expect(painel?.opcoesRenovacao.map((o) => [o.periodoCodigo, o.valorTotal])).toEqual([
      ['MENSAL', 149],
      ['TRIMESTRAL', 425],
      ['SEMESTRAL', 805],
      ['ANUAL', 1430],
    ]);
    expect(prisma.user.count).toHaveBeenCalledWith({
      where: { condominioId: 'cond-1', papel: 'MORADOR', ativo: true },
    });
  });

  it('reaproveita a cobrança já aberta em vez de gerar outra', async () => {
    const prisma = buildPrismaMock();
    prisma.assinatura.findUnique.mockResolvedValue({
      id: 'assin-1',
      status: 'ATIVA',
      periodoCodigo: 'MENSAL',
      responsavel: { id: 'sindico-1' },
      cobrancas: [{ invoiceUrl: 'https://asaas/ja_aberta', periodoCodigo: 'MENSAL' }],
    });
    const asaas = buildAsaasMock();
    const service = new AssinaturasService(prisma, asaas, mailerVazio());

    expect(await service.gerarCobrancaRenovacao('cond-1')).toEqual({
      invoiceUrl: 'https://asaas/ja_aberta',
    });
    expect(asaas.criarCobrancaPix).not.toHaveBeenCalled();
  });

  it('gera o PIX da próxima mensalidade quando não há nenhum em aberto', async () => {
    const prisma = buildPrismaMock();
    prisma.assinatura.findUnique.mockResolvedValue({
      id: 'assin-1',
      planoCodigo: 'ESSENCIAL',
      valorMensal: 149,
      periodoCodigo: 'MENSAL',
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

    expect(await service.gerarCobrancaRenovacao('cond-1')).toEqual({
      invoiceUrl: 'https://asaas/pay_1',
    });
    expect(asaas.criarCliente).not.toHaveBeenCalled();
    expect(asaas.criarCobrancaPix).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: 'cus_1', valor: 149 }),
    );
  });

  it('o síndico pode trocar de período ao renovar: o PIX em aberto de outro período é cancelado', async () => {
    const prisma = buildPrismaMock();
    prisma.assinatura.findUnique.mockResolvedValue({
      id: 'assin-1',
      planoCodigo: 'ESSENCIAL',
      valorMensal: 149,
      periodoCodigo: 'MENSAL',
      status: 'ATIVA',
      ativaAte: new Date(Date.now() + 3 * UM_DIA),
      responsavel: { id: 'sindico-1', asaasCustomerId: 'cus_1', cpf: '52998224725' },
      cobrancas: [
        {
          id: 'cob-mensal',
          asaasChargeId: 'pay_mensal',
          invoiceUrl: 'https://asaas/mensal',
          periodoCodigo: 'MENSAL',
        },
      ],
    });
    prisma.cobrancaAssinatura.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'c', ...data }),
    );
    const asaas = buildAsaasMock();
    const service = new AssinaturasService(prisma, asaas, mailerVazio());

    await service.gerarCobrancaRenovacao('cond-1', 'ANUAL');

    expect(prisma.cobrancaAssinatura.updateMany).toHaveBeenCalledWith({
      where: { id: 'cob-mensal', status: 'PENDENTE' },
      data: { status: 'CANCELADO' },
    });
    expect(asaas.cancelarCobranca).toHaveBeenCalledWith('pay_mensal');
    expect(asaas.criarCobrancaPix).toHaveBeenCalledWith(expect.objectContaining({ valor: 1430 }));
    expect(prisma.cobrancaAssinatura.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ periodoCodigo: 'ANUAL', dias: 365, valor: 1430 }),
    });
  });

  it('recusa período inexistente na renovação', async () => {
    const prisma = buildPrismaMock();
    prisma.assinatura.findUnique.mockResolvedValue({
      id: 'assin-1',
      periodoCodigo: 'MENSAL',
      status: 'ATIVA',
      responsavel: {},
      cobrancas: [],
    });
    const service = new AssinaturasService(prisma, buildAsaasMock(), mailerVazio());

    await expect(service.gerarCobrancaRenovacao('cond-1', 'QUINZENAL')).rejects.toMatchObject({
      code: 'PERIODO_INVALIDO',
    });
  });

  it('a lista pública traz os períodos e o preço de cada plano em cada período', () => {
    const service = new AssinaturasService(buildPrismaMock(), buildAsaasMock(), mailerVazio());

    const { periodos, planos } = service.listarPlanos();

    expect(periodos.map((p) => p.codigo)).toEqual(['MENSAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL']);
    expect(planos.map((p) => p.codigo)).toEqual(['ESSENCIAL', 'CONDOMINIO', 'GRANDE', 'PREMIUM']);
    expect(planos[0].precos).toHaveLength(4);
    expect(planos[1].precos.find((p) => p.periodoCodigo === 'ANUAL')?.valorTotal).toBe(2870);
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

  it('manda um link novo SEM prazo e SEM derrubar os anteriores: todos valem até a senha ser criada', async () => {
    const prisma = buildPrismaMock();
    prisma.assinatura.findUnique.mockResolvedValue(assinatura);
    prisma.tokenAcesso.findMany.mockResolvedValue([
      { usadoEm: null, createdAt: new Date(Date.now() - 5 * 60_000) },
    ]);
    const mailer = mailerVazio();
    const service = new AssinaturasService(prisma, buildAsaasMock(), mailer);

    await service.reenviarAcesso('assin-1');

    // nada de invalidar os links já enviados (o síndico pode clicar em qualquer um dos e-mails)
    expect(prisma.tokenAcesso.updateMany).not.toHaveBeenCalled();
    expect(prisma.tokenAcesso.create).toHaveBeenCalledWith({
      data: {
        userId: 'sindico-1',
        tokenHash: expect.stringMatching(/^[0-9a-f]{64}$/),
        expiraEm: null,
      },
    });
    expect(mailer.enviar).toHaveBeenCalledTimes(1);
  });

  it('o e-mail reenviado traz o recibo do primeiro pagamento', async () => {
    const prisma = buildPrismaMock();
    prisma.assinatura.findUnique.mockResolvedValue({
      ...assinatura,
      planoCodigo: 'CONDOMINIO',
      responsavel: { ...assinatura.responsavel, cpf: '52998224725' },
    });
    prisma.tokenAcesso.findMany.mockResolvedValue([]);
    const pagoEm = new Date('2026-11-03T20:00:00Z');
    prisma.cobrancaAssinatura.findFirst.mockResolvedValue({
      id: 'aaaa1111-0000-0000-0000-000000000000',
      periodoCodigo: 'TRIMESTRAL',
      dias: 90,
      valor: 852,
      pagoEm,
      invoiceUrl: 'https://asaas/c',
    });
    const mailer = mailerVazio();
    const service = new AssinaturasService(prisma, buildAsaasMock(), mailer);

    await service.reenviarAcesso('assin-1');

    expect(prisma.cobrancaAssinatura.findFirst).toHaveBeenCalledWith({
      where: { assinaturaId: 'assin-1', status: 'PAGO' },
      orderBy: { pagoEm: 'asc' },
    });
    const { texto } = mailer.enviar.mock.calls[0][0];
    expect(texto).toContain('RECIBO DE PAGAMENTO nº USAI-AAAA1111');
    expect(texto).toContain('Plano Condomínio · Trimestral');
    expect(texto).toMatch(/Valor pago: R\$\s852,00/);
  });

  it('sem nenhum pagamento registrado, reenvia o acesso mesmo assim (sem o bloco de recibo)', async () => {
    const prisma = buildPrismaMock();
    prisma.assinatura.findUnique.mockResolvedValue(assinatura);
    prisma.tokenAcesso.findMany.mockResolvedValue([]);
    prisma.cobrancaAssinatura.findFirst.mockResolvedValue(null);
    const mailer = mailerVazio();
    const service = new AssinaturasService(prisma, buildAsaasMock(), mailer);

    await service.reenviarAcesso('assin-1');

    const { texto } = mailer.enviar.mock.calls[0][0];
    expect(texto).toContain('/definir-senha?token=');
    expect(texto).not.toContain('RECIBO DE PAGAMENTO');
  });
});
