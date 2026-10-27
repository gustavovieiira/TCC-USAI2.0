import bcrypt from 'bcryptjs';
import {
  MovimentacoesService,
  formatarNumeroDocumento,
  mascararCpf,
} from '@/modules/movimentacoes/movimentacoes.service';
import { AppError, ForbiddenError, NotFoundError } from '@/common/errors';

const DONO_ID = 'dono-1';
const LOCATARIO_ID = 'locatario-1';
const ESTRANHO_ID = 'estranho-1';
const LOCACAO_ID = 'locacao-1';
const MOV_ID = 'mov-1';
const SENHA = 'senha-correta-123';

const declaracoes = [
  { id: 'recebimento', texto: 'Declaro que recebi o item.' },
  { id: 'ciencia', texto: 'Declaro que li os termos.' },
  { id: 'compromisso', texto: 'Comprometo-me a zelar pelo item.' },
];

const termo = {
  id: 'termo-1',
  tipo: 'RETIRADA',
  versao: 2,
  titulo: 'Termo de Retirada',
  clausulas: ['Cláusula 1', 'Cláusula 2'],
  declaracoes,
  statusRevisao: 'MODELO',
  aprovadoEm: null,
  createdAt: new Date('2026-10-01'),
};

const dono = {
  id: DONO_ID,
  nome: 'Davi Dono',
  apartamento: '101',
  cpf: '11122233344',
  condominio: { nome: 'Residencial Jardim Europa' },
};
const locatario = {
  id: LOCATARIO_ID,
  nome: 'Carla Locataria',
  apartamento: '202',
  cpf: '55566677788',
  condominio: { nome: 'Residencial Jardim Europa' },
};

function locacaoCompleta(status = 'PAGA') {
  return {
    id: LOCACAO_ID,
    status,
    locatarioId: LOCATARIO_ID,
    dataInicio: new Date('2026-11-01T00:00:00Z'),
    dataFim: new Date('2026-11-03T00:00:00Z'),
    valorTotal: 100,
    finalidade: 'Pendurar quadros',
    item: {
      id: 'item-1',
      titulo: 'Furadeira Bosch',
      descricao: 'Furadeira de impacto 650W',
      categoria: 'Ferramentas',
      fabricante: 'Bosch',
      modelo: 'GSB 13 RE',
      numeroSerie: 'SN-123',
      acessorios: ['Maleta', 'Jogo de brocas'],
      ownerId: DONO_ID,
      owner: dono,
    },
    locatario,
  };
}

function buildPrismaMock() {
  const prisma = {
    locacao: { findUnique: jest.fn(), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    movimentacao: {
      create: jest.fn(),
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      update: jest.fn(),
    },
    termoResponsabilidade: { findFirst: jest.fn().mockResolvedValue(termo) },
    eventoMovimentacao: { create: jest.fn() },
    aceiteTermo: { create: jest.fn() },
    user: { findUnique: jest.fn() },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  prisma.$transaction = jest.fn((callback: (tx: unknown) => unknown) => callback(prisma));
  return prisma;
}

function notificacoesFalsas() {
  const notificacoes = { notificar: jest.fn().mockResolvedValue(undefined) };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return notificacoes as any;
}

const entradaRetirada = {
  tipo: 'RETIRADA' as const,
  estadoConservacao: 'BOM' as const,
  acessorios: [
    { nome: 'Maleta', conferido: true },
    { nome: 'Jogo de brocas', conferido: false },
  ],
  observacoes: 'Pequeno risco na tampa',
};

function movimentacaoCriada(overrides: Record<string, unknown> = {}) {
  return {
    id: MOV_ID,
    numero: 7,
    createdAt: new Date('2026-10-27T12:00:00Z'),
    locacaoId: LOCACAO_ID,
    tipo: 'RETIRADA',
    status: 'AGUARDANDO_ACEITE',
    entreguePorId: DONO_ID,
    recebidoPorId: LOCATARIO_ID,
    ocorridoEm: new Date('2026-10-27T12:00:00Z'),
    concluidaEm: null,
    estadoConservacao: 'BOM',
    acessorios: entradaRetirada.acessorios,
    observacoes: 'Pequeno risco na tampa',
    termoId: termo.id,
    snapshot: { locacao: { id: LOCACAO_ID }, item: { titulo: 'Furadeira Bosch' } },
    hashIntegridade: null,
    entreguePor: { id: DONO_ID, nome: 'Davi Dono' },
    recebidoPor: { id: LOCATARIO_ID, nome: 'Carla Locataria' },
    locacao: { id: LOCACAO_ID, status: 'PAGA' },
    termo,
    aceites: [],
    eventos: [],
    ...overrides,
  };
}

describe('helpers', () => {
  it('mascara o CPF mostrando só os 2 últimos dígitos (e nada quando inválido)', () => {
    expect(mascararCpf('11122233344')).toBe('***.***.***-44');
    expect(mascararCpf('111.222.333-44')).toBe('***.***.***-44');
    expect(mascararCpf('123')).toBeNull();
    expect(mascararCpf(null)).toBeNull();
  });

  it('numera o documento como USAI-AAAA-000123', () => {
    expect(formatarNumeroDocumento(7, new Date('2026-10-27T12:00:00Z'))).toBe('USAI-2026-000007');
    expect(formatarNumeroDocumento(123456, new Date('2027-01-02T12:00:00Z'))).toBe(
      'USAI-2027-123456',
    );
  });
});

describe('MovimentacoesService.registrar', () => {
  it('RETIRADA: o dono registra a entrega; vira "aguardando aceite" do locatário, com a foto dos dados e o histórico', async () => {
    const prisma = buildPrismaMock();
    prisma.locacao.findUnique.mockResolvedValue(locacaoCompleta('PAGA'));
    prisma.movimentacao.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => movimentacaoCriada(data),
    );
    const notificacoes = notificacoesFalsas();

    const resultado = await new MovimentacoesService(prisma, notificacoes).registrar(
      LOCACAO_ID,
      DONO_ID,
      entradaRetirada,
    );

    const dados = prisma.movimentacao.create.mock.calls[0][0].data;
    expect(dados).toMatchObject({
      locacaoId: LOCACAO_ID,
      tipo: 'RETIRADA',
      entreguePorId: DONO_ID,
      recebidoPorId: LOCATARIO_ID,
      estadoConservacao: 'BOM',
      observacoes: 'Pequeno risco na tampa',
      termoId: 'termo-1',
    });
    // a foto dos dados guarda item, partes e finalidade — o documento não muda se eles mudarem depois
    expect(dados.snapshot.item).toMatchObject({
      titulo: 'Furadeira Bosch',
      fabricante: 'Bosch',
      modelo: 'GSB 13 RE',
      numeroSerie: 'SN-123',
      acessorios: ['Maleta', 'Jogo de brocas'],
    });
    expect(dados.snapshot.locacao.finalidade).toBe('Pendurar quadros');
    expect(dados.snapshot.locatario).toMatchObject({
      nome: 'Carla Locataria',
      apartamento: '202',
      condominio: 'Residencial Jardim Europa',
      cpfMascarado: '***.***.***-88',
    });
    expect(JSON.stringify(dados.snapshot)).not.toContain('55566677788');
    expect(prisma.eventoMovimentacao.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ movimentacaoId: MOV_ID, userId: DONO_ID, acao: 'CRIADA' }),
    });
    expect(resultado).toMatchObject({
      numeroDocumento: 'USAI-2026-000007',
      status: 'AGUARDANDO_ACEITE',
    });
    expect(notificacoes.notificar).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: LOCATARIO_ID,
        tipo: 'MOVIMENTACAO_PENDENTE',
        link: `/movimentacoes/${MOV_ID}`,
      }),
    );
  });

  it('DEVOLUCAO: o locatário registra; quem recebe (e aceita) é o dono', async () => {
    const prisma = buildPrismaMock();
    prisma.locacao.findUnique.mockResolvedValue(locacaoCompleta('EM_ANDAMENTO'));
    prisma.movimentacao.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) =>
        movimentacaoCriada({ ...data, tipo: 'DEVOLUCAO' }),
    );

    await new MovimentacoesService(prisma).registrar(LOCACAO_ID, LOCATARIO_ID, {
      ...entradaRetirada,
      tipo: 'DEVOLUCAO',
    });

    expect(prisma.movimentacao.create.mock.calls[0][0].data).toMatchObject({
      tipo: 'DEVOLUCAO',
      entreguePorId: LOCATARIO_ID,
      recebidoPorId: DONO_ID,
    });
  });

  it('só o dono registra a entrega e só o locatário registra a devolução (403 no resto)', async () => {
    const prisma = buildPrismaMock();
    const service = new MovimentacoesService(prisma);

    prisma.locacao.findUnique.mockResolvedValue(locacaoCompleta('PAGA'));
    await expect(
      service.registrar(LOCACAO_ID, LOCATARIO_ID, entradaRetirada),
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(
      service.registrar(LOCACAO_ID, ESTRANHO_ID, entradaRetirada),
    ).rejects.toBeInstanceOf(ForbiddenError);

    prisma.locacao.findUnique.mockResolvedValue(locacaoCompleta('EM_ANDAMENTO'));
    await expect(
      service.registrar(LOCACAO_ID, DONO_ID, { ...entradaRetirada, tipo: 'DEVOLUCAO' }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(prisma.movimentacao.create).not.toHaveBeenCalled();
  });

  it('a entrega só vale em locação PAGA e a devolução só em locação EM_ANDAMENTO (409)', async () => {
    const prisma = buildPrismaMock();
    const service = new MovimentacoesService(prisma);

    for (const status of ['PENDENTE', 'APROVADA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA']) {
      prisma.locacao.findUnique.mockResolvedValue(locacaoCompleta(status));
      await expect(service.registrar(LOCACAO_ID, DONO_ID, entradaRetirada)).rejects.toMatchObject({
        statusCode: 409,
      });
    }

    for (const status of ['PAGA', 'CONCLUIDA']) {
      prisma.locacao.findUnique.mockResolvedValue(locacaoCompleta(status));
      await expect(
        service.registrar(LOCACAO_ID, LOCATARIO_ID, { ...entradaRetirada, tipo: 'DEVOLUCAO' }),
      ).rejects.toMatchObject({ statusCode: 409 });
    }
  });

  it('não duplica: se já existe uma retirada aguardando ou concluída, responde 409', async () => {
    const prisma = buildPrismaMock();
    prisma.locacao.findUnique.mockResolvedValue(locacaoCompleta('PAGA'));
    prisma.movimentacao.findFirst.mockResolvedValue(movimentacaoCriada());

    await expect(
      new MovimentacoesService(prisma).registrar(LOCACAO_ID, DONO_ID, entradaRetirada),
    ).rejects.toMatchObject({ statusCode: 409, code: 'MOVIMENTACAO_EXISTENTE' });
    expect(prisma.movimentacao.findFirst).toHaveBeenCalledWith({
      where: {
        locacaoId: LOCACAO_ID,
        tipo: 'RETIRADA',
        status: { in: ['AGUARDANDO_ACEITE', 'CONCLUIDA'] },
      },
    });
  });

  it('locação inexistente responde 404', async () => {
    const prisma = buildPrismaMock();
    prisma.locacao.findUnique.mockResolvedValue(null);

    await expect(
      new MovimentacoesService(prisma).registrar('x', DONO_ID, entradaRetirada),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('usa a versão MAIS RECENTE do termo do tipo da operação', async () => {
    const prisma = buildPrismaMock();
    prisma.locacao.findUnique.mockResolvedValue(locacaoCompleta('PAGA'));
    prisma.movimentacao.create.mockResolvedValue(movimentacaoCriada());

    await new MovimentacoesService(prisma).registrar(LOCACAO_ID, DONO_ID, entradaRetirada);

    expect(prisma.termoResponsabilidade.findFirst).toHaveBeenCalledWith({
      where: { tipo: 'RETIRADA' },
      orderBy: { versao: 'desc' },
    });
  });
});

describe('MovimentacoesService.aceitar', () => {
  const todas = ['recebimento', 'ciencia', 'compromisso'];

  async function prepararAceite(overrides: Record<string, unknown> = {}) {
    const prisma = buildPrismaMock();
    prisma.movimentacao.findUnique.mockResolvedValue(movimentacaoCriada(overrides));
    prisma.user.findUnique.mockResolvedValue({
      id: LOCATARIO_ID,
      nome: 'Carla Locataria',
      senhaHash: await bcrypt.hash(SENHA, 4),
    });
    prisma.locacao.findUnique.mockResolvedValue(locacaoCompleta('PAGA'));
    prisma.aceiteTermo.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        id: 'aceite-1',
      }),
    );
    return prisma;
  }

  it('aceite completo + senha certa: conclui, avança a locação pra EM_ANDAMENTO, grava aceite, assinatura e impressão digital', async () => {
    const prisma = await prepararAceite();
    const notificacoes = notificacoesFalsas();

    await new MovimentacoesService(prisma, notificacoes).aceitar(
      MOV_ID,
      LOCATARIO_ID,
      { declaracoes: todas, senha: SENHA },
      { ip: '10.0.0.5', userAgent: 'Vitest/1.0' },
    );

    expect(prisma.movimentacao.updateMany).toHaveBeenCalledWith({
      where: { id: MOV_ID, status: 'AGUARDANDO_ACEITE' },
      data: { status: 'CONCLUIDA', concluidaEm: expect.any(Date) },
    });
    expect(prisma.locacao.updateMany).toHaveBeenCalledWith({
      where: { id: LOCACAO_ID, status: 'PAGA' },
      data: { status: 'EM_ANDAMENTO' },
    });
    const aceite = prisma.aceiteTermo.create.mock.calls[0][0].data;
    expect(aceite).toMatchObject({
      movimentacaoId: MOV_ID,
      userId: LOCATARIO_ID,
      termoId: 'termo-1',
      ip: '10.0.0.5',
      userAgent: 'Vitest/1.0',
    });
    expect(aceite.assinatura).toMatch(/^[0-9a-f]{64}$/);
    // o texto exato das declarações fica congelado no aceite
    expect(aceite.declaracoes).toEqual(declaracoes);
    expect(prisma.movimentacao.update.mock.calls[0][0].data.hashIntegridade).toMatch(
      /^[0-9a-f]{64}$/,
    );
    expect(prisma.eventoMovimentacao.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ acao: 'ACEITE_REGISTRADO', userId: LOCATARIO_ID }),
    });
    expect(notificacoes.notificar).toHaveBeenCalledWith(
      expect.objectContaining({ userId: DONO_ID, tipo: 'MOVIMENTACAO_CONCLUIDA' }),
    );
  });

  it('DEVOLUCAO aceita pelo dono: a locação vai pra CONCLUIDA', async () => {
    const prisma = await prepararAceite({
      tipo: 'DEVOLUCAO',
      entreguePorId: LOCATARIO_ID,
      recebidoPorId: DONO_ID,
      recebidoPor: { id: DONO_ID, nome: 'Davi Dono' },
      entreguePor: { id: LOCATARIO_ID, nome: 'Carla Locataria' },
      locacao: { id: LOCACAO_ID, status: 'EM_ANDAMENTO' },
    });
    prisma.user.findUnique.mockResolvedValue({
      id: DONO_ID,
      nome: 'Davi Dono',
      senhaHash: await bcrypt.hash(SENHA, 4),
    });
    prisma.locacao.findUnique.mockResolvedValue(locacaoCompleta('EM_ANDAMENTO'));

    await new MovimentacoesService(prisma).aceitar(MOV_ID, DONO_ID, {
      declaracoes: todas,
      senha: SENHA,
    });

    expect(prisma.locacao.updateMany).toHaveBeenCalledWith({
      where: { id: LOCACAO_ID, status: 'EM_ANDAMENTO' },
      data: { status: 'CONCLUIDA' },
    });
  });

  it('não conclui sem marcar TODAS as declarações (400) e não grava nada', async () => {
    const prisma = await prepararAceite();
    const service = new MovimentacoesService(prisma);

    for (const marcadas of [[], ['recebimento'], ['recebimento', 'ciencia']]) {
      await expect(
        service.aceitar(MOV_ID, LOCATARIO_ID, { declaracoes: marcadas, senha: SENHA }),
      ).rejects.toMatchObject({ statusCode: 400, code: 'ACEITE_INCOMPLETO' });
    }
    expect(prisma.movimentacao.updateMany).not.toHaveBeenCalled();
    expect(prisma.aceiteTermo.create).not.toHaveBeenCalled();
  });

  it('declaração que não existe no termo é recusada (400)', async () => {
    const prisma = await prepararAceite();

    await expect(
      new MovimentacoesService(prisma).aceitar(MOV_ID, LOCATARIO_ID, {
        declaracoes: [...todas, 'inventada'],
        senha: SENHA,
      }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'ACEITE_INCOMPLETO' });
  });

  it('senha errada: 403 SENHA_INVALIDA (não 401, pra não derrubar a sessão) e nada é gravado', async () => {
    const prisma = await prepararAceite();

    await expect(
      new MovimentacoesService(prisma).aceitar(MOV_ID, LOCATARIO_ID, {
        declaracoes: todas,
        senha: 'errada',
      }),
    ).rejects.toMatchObject({ statusCode: 403, code: 'SENHA_INVALIDA' });
    expect(prisma.movimentacao.updateMany).not.toHaveBeenCalled();
    expect(prisma.aceiteTermo.create).not.toHaveBeenCalled();
  });

  it('só quem RECEBE aceita: quem entregou e estranhos recebem 403', async () => {
    const prisma = await prepararAceite();
    const service = new MovimentacoesService(prisma);

    for (const quem of [DONO_ID, ESTRANHO_ID]) {
      await expect(
        service.aceitar(MOV_ID, quem, { declaracoes: todas, senha: SENHA }),
      ).rejects.toBeInstanceOf(ForbiddenError);
    }
    expect(prisma.aceiteTermo.create).not.toHaveBeenCalled();
  });

  it('não aceita duas vezes nem um registro cancelado/concluído (409)', async () => {
    for (const status of ['CONCLUIDA', 'CANCELADA']) {
      const prisma = await prepararAceite({ status });

      await expect(
        new MovimentacoesService(prisma).aceitar(MOV_ID, LOCATARIO_ID, {
          declaracoes: todas,
          senha: SENHA,
        }),
      ).rejects.toMatchObject({ statusCode: 409 });
    }
  });

  it('corrida: se outro aceite concluiu no meio, a transação falha com 409 (compare-and-swap)', async () => {
    const prisma = await prepararAceite();
    prisma.movimentacao.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      new MovimentacoesService(prisma).aceitar(MOV_ID, LOCATARIO_ID, {
        declaracoes: todas,
        senha: SENHA,
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(prisma.aceiteTermo.create).not.toHaveBeenCalled();
  });

  it('se a locação já não está no estado esperado, desfaz tudo (409)', async () => {
    const prisma = await prepararAceite();
    prisma.locacao.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      new MovimentacoesService(prisma).aceitar(MOV_ID, LOCATARIO_ID, {
        declaracoes: todas,
        senha: SENHA,
      }),
    ).rejects.toBeInstanceOf(AppError);
    expect(prisma.aceiteTermo.create).not.toHaveBeenCalled();
  });
});

describe('MovimentacoesService.buscarDetalhe', () => {
  it('só as duas partes e o Admin enxergam o documento; estranho recebe 403', async () => {
    const prisma = buildPrismaMock();
    prisma.movimentacao.findUnique.mockResolvedValue(movimentacaoCriada());
    const service = new MovimentacoesService(prisma);

    await expect(service.buscarDetalhe(MOV_ID, DONO_ID, 'MORADOR')).resolves.toBeDefined();
    await expect(service.buscarDetalhe(MOV_ID, LOCATARIO_ID, 'MORADOR')).resolves.toBeDefined();
    await expect(service.buscarDetalhe(MOV_ID, 'admin-1', 'ADMIN')).resolves.toBeDefined();
    await expect(service.buscarDetalhe(MOV_ID, ESTRANHO_ID, 'MORADOR')).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    await expect(service.buscarDetalhe(MOV_ID, ESTRANHO_ID, 'SINDICO')).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it('informa o que cada um pode fazer: o recebedor aceita, quem registrou cancela, as partes retificam', async () => {
    const prisma = buildPrismaMock();
    prisma.movimentacao.findUnique.mockResolvedValue(movimentacaoCriada());
    const service = new MovimentacoesService(prisma);

    expect((await service.buscarDetalhe(MOV_ID, LOCATARIO_ID, 'MORADOR')).permissoes).toEqual({
      aceitar: true,
      cancelar: false,
      retificar: true,
    });
    expect((await service.buscarDetalhe(MOV_ID, DONO_ID, 'MORADOR')).permissoes).toEqual({
      aceitar: false,
      cancelar: true,
      retificar: true,
    });
    expect((await service.buscarDetalhe(MOV_ID, 'admin-1', 'ADMIN')).permissoes).toEqual({
      aceitar: false,
      cancelar: false,
      retificar: false,
    });
  });

  it('IP e navegador do aceite só aparecem pro Admin (auditoria), nunca pras partes', async () => {
    const prisma = await (async () => {
      const p = buildPrismaMock();
      p.movimentacao.findUnique.mockResolvedValue(
        movimentacaoCriada({
          status: 'CONCLUIDA',
          aceites: [
            {
              id: 'a-1',
              userId: LOCATARIO_ID,
              aceitoEm: new Date('2026-10-27T13:00:00Z'),
              declaracoes,
              assinatura: 'abc',
              ip: '10.0.0.5',
              userAgent: 'Vitest/1.0',
              user: { id: LOCATARIO_ID, nome: 'Carla Locataria' },
            },
          ],
        }),
      );
      return p;
    })();
    const service = new MovimentacoesService(prisma);

    const comoParte = await service.buscarDetalhe(MOV_ID, DONO_ID, 'MORADOR');
    const comoAdmin = await service.buscarDetalhe(MOV_ID, 'admin-1', 'ADMIN');

    expect(JSON.stringify(comoParte.aceite)).not.toContain('10.0.0.5');
    expect(comoAdmin.aceite).toMatchObject({ ip: '10.0.0.5', userAgent: 'Vitest/1.0' });
  });

  it('integridade: o hash gravado no aceite confere; adulterar o documento depois faz a verificação falhar', async () => {
    // 1) aceita de verdade, capturando o que foi gravado
    const prismaAceite = buildPrismaMock();
    const aberto = movimentacaoCriada();
    prismaAceite.movimentacao.findUnique.mockResolvedValue(aberto);
    prismaAceite.user.findUnique.mockResolvedValue({
      id: LOCATARIO_ID,
      nome: 'Carla Locataria',
      senhaHash: await bcrypt.hash(SENHA, 4),
    });
    prismaAceite.locacao.findUnique.mockResolvedValue(locacaoCompleta('PAGA'));
    prismaAceite.aceiteTermo.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...data,
        id: 'aceite-1',
      }),
    );
    await new MovimentacoesService(prismaAceite).aceitar(MOV_ID, LOCATARIO_ID, {
      declaracoes: ['recebimento', 'ciencia', 'compromisso'],
      senha: SENHA,
    });
    const aceiteGravado = prismaAceite.aceiteTermo.create.mock.calls[0][0].data;
    const hashGravado = prismaAceite.movimentacao.update.mock.calls[0][0].data.hashIntegridade;

    // 2) consulta depois: o documento do banco, com o hash e o aceite gravados
    const concluida = (alteracoes: Record<string, unknown> = {}) =>
      movimentacaoCriada({
        status: 'CONCLUIDA',
        hashIntegridade: hashGravado,
        aceites: [
          { ...aceiteGravado, id: 'aceite-1', user: { id: LOCATARIO_ID, nome: 'Carla Locataria' } },
        ],
        ...alteracoes,
      });

    const prisma = buildPrismaMock();
    const service = new MovimentacoesService(prisma);

    prisma.movimentacao.findUnique.mockResolvedValue(concluida());
    expect((await service.buscarDetalhe(MOV_ID, DONO_ID, 'MORADOR')).integridade).toEqual({
      hash: hashGravado,
      verificada: true,
    });

    // observações, estado, acessórios, snapshot do item: qualquer mudança silenciosa é detectada
    for (const alteracao of [
      { observacoes: 'Sem nenhum risco' },
      { estadoConservacao: 'OTIMO' },
      { acessorios: [{ nome: 'Maleta', conferido: true }] },
      { snapshot: { locacao: { id: LOCACAO_ID }, item: { titulo: 'Outro item' } } },
    ]) {
      prisma.movimentacao.findUnique.mockResolvedValue(concluida(alteracao));
      expect((await service.buscarDetalhe(MOV_ID, DONO_ID, 'MORADOR')).integridade.verificada).toBe(
        false,
      );
    }
  });

  it('enquanto não concluída, a verificação é "não se aplica" (nula)', async () => {
    const prisma = buildPrismaMock();
    prisma.movimentacao.findUnique.mockResolvedValue(movimentacaoCriada());

    const detalhe = await new MovimentacoesService(prisma).buscarDetalhe(
      MOV_ID,
      DONO_ID,
      'MORADOR',
    );

    expect(detalhe.integridade).toEqual({ hash: null, verificada: null });
  });

  it('registro inexistente responde 404', async () => {
    const prisma = buildPrismaMock();
    prisma.movimentacao.findUnique.mockResolvedValue(null);

    await expect(
      new MovimentacoesService(prisma).buscarDetalhe('x', DONO_ID, 'MORADOR'),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('MovimentacoesService.cancelar', () => {
  it('quem registrou cancela enquanto aguarda aceite; o outro lado é avisado e o histórico guarda', async () => {
    const prisma = buildPrismaMock();
    prisma.movimentacao.findUnique.mockResolvedValue(movimentacaoCriada());
    const notificacoes = notificacoesFalsas();

    await new MovimentacoesService(prisma, notificacoes).cancelar(MOV_ID, DONO_ID);

    expect(prisma.movimentacao.updateMany).toHaveBeenCalledWith({
      where: { id: MOV_ID, status: 'AGUARDANDO_ACEITE' },
      data: { status: 'CANCELADA' },
    });
    expect(prisma.eventoMovimentacao.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ acao: 'CANCELADA', userId: DONO_ID }),
    });
    expect(notificacoes.notificar).toHaveBeenCalledWith(
      expect.objectContaining({ userId: LOCATARIO_ID, tipo: 'MOVIMENTACAO_CANCELADA' }),
    );
  });

  it('quem recebe não cancela (403) e registro já concluído não cancela (409)', async () => {
    const prisma = buildPrismaMock();
    prisma.movimentacao.findUnique.mockResolvedValue(movimentacaoCriada());
    await expect(
      new MovimentacoesService(prisma).cancelar(MOV_ID, LOCATARIO_ID),
    ).rejects.toBeInstanceOf(ForbiddenError);

    prisma.movimentacao.updateMany.mockResolvedValue({ count: 0 });
    await expect(new MovimentacoesService(prisma).cancelar(MOV_ID, DONO_ID)).rejects.toMatchObject({
      statusCode: 409,
    });
  });
});

describe('MovimentacoesService.retificar', () => {
  it('acrescenta um evento ao histórico (sem tocar no registro) e avisa a outra parte', async () => {
    const prisma = buildPrismaMock();
    prisma.movimentacao.findUnique.mockResolvedValue(movimentacaoCriada({ status: 'CONCLUIDA' }));
    const notificacoes = notificacoesFalsas();

    await new MovimentacoesService(prisma, notificacoes).retificar(
      MOV_ID,
      LOCATARIO_ID,
      'O risco na tampa já existia antes da retirada.',
    );

    expect(prisma.eventoMovimentacao.create).toHaveBeenCalledWith({
      data: {
        movimentacaoId: MOV_ID,
        userId: LOCATARIO_ID,
        acao: 'RETIFICACAO',
        detalhe: 'O risco na tampa já existia antes da retirada.',
      },
    });
    // o registro original permanece como está
    expect(prisma.movimentacao.update).not.toHaveBeenCalled();
    expect(prisma.movimentacao.updateMany).not.toHaveBeenCalled();
    expect(notificacoes.notificar).toHaveBeenCalledWith(
      expect.objectContaining({ userId: DONO_ID, tipo: 'MOVIMENTACAO_RETIFICADA' }),
    );
  });

  it('só as partes retificam (Admin e estranhos não), e registro cancelado não recebe retificação', async () => {
    const prisma = buildPrismaMock();
    prisma.movimentacao.findUnique.mockResolvedValue(movimentacaoCriada({ status: 'CONCLUIDA' }));
    const service = new MovimentacoesService(prisma);

    await expect(
      service.retificar(MOV_ID, ESTRANHO_ID, 'Texto da correção'),
    ).rejects.toBeInstanceOf(ForbiddenError);

    prisma.movimentacao.findUnique.mockResolvedValue(movimentacaoCriada({ status: 'CANCELADA' }));
    await expect(service.retificar(MOV_ID, DONO_ID, 'Texto da correção')).rejects.toMatchObject({
      statusCode: 409,
    });
  });
});

describe('MovimentacoesService.listarPorLocacao / termoVigente / listarRecentes', () => {
  it('lista os registros da locação só pras partes (e Admin)', async () => {
    const prisma = buildPrismaMock();
    prisma.locacao.findUnique.mockResolvedValue(locacaoCompleta());
    prisma.movimentacao.findMany.mockResolvedValue([movimentacaoCriada()]);
    const service = new MovimentacoesService(prisma);

    const lista = await service.listarPorLocacao(LOCACAO_ID, LOCATARIO_ID, 'MORADOR');
    expect(lista[0]).toMatchObject({ numeroDocumento: 'USAI-2026-000007', tipo: 'RETIRADA' });
    await expect(service.listarPorLocacao(LOCACAO_ID, 'admin-1', 'ADMIN')).resolves.toHaveLength(1);
    await expect(
      service.listarPorLocacao(LOCACAO_ID, ESTRANHO_ID, 'MORADOR'),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('o termo vigente é a versão mais recente; sem termo, 404', async () => {
    const prisma = buildPrismaMock();
    const service = new MovimentacoesService(prisma);

    expect(await service.termoVigente('RETIRADA')).toMatchObject({
      versao: 2,
      statusRevisao: 'MODELO',
    });

    prisma.termoResponsabilidade.findFirst.mockResolvedValue(null);
    await expect(service.termoVigente('RETIRADA')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('listarRecentes traz o item de cada documento (visão do Admin)', async () => {
    const prisma = buildPrismaMock();
    prisma.movimentacao.findMany.mockResolvedValue([
      movimentacaoCriada({ locacao: { id: LOCACAO_ID, item: { titulo: 'Furadeira Bosch' } } }),
    ]);

    const lista = await new MovimentacoesService(prisma).listarRecentes();

    expect(lista[0]).toMatchObject({ itemTitulo: 'Furadeira Bosch', locacaoId: LOCACAO_ID });
  });
});
