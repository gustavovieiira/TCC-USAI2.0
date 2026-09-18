import { SindicoService } from '@/modules/sindico/sindico.service';
import { ForbiddenError, NotFoundError } from '@/common/errors';

function buildPrismaMock() {
  return {
    user: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    locacao: { findMany: jest.fn() },
    condominio: { findUnique: jest.fn(), update: jest.fn() },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const CONDOMINIO_ID = 'cond-1';

const condominioBase = {
  id: CONDOMINIO_ID,
  nome: 'Residencial Jardim Europa',
  linkSlug: 'residencial-jardim-europa',
  pin: '1234',
  ativo: true,
  createdAt: new Date('2026-09-01'),
  updatedAt: new Date('2026-09-01'),
};

const moradorBase = {
  id: 'user-1',
  nome: 'Ana Proprietária',
  email: 'ana@example.com',
  senhaHash: 'hash',
  cpf: null,
  papel: 'MORADOR',
  apartamento: '101',
  chavePix: null,
  condominioId: CONDOMINIO_ID,
  createdAt: new Date('2026-09-01'),
  updatedAt: new Date('2026-09-01'),
};

const locacaoAtivaBase = {
  id: 'locacao-1',
  itemId: 'item-1',
  locatarioId: 'user-2',
  dataInicio: new Date('2026-10-01'),
  dataFim: new Date('2026-10-03'),
  valorTotal: 40 as unknown as number,
  status: 'APROVADA',
  createdAt: new Date('2026-09-15'),
  updatedAt: new Date('2026-09-15'),
  item: { id: 'item-1', titulo: 'Furadeira Bosch', ownerId: 'user-1' },
  locatario: { id: 'user-2', nome: 'Bruno Locatário' },
};

describe('SindicoService.listarMoradores', () => {
  it('lista apenas moradores ativos do condomínio do síndico', async () => {
    const prisma = buildPrismaMock();
    prisma.user.findMany.mockResolvedValue([moradorBase]);

    const service = new SindicoService(prisma);
    const result = await service.listarMoradores(CONDOMINIO_ID);

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { condominioId: CONDOMINIO_ID, papel: 'MORADOR', ativo: true },
      }),
    );
    expect(result).toHaveLength(1);
    expect(result[0]).not.toHaveProperty('senhaHash');
  });
});

describe('SindicoService.removerMorador', () => {
  it('desativa (soft delete) um morador do próprio condomínio', async () => {
    const prisma = buildPrismaMock();
    prisma.user.findUnique.mockResolvedValue(moradorBase);

    const service = new SindicoService(prisma);
    await service.removerMorador(CONDOMINIO_ID, moradorBase.id);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: moradorBase.id },
      data: { ativo: false },
    });
  });

  it('rejeita remover morador inexistente', async () => {
    const prisma = buildPrismaMock();
    prisma.user.findUnique.mockResolvedValue(null);

    const service = new SindicoService(prisma);

    await expect(service.removerMorador(CONDOMINIO_ID, 'inexistente')).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('rejeita remover morador de outro condomínio', async () => {
    const prisma = buildPrismaMock();
    prisma.user.findUnique.mockResolvedValue({ ...moradorBase, condominioId: 'outro-cond' });

    const service = new SindicoService(prisma);

    await expect(service.removerMorador(CONDOMINIO_ID, moradorBase.id)).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('rejeita remover uma conta que não é de morador (ex.: síndico)', async () => {
    const prisma = buildPrismaMock();
    prisma.user.findUnique.mockResolvedValue({ ...moradorBase, papel: 'SINDICO' });

    const service = new SindicoService(prisma);

    await expect(service.removerMorador(CONDOMINIO_ID, moradorBase.id)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

describe('SindicoService.listarLocacoesAtivas', () => {
  it('lista locações que ocupam o período, escopadas pelo condomínio', async () => {
    const prisma = buildPrismaMock();
    prisma.locacao.findMany.mockResolvedValue([locacaoAtivaBase]);

    const service = new SindicoService(prisma);
    const result = await service.listarLocacoesAtivas(CONDOMINIO_ID);

    expect(prisma.locacao.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ item: { condominioId: CONDOMINIO_ID } }),
      }),
    );
    expect(result[0].item.titulo).toBe('Furadeira Bosch');
    expect(result[0].locatario.nome).toBe('Bruno Locatário');
  });
});

describe('SindicoService.buscarCondominio', () => {
  it('retorna os dados do condomínio', async () => {
    const prisma = buildPrismaMock();
    prisma.condominio.findUnique.mockResolvedValue(condominioBase);

    const service = new SindicoService(prisma);
    const result = await service.buscarCondominio(CONDOMINIO_ID);

    expect(result.linkSlug).toBe('residencial-jardim-europa');
    expect(result.pin).toBe('1234');
  });

  it('rejeita condomínio inexistente', async () => {
    const prisma = buildPrismaMock();
    prisma.condominio.findUnique.mockResolvedValue(null);

    const service = new SindicoService(prisma);

    await expect(service.buscarCondominio('inexistente')).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('SindicoService.atualizarPin', () => {
  it('síndico atualiza o PIN do próprio condomínio', async () => {
    const prisma = buildPrismaMock();
    prisma.condominio.findUnique.mockResolvedValue(condominioBase);
    prisma.condominio.update.mockResolvedValue({ ...condominioBase, pin: '5678' });

    const service = new SindicoService(prisma);
    const result = await service.atualizarPin(CONDOMINIO_ID, { pin: '5678' });

    expect(prisma.condominio.update).toHaveBeenCalledWith({
      where: { id: CONDOMINIO_ID },
      data: { pin: '5678' },
    });
    expect(result.pin).toBe('5678');
  });

  it('rejeita atualizar PIN de condomínio inexistente', async () => {
    const prisma = buildPrismaMock();
    prisma.condominio.findUnique.mockResolvedValue(null);

    const service = new SindicoService(prisma);

    await expect(service.atualizarPin('inexistente', { pin: '5678' })).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(prisma.condominio.update).not.toHaveBeenCalled();
  });
});
