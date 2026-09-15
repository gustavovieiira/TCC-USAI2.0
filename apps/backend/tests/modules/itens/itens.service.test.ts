import { ItensService } from '@/modules/itens/itens.service';
import { ForbiddenError, NotFoundError } from '@/common/errors';

function buildPrismaMock() {
  return {
    item: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const CONDOMINIO_ID = 'cond-1';
const OWNER_ID = 'user-1';

const itemBase = {
  id: 'item-1',
  titulo: 'Furadeira Bosch',
  descricao: 'Furadeira de impacto em ótimo estado',
  categoria: 'Ferramentas',
  valorDiaria: 15 as unknown as number,
  ativo: true,
  ownerId: OWNER_ID,
  condominioId: CONDOMINIO_ID,
  createdAt: new Date('2026-09-01'),
  updatedAt: new Date('2026-09-01'),
  imagens: [{ id: 'img-1', itemId: 'item-1', url: 'https://cdn.example.com/furadeira.jpg' }],
};

describe('ItensService.criar', () => {
  it('publica um item vinculado ao condomínio e ao dono autenticado (RF06)', async () => {
    const prisma = buildPrismaMock();
    prisma.item.create.mockResolvedValue(itemBase);

    const service = new ItensService(prisma);
    const result = await service.criar(CONDOMINIO_ID, OWNER_ID, {
      titulo: 'Furadeira Bosch',
      descricao: 'Furadeira de impacto em ótimo estado',
      categoria: 'Ferramentas',
      valorDiaria: 15,
      imagens: ['https://cdn.example.com/furadeira.jpg'],
    });

    expect(prisma.item.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ ownerId: OWNER_ID, condominioId: CONDOMINIO_ID }),
      }),
    );
    expect(result.valorDiaria).toBe(15);
    expect(result.imagens).toEqual(['https://cdn.example.com/furadeira.jpg']);
  });
});

describe('ItensService.listarPorCondominio', () => {
  it('lista apenas itens ativos do condomínio (RF08/RN02)', async () => {
    const prisma = buildPrismaMock();
    prisma.item.findMany.mockResolvedValue([itemBase]);

    const service = new ItensService(prisma);
    const result = await service.listarPorCondominio(CONDOMINIO_ID);

    expect(prisma.item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ condominioId: CONDOMINIO_ID, ativo: true }),
      }),
    );
    expect(result).toHaveLength(1);
  });

  it('filtra por categoria quando informado', async () => {
    const prisma = buildPrismaMock();
    prisma.item.findMany.mockResolvedValue([]);

    const service = new ItensService(prisma);
    await service.listarPorCondominio(CONDOMINIO_ID, { categoria: 'Eletrodomésticos' });

    expect(prisma.item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ categoria: 'Eletrodomésticos' }),
      }),
    );
  });
});

describe('ItensService.atualizar', () => {
  it('permite que o proprietário edite o próprio item (RF07)', async () => {
    const prisma = buildPrismaMock();
    prisma.item.findUnique.mockResolvedValue(itemBase);
    prisma.item.update.mockResolvedValue({ ...itemBase, titulo: 'Furadeira Bosch Nova' });

    const service = new ItensService(prisma);
    const result = await service.atualizar('item-1', OWNER_ID, { titulo: 'Furadeira Bosch Nova' });

    expect(result.titulo).toBe('Furadeira Bosch Nova');
  });

  it('rejeita edição por quem não é o proprietário (RN04)', async () => {
    const prisma = buildPrismaMock();
    prisma.item.findUnique.mockResolvedValue(itemBase);

    const service = new ItensService(prisma);

    await expect(
      service.atualizar('item-1', 'outro-usuario', { titulo: 'Hackeado' }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('rejeita edição de item inexistente', async () => {
    const prisma = buildPrismaMock();
    prisma.item.findUnique.mockResolvedValue(null);

    const service = new ItensService(prisma);

    await expect(
      service.atualizar('item-inexistente', OWNER_ID, { titulo: 'X' }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('ItensService.remover', () => {
  it('desativa o item em vez de apagar, preservando histórico', async () => {
    const prisma = buildPrismaMock();
    prisma.item.findUnique.mockResolvedValue(itemBase);
    prisma.item.update.mockResolvedValue({ ...itemBase, ativo: false });

    const service = new ItensService(prisma);
    await service.remover('item-1', OWNER_ID);

    expect(prisma.item.update).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: { ativo: false },
    });
  });

  it('rejeita remoção por quem não é o proprietário', async () => {
    const prisma = buildPrismaMock();
    prisma.item.findUnique.mockResolvedValue(itemBase);

    const service = new ItensService(prisma);

    await expect(service.remover('item-1', 'outro-usuario')).rejects.toBeInstanceOf(ForbiddenError);
  });
});
