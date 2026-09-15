import { AdminService } from '@/modules/admin/admin.service';
import { ConflictError, NotFoundError } from '@/common/errors';

function buildPrismaMock() {
  return {
    condominio: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    user: { findUnique: jest.fn(), create: jest.fn() },
    solicitacaoSaque: { aggregate: jest.fn() },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const condominioBase = {
  id: 'cond-1',
  nome: 'Residencial Jardim Europa',
  linkSlug: 'residencial-jardim-europa',
  pin: '1234',
  ativo: true,
  createdAt: new Date('2026-09-01'),
  updatedAt: new Date('2026-09-01'),
};

describe('AdminService.criarCondominio', () => {
  it('cria um condomínio novo na plataforma', async () => {
    const prisma = buildPrismaMock();
    prisma.condominio.findUnique.mockResolvedValue(null);
    prisma.condominio.create.mockResolvedValue(condominioBase);

    const service = new AdminService(prisma);
    const result = await service.criarCondominio({
      nome: 'Residencial Jardim Europa',
      linkSlug: 'residencial-jardim-europa',
      pin: '1234',
    });

    expect(result.linkSlug).toBe('residencial-jardim-europa');
  });

  it('rejeita link de acesso já usado por outro condomínio', async () => {
    const prisma = buildPrismaMock();
    prisma.condominio.findUnique.mockResolvedValue(condominioBase);

    const service = new AdminService(prisma);

    await expect(
      service.criarCondominio({
        nome: 'Outro',
        linkSlug: 'residencial-jardim-europa',
        pin: '1234',
      }),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(prisma.condominio.create).not.toHaveBeenCalled();
  });
});

describe('AdminService.listarCondominios', () => {
  it('filtra por ativo quando informado', async () => {
    const prisma = buildPrismaMock();
    prisma.condominio.findMany.mockResolvedValue([condominioBase]);

    const service = new AdminService(prisma);
    await service.listarCondominios({ ativo: true });

    expect(prisma.condominio.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ativo: true } }),
    );
  });
});

describe('AdminService.atualizarCondominio', () => {
  it('atualiza campos do condomínio', async () => {
    const prisma = buildPrismaMock();
    prisma.condominio.findUnique.mockResolvedValue(condominioBase);
    prisma.condominio.update.mockResolvedValue({ ...condominioBase, ativo: false });

    const service = new AdminService(prisma);
    const result = await service.atualizarCondominio('cond-1', { ativo: false });

    expect(result.ativo).toBe(false);
  });

  it('rejeita atualizar condomínio inexistente', async () => {
    const prisma = buildPrismaMock();
    prisma.condominio.findUnique.mockResolvedValue(null);

    const service = new AdminService(prisma);

    await expect(
      service.atualizarCondominio('inexistente', { ativo: false }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('AdminService.criarSindico', () => {
  it('cria a conta de síndico vinculada ao condomínio', async () => {
    const prisma = buildPrismaMock();
    prisma.condominio.findUnique.mockResolvedValue(condominioBase);
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'user-sindico',
      nome: 'Síndico Teste',
      email: 'sindico@example.com',
      papel: 'SINDICO',
      condominioId: 'cond-1',
    });

    const service = new AdminService(prisma);
    const result = await service.criarSindico({
      nome: 'Síndico Teste',
      email: 'sindico@example.com',
      senha: 'senha-forte-123',
      condominioId: 'cond-1',
    });

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ papel: 'SINDICO', condominioId: 'cond-1' }),
      }),
    );
    expect(result).not.toHaveProperty('senhaHash');
    expect(result.email).toBe('sindico@example.com');
  });

  it('rejeita condomínio inexistente', async () => {
    const prisma = buildPrismaMock();
    prisma.condominio.findUnique.mockResolvedValue(null);

    const service = new AdminService(prisma);

    await expect(
      service.criarSindico({
        nome: 'X',
        email: 'x@example.com',
        senha: 'senha-forte-123',
        condominioId: 'inexistente',
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejeita e-mail já cadastrado', async () => {
    const prisma = buildPrismaMock();
    prisma.condominio.findUnique.mockResolvedValue(condominioBase);
    prisma.user.findUnique.mockResolvedValue({ id: 'existente' });

    const service = new AdminService(prisma);

    await expect(
      service.criarSindico({
        nome: 'X',
        email: 'ja-existe@example.com',
        senha: 'senha-forte-123',
        condominioId: 'cond-1',
      }),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});

describe('AdminService.resumoFinanceiro', () => {
  it('agrega os saques por status e conta condomínios ativos', async () => {
    const prisma = buildPrismaMock();
    prisma.solicitacaoSaque.aggregate
      .mockResolvedValueOnce({ _count: 2, _sum: { valor: 150 } })
      .mockResolvedValueOnce({ _count: 5, _sum: { valor: 800 } })
      .mockResolvedValueOnce({ _count: 1, _sum: { valor: 50 } });
    prisma.condominio.count.mockResolvedValue(3);

    const service = new AdminService(prisma);
    const result = await service.resumoFinanceiro();

    expect(result).toEqual({
      saques: {
        pendente: { quantidade: 2, valorTotal: 150 },
        aprovado: { quantidade: 5, valorTotal: 800 },
        rejeitado: { quantidade: 1, valorTotal: 50 },
      },
      condominiosAtivos: 3,
    });
  });
});
