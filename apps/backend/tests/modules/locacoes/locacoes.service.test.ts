import { LocacoesService } from '@/modules/locacoes/locacoes.service';
import { AppError, ForbiddenError, NotFoundError } from '@/common/errors';

function buildPrismaMock() {
  return {
    item: { findFirst: jest.fn() },
    locacao: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const CONDOMINIO_ID = 'cond-1';
const OWNER_ID = 'owner-1';
const LOCATARIO_ID = 'locatario-1';

const itemDisponivel = {
  id: 'item-1',
  titulo: 'Furadeira Bosch',
  valorDiaria: 20 as unknown as number,
  ativo: true,
  ownerId: OWNER_ID,
  condominioId: CONDOMINIO_ID,
};

const inputPadrao = {
  itemId: 'item-1',
  dataInicio: new Date('2026-10-01'),
  dataFim: new Date('2026-10-03'),
};

const locacaoBase = {
  id: 'locacao-1',
  itemId: 'item-1',
  locatarioId: LOCATARIO_ID,
  dataInicio: inputPadrao.dataInicio,
  dataFim: inputPadrao.dataFim,
  valorTotal: 40 as unknown as number,
  status: 'PENDENTE' as const,
  createdAt: new Date('2026-09-15'),
  updatedAt: new Date('2026-09-15'),
  item: itemDisponivel,
};

describe('LocacoesService.solicitar', () => {
  it('cria a locação calculando o valor total pelo período (RF10/RF11)', async () => {
    const prisma = buildPrismaMock();
    prisma.item.findFirst.mockResolvedValue(itemDisponivel);
    prisma.locacao.findFirst.mockResolvedValue(null);
    prisma.locacao.create.mockResolvedValue(locacaoBase);

    const service = new LocacoesService(prisma);
    const result = await service.solicitar(CONDOMINIO_ID, LOCATARIO_ID, inputPadrao);

    expect(prisma.locacao.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ valorTotal: 40, status: 'PENDENTE' }),
      }),
    );
    expect(result.valorTotal).toBe(40);
    expect(result.status).toBe('PENDENTE');
  });

  it('rejeita quando o item não existe ou não pertence ao condomínio (RN02)', async () => {
    const prisma = buildPrismaMock();
    prisma.item.findFirst.mockResolvedValue(null);

    const service = new LocacoesService(prisma);

    await expect(
      service.solicitar(CONDOMINIO_ID, LOCATARIO_ID, inputPadrao),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejeita quando o próprio dono tenta locar o item (RN04)', async () => {
    const prisma = buildPrismaMock();
    prisma.item.findFirst.mockResolvedValue(itemDisponivel);

    const service = new LocacoesService(prisma);

    await expect(service.solicitar(CONDOMINIO_ID, OWNER_ID, inputPadrao)).rejects.toBeInstanceOf(
      AppError,
    );
  });

  it('rejeita quando o item já está ocupado no período', async () => {
    const prisma = buildPrismaMock();
    prisma.item.findFirst.mockResolvedValue(itemDisponivel);
    prisma.locacao.findFirst.mockResolvedValue(locacaoBase);

    const service = new LocacoesService(prisma);

    await expect(
      service.solicitar(CONDOMINIO_ID, LOCATARIO_ID, inputPadrao),
    ).rejects.toBeInstanceOf(AppError);
  });
});

describe('LocacoesService.aprovar', () => {
  it('permite que o proprietário aprove uma locação pendente (RF12)', async () => {
    const prisma = buildPrismaMock();
    prisma.locacao.findUnique.mockResolvedValue(locacaoBase);
    prisma.locacao.update.mockResolvedValue({ ...locacaoBase, status: 'APROVADA' });

    const service = new LocacoesService(prisma);
    const result = await service.aprovar('locacao-1', OWNER_ID);

    expect(result.status).toBe('APROVADA');
  });

  it('rejeita aprovação por quem não é o proprietário do item', async () => {
    const prisma = buildPrismaMock();
    prisma.locacao.findUnique.mockResolvedValue(locacaoBase);

    const service = new LocacoesService(prisma);

    await expect(service.aprovar('locacao-1', 'outro-usuario')).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it('rejeita aprovação de locação que não está mais pendente', async () => {
    const prisma = buildPrismaMock();
    prisma.locacao.findUnique.mockResolvedValue({ ...locacaoBase, status: 'CANCELADA' });

    const service = new LocacoesService(prisma);

    await expect(service.aprovar('locacao-1', OWNER_ID)).rejects.toBeInstanceOf(AppError);
  });

  it('rejeita quando a locação não existe', async () => {
    const prisma = buildPrismaMock();
    prisma.locacao.findUnique.mockResolvedValue(null);

    const service = new LocacoesService(prisma);

    await expect(service.aprovar('inexistente', OWNER_ID)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('LocacoesService.rejeitar', () => {
  it('permite que o proprietário rejeite uma locação pendente, cancelando-a', async () => {
    const prisma = buildPrismaMock();
    prisma.locacao.findUnique.mockResolvedValue(locacaoBase);
    prisma.locacao.update.mockResolvedValue({ ...locacaoBase, status: 'CANCELADA' });

    const service = new LocacoesService(prisma);
    const result = await service.rejeitar('locacao-1', OWNER_ID);

    expect(result.status).toBe('CANCELADA');
  });

  it('rejeita quando quem chama não é o proprietário', async () => {
    const prisma = buildPrismaMock();
    prisma.locacao.findUnique.mockResolvedValue(locacaoBase);

    const service = new LocacoesService(prisma);

    await expect(service.rejeitar('locacao-1', 'outro-usuario')).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });
});

describe('LocacoesService.listarComoLocatario / listarComoProprietario', () => {
  it('lista locações do locatário escopadas ao condomínio', async () => {
    const prisma = buildPrismaMock();
    prisma.locacao.findMany.mockResolvedValue([locacaoBase]);

    const service = new LocacoesService(prisma);
    const result = await service.listarComoLocatario(CONDOMINIO_ID, LOCATARIO_ID);

    expect(prisma.locacao.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { locatarioId: LOCATARIO_ID, item: { condominioId: CONDOMINIO_ID } },
      }),
    );
    expect(result).toHaveLength(1);
  });

  it('lista locações recebidas pelo proprietário escopadas ao condomínio', async () => {
    const prisma = buildPrismaMock();
    prisma.locacao.findMany.mockResolvedValue([locacaoBase]);

    const service = new LocacoesService(prisma);
    const result = await service.listarComoProprietario(CONDOMINIO_ID, OWNER_ID);

    expect(prisma.locacao.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { item: { condominioId: CONDOMINIO_ID, ownerId: OWNER_ID } },
      }),
    );
    expect(result).toHaveLength(1);
  });
});
