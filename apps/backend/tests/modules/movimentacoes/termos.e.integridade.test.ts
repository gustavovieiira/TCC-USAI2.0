import { Prisma } from '@prisma/client';
import { TermosService } from '@/modules/movimentacoes/termos.service';
import {
  calcularAssinatura,
  calcularHashIntegridade,
  canonicalizar,
} from '@/modules/movimentacoes/movimentacoes.integridade';
import { criarTermoSchema } from '@/modules/movimentacoes/movimentacoes.schemas';
import { AppError, NotFoundError } from '@/common/errors';

function buildPrismaMock() {
  const prisma = {
    termoResponsabilidade: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn().mockResolvedValue({ _max: { versao: null } }),
    },
    logAuditoria: { create: jest.fn() },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  prisma.$transaction = jest.fn((callback: (tx: unknown) => unknown) => callback(prisma));
  return prisma;
}

const registroDeTermo = (extra: Record<string, unknown> = {}) => ({
  id: 'termo-3',
  tipo: 'RETIRADA',
  versao: 3,
  titulo: 'Termo de Retirada',
  clausulas: ['Cláusula um'],
  declaracoes: [{ id: 'ciencia', texto: 'Declaro que li os termos.' }],
  statusRevisao: 'MODELO',
  aprovadoEm: null,
  createdAt: new Date('2026-10-27'),
  ...extra,
});

const entradaDoTermo = {
  tipo: 'RETIRADA' as const,
  titulo: 'Termo de Retirada v3',
  clausulas: ['O locatário zela pelo item.'],
  declaracoes: [{ id: 'ciencia', texto: 'Declaro que li e estou ciente dos termos.' }],
};

describe('TermosService', () => {
  it('editar cria uma NOVA versão (a seguinte à última), sempre como MODELO, e audita', async () => {
    const prisma = buildPrismaMock();
    prisma.termoResponsabilidade.aggregate.mockResolvedValue({ _max: { versao: 2 } });
    prisma.termoResponsabilidade.create.mockResolvedValue(registroDeTermo());

    const termo = await new TermosService(prisma).criarNovaVersao('admin-1', entradaDoTermo);

    expect(prisma.termoResponsabilidade.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tipo: 'RETIRADA',
        versao: 3,
        statusRevisao: 'MODELO',
        criadoPorId: 'admin-1',
      }),
    });
    expect(prisma.termoResponsabilidade.update).not.toHaveBeenCalled();
    expect(prisma.logAuditoria.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ adminId: 'admin-1', acao: 'CRIAR_VERSAO_TERMO' }),
    });
    expect(termo).toMatchObject({ versao: 3, statusRevisao: 'MODELO' });
  });

  it('o primeiro termo de um tipo começa na versão 1', async () => {
    const prisma = buildPrismaMock();
    prisma.termoResponsabilidade.create.mockResolvedValue(registroDeTermo({ versao: 1 }));

    await new TermosService(prisma).criarNovaVersao('admin-1', entradaDoTermo);

    expect(prisma.termoResponsabilidade.create.mock.calls[0][0].data.versao).toBe(1);
  });

  it('duas versões criadas ao mesmo tempo: a repetida vira 409 (chave única), não 500', async () => {
    const prisma = buildPrismaMock();
    prisma.termoResponsabilidade.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique', { code: 'P2002', clientVersion: 'x' }),
    );

    await expect(
      new TermosService(prisma).criarNovaVersao('admin-1', entradaDoTermo),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'VERSAO_DUPLICADA',
    });
  });

  it('aprovar registra quem e quando revisou; não aprova duas vezes; termo inexistente é 404', async () => {
    const prisma = buildPrismaMock();
    const service = new TermosService(prisma);

    prisma.termoResponsabilidade.findUnique.mockResolvedValue(registroDeTermo());
    prisma.termoResponsabilidade.update.mockResolvedValue(
      registroDeTermo({ statusRevisao: 'APROVADO', aprovadoEm: new Date() }),
    );
    const aprovado = await service.aprovar('termo-3', 'admin-1');
    expect(prisma.termoResponsabilidade.update).toHaveBeenCalledWith({
      where: { id: 'termo-3' },
      data: { statusRevisao: 'APROVADO', aprovadoPorId: 'admin-1', aprovadoEm: expect.any(Date) },
    });
    expect(aprovado.statusRevisao).toBe('APROVADO');
    expect(prisma.logAuditoria.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ acao: 'APROVAR_TERMO', alvoId: 'termo-3' }),
    });

    prisma.termoResponsabilidade.findUnique.mockResolvedValue(
      registroDeTermo({ statusRevisao: 'APROVADO' }),
    );
    await expect(service.aprovar('termo-3', 'admin-1')).rejects.toBeInstanceOf(AppError);

    prisma.termoResponsabilidade.findUnique.mockResolvedValue(null);
    await expect(service.aprovar('x', 'admin-1')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('lista tudo, por tipo e da versão mais nova pra mais velha', async () => {
    const prisma = buildPrismaMock();
    prisma.termoResponsabilidade.findMany.mockResolvedValue([registroDeTermo()]);

    const termos = await new TermosService(prisma).listar();

    expect(prisma.termoResponsabilidade.findMany).toHaveBeenCalledWith({
      orderBy: [{ tipo: 'asc' }, { versao: 'desc' }],
    });
    expect(termos[0].declaracoes).toEqual([{ id: 'ciencia', texto: 'Declaro que li os termos.' }]);
  });
});

describe('criarTermoSchema', () => {
  it('aceita um termo bem formado', () => {
    expect(criarTermoSchema.safeParse(entradaDoTermo).success).toBe(true);
  });

  it('exige ao menos uma cláusula e uma declaração de aceite', () => {
    expect(criarTermoSchema.safeParse({ ...entradaDoTermo, clausulas: [] }).success).toBe(false);
    expect(criarTermoSchema.safeParse({ ...entradaDoTermo, declaracoes: [] }).success).toBe(false);
  });

  it('recusa identificadores de declaração repetidos ou inválidos', () => {
    const repetidas = [
      { id: 'ciencia', texto: 'Declaro que li e estou ciente dos termos.' },
      { id: 'ciencia', texto: 'Declaro que recebi o item descrito neste documento.' },
    ];
    expect(criarTermoSchema.safeParse({ ...entradaDoTermo, declaracoes: repetidas }).success).toBe(
      false,
    );
    expect(
      criarTermoSchema.safeParse({
        ...entradaDoTermo,
        declaracoes: [{ id: 'Tem Espaço!', texto: 'Declaro que li e estou ciente dos termos.' }],
      }).success,
    ).toBe(false);
  });

  it('só RETIRADA e DEVOLUCAO são tipos válidos', () => {
    expect(criarTermoSchema.safeParse({ ...entradaDoTermo, tipo: 'TRANSFERENCIA' }).success).toBe(
      false,
    );
  });
});

describe('integridade', () => {
  it('canonicalizar ignora a ordem das chaves e os campos indefinidos', () => {
    expect(canonicalizar({ b: 1, a: { d: [3, 2], c: undefined } })).toBe(
      canonicalizar({ a: { c: undefined, d: [3, 2] }, b: 1 }),
    );
    expect(canonicalizar({ a: [1, 2] })).not.toBe(canonicalizar({ a: [2, 1] }));
  });

  const base = {
    numero: 7,
    tipo: 'RETIRADA',
    locacaoId: 'loc-1',
    entreguePorId: 'dono-1',
    recebidoPorId: 'loc-1',
    ocorridoEm: '2026-10-27T12:00:00.000Z',
    estadoConservacao: 'BOM',
    acessorios: [{ nome: 'Maleta', conferido: true }],
    observacoes: null,
    snapshot: { item: { titulo: 'Furadeira' } },
    termo: { id: 't-1', versao: 2 },
    aceite: {
      userId: 'loc-1',
      aceitoEm: '2026-10-27T13:00:00.000Z',
      declaracoes: [{ id: 'a', texto: 'x' }],
      assinatura: 'abc',
    },
  };

  it('a impressão digital é estável e muda se qualquer parte do documento mudar', () => {
    const hash = calcularHashIntegridade(base);

    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(calcularHashIntegridade({ ...base })).toBe(hash);
    expect(calcularHashIntegridade({ ...base, observacoes: 'alterada' })).not.toBe(hash);
    expect(calcularHashIntegridade({ ...base, numero: 8 })).not.toBe(hash);
    expect(calcularHashIntegridade({ ...base, termo: { id: 't-1', versao: 3 } })).not.toBe(hash);
    expect(
      calcularHashIntegridade({
        ...base,
        aceite: { ...base.aceite, aceitoEm: '2026-10-27T13:00:01.000Z' },
      }),
    ).not.toBe(hash);
  });

  it('a assinatura liga pessoa, termo/versão, momento e declarações (em qualquer ordem)', () => {
    const dados = {
      movimentacaoId: 'm-1',
      userId: 'u-1',
      termoId: 't-1',
      versao: 1,
      aceitoEm: '2026-10-27T13:00:00.000Z',
      declaracoes: ['b', 'a'],
    };
    const assinatura = calcularAssinatura(dados);

    expect(calcularAssinatura({ ...dados, declaracoes: ['a', 'b'] })).toBe(assinatura);
    expect(calcularAssinatura({ ...dados, userId: 'u-2' })).not.toBe(assinatura);
    expect(calcularAssinatura({ ...dados, versao: 2 })).not.toBe(assinatura);
    expect(calcularAssinatura({ ...dados, declaracoes: ['a'] })).not.toBe(assinatura);
  });
});
