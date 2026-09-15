import { MensagensService } from '@/modules/mensagens/mensagens.service';
import { ForbiddenError, NotFoundError } from '@/common/errors';

function buildPrismaMock() {
  return {
    locacao: { findUnique: jest.fn() },
    mensagem: { create: jest.fn(), findMany: jest.fn() },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const LOCACAO_ID = 'locacao-1';
const LOCATARIO_ID = 'user-locatario';
const OWNER_ID = 'user-dono';
const ESTRANHO_ID = 'user-estranho';

const locacaoComItem = {
  id: LOCACAO_ID,
  itemId: 'item-1',
  locatarioId: LOCATARIO_ID,
  dataInicio: new Date('2026-10-01'),
  dataFim: new Date('2026-10-03'),
  valorTotal: 40,
  status: 'APROVADA',
  createdAt: new Date('2026-09-15'),
  updatedAt: new Date('2026-09-15'),
  item: { id: 'item-1', ownerId: OWNER_ID },
};

const mensagemBase = {
  id: 'mensagem-1',
  locacaoId: LOCACAO_ID,
  remetenteId: LOCATARIO_ID,
  conteudo: 'Posso pegar o item às 18h?',
  createdAt: new Date('2026-09-15'),
};

describe('MensagensService.verificarParticipante', () => {
  it('rejeita locação inexistente', async () => {
    const prisma = buildPrismaMock();
    prisma.locacao.findUnique.mockResolvedValue(null);

    const service = new MensagensService(prisma);

    await expect(
      service.verificarParticipante('locacao-inexistente', LOCATARIO_ID),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejeita quem não é locatário nem dono do item', async () => {
    const prisma = buildPrismaMock();
    prisma.locacao.findUnique.mockResolvedValue(locacaoComItem);

    const service = new MensagensService(prisma);

    await expect(service.verificarParticipante(LOCACAO_ID, ESTRANHO_ID)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });
});

describe('MensagensService.enviar', () => {
  it('permite que o locatário envie mensagem na própria locação', async () => {
    const prisma = buildPrismaMock();
    prisma.locacao.findUnique.mockResolvedValue(locacaoComItem);
    prisma.mensagem.create.mockResolvedValue(mensagemBase);

    const service = new MensagensService(prisma);
    const result = await service.enviar(LOCACAO_ID, LOCATARIO_ID, {
      conteudo: 'Posso pegar o item às 18h?',
    });

    expect(prisma.mensagem.create).toHaveBeenCalledWith({
      data: {
        locacaoId: LOCACAO_ID,
        remetenteId: LOCATARIO_ID,
        conteudo: 'Posso pegar o item às 18h?',
      },
    });
    expect(result.conteudo).toBe('Posso pegar o item às 18h?');
  });

  it('permite que o proprietário do item envie mensagem', async () => {
    const prisma = buildPrismaMock();
    prisma.locacao.findUnique.mockResolvedValue(locacaoComItem);
    prisma.mensagem.create.mockResolvedValue({ ...mensagemBase, remetenteId: OWNER_ID });

    const service = new MensagensService(prisma);
    const result = await service.enviar(LOCACAO_ID, OWNER_ID, { conteudo: 'Pode ser às 18h.' });

    expect(result.remetenteId).toBe(OWNER_ID);
  });

  it('bloqueia quem não participa da locação', async () => {
    const prisma = buildPrismaMock();
    prisma.locacao.findUnique.mockResolvedValue(locacaoComItem);

    const service = new MensagensService(prisma);

    await expect(
      service.enviar(LOCACAO_ID, ESTRANHO_ID, { conteudo: 'Oi' }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(prisma.mensagem.create).not.toHaveBeenCalled();
  });
});

describe('MensagensService.listarPorLocacao', () => {
  it('lista o histórico em ordem cronológica para um participante', async () => {
    const prisma = buildPrismaMock();
    prisma.locacao.findUnique.mockResolvedValue(locacaoComItem);
    prisma.mensagem.findMany.mockResolvedValue([mensagemBase]);

    const service = new MensagensService(prisma);
    const result = await service.listarPorLocacao(LOCACAO_ID, OWNER_ID);

    expect(prisma.mensagem.findMany).toHaveBeenCalledWith({
      where: { locacaoId: LOCACAO_ID },
      orderBy: { createdAt: 'asc' },
    });
    expect(result).toHaveLength(1);
  });

  it('bloqueia quem não participa da locação', async () => {
    const prisma = buildPrismaMock();
    prisma.locacao.findUnique.mockResolvedValue(locacaoComItem);

    const service = new MensagensService(prisma);

    await expect(service.listarPorLocacao(LOCACAO_ID, ESTRANHO_ID)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });
});
