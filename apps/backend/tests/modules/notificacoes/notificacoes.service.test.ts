import { NotificacoesService } from '@/modules/notificacoes/notificacoes.service';
import { NotFoundError } from '@/common/errors';
import { emitirParaUsuario } from '@/realtime/emitter';

jest.mock('@/realtime/emitter', () => ({ emitirParaUsuario: jest.fn() }));

function buildPrismaMock() {
  return {
    notificacao: {
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    user: { findMany: jest.fn().mockResolvedValue([]) },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const USER_ID = 'user-1';

const registro = {
  id: 'notif-1',
  userId: USER_ID,
  tipo: 'LOCACAO_APROVADA',
  titulo: 'Seu pedido foi aprovado',
  mensagem: 'Pague o PIX',
  link: '/locacoes',
  lida: false,
  createdAt: new Date('2026-10-19T12:00:00Z'),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('NotificacoesService.notificar', () => {
  it('grava a notificação e avisa o usuário em tempo real (sem expor userId no payload)', async () => {
    const prisma = buildPrismaMock();
    prisma.notificacao.create.mockResolvedValue(registro);

    await new NotificacoesService(prisma).notificar({
      userId: USER_ID,
      tipo: 'LOCACAO_APROVADA',
      titulo: registro.titulo,
      mensagem: registro.mensagem,
      link: '/locacoes',
    });

    expect(prisma.notificacao.create).toHaveBeenCalledWith({
      data: {
        userId: USER_ID,
        tipo: 'LOCACAO_APROVADA',
        titulo: registro.titulo,
        mensagem: registro.mensagem,
        link: '/locacoes',
      },
    });
    expect(emitirParaUsuario).toHaveBeenCalledWith(
      USER_ID,
      'notificacao:nova',
      expect.objectContaining({ id: 'notif-1', lida: false }),
    );
    expect((emitirParaUsuario as jest.Mock).mock.calls[0][2]).not.toHaveProperty('userId');
  });

  it('nunca lança: falha ao gravar vira log e não derruba quem chamou', async () => {
    const prisma = buildPrismaMock();
    prisma.notificacao.create.mockRejectedValue(new Error('banco fora do ar'));

    await expect(
      new NotificacoesService(prisma).notificar({
        userId: USER_ID,
        tipo: 'SAQUE_APROVADO',
        titulo: 'x',
        mensagem: 'y',
      }),
    ).resolves.toBeUndefined();
    expect(emitirParaUsuario).not.toHaveBeenCalled();
  });
});

describe('NotificacoesService.notificarAdmins', () => {
  it('cria uma notificação pra cada Admin ativo', async () => {
    const prisma = buildPrismaMock();
    prisma.user.findMany.mockResolvedValue([{ id: 'admin-1' }, { id: 'admin-2' }]);
    prisma.notificacao.create.mockResolvedValue(registro);

    await new NotificacoesService(prisma).notificarAdmins({
      tipo: 'SAQUE_SOLICITADO',
      titulo: 'Novo pedido de saque',
      mensagem: 'x',
      link: '/admin',
    });

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { papel: 'ADMIN', ativo: true },
      select: { id: true },
    });
    expect(prisma.notificacao.create).toHaveBeenCalledTimes(2);
    expect(prisma.notificacao.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: 'admin-2', tipo: 'SAQUE_SOLICITADO' }),
    });
  });

  it('não lança quando a busca de admins falha', async () => {
    const prisma = buildPrismaMock();
    prisma.user.findMany.mockRejectedValue(new Error('falha'));

    await expect(
      new NotificacoesService(prisma).notificarAdmins({
        tipo: 'SAQUE_SOLICITADO',
        titulo: 'x',
        mensagem: 'y',
      }),
    ).resolves.toBeUndefined();
  });
});

describe('NotificacoesService.listar', () => {
  it('lista só as do usuário, mais novas primeiro, com a contagem de não lidas', async () => {
    const prisma = buildPrismaMock();
    prisma.notificacao.findMany.mockResolvedValue([registro]);
    prisma.notificacao.count.mockResolvedValue(3);

    const lista = await new NotificacoesService(prisma).listar(USER_ID);

    expect(prisma.notificacao.findMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    expect(prisma.notificacao.count).toHaveBeenCalledWith({
      where: { userId: USER_ID, lida: false },
    });
    expect(lista.naoLidas).toBe(3);
    expect(lista.notificacoes[0]).toMatchObject({ id: 'notif-1', titulo: registro.titulo });
    expect(lista.notificacoes[0]).not.toHaveProperty('userId');
  });
});

describe('NotificacoesService.marcarComoLida', () => {
  it('marca como lida só se a notificação for do usuário', async () => {
    const prisma = buildPrismaMock();
    prisma.notificacao.updateMany.mockResolvedValue({ count: 1 });

    await new NotificacoesService(prisma).marcarComoLida('notif-1', USER_ID);

    expect(prisma.notificacao.updateMany).toHaveBeenCalledWith({
      where: { id: 'notif-1', userId: USER_ID },
      data: { lida: true },
    });
  });

  it('retorna 404 quando não existe ou é de outra pessoa (não vaza a existência)', async () => {
    const prisma = buildPrismaMock();
    prisma.notificacao.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      new NotificacoesService(prisma).marcarComoLida('notif-alheia', USER_ID),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('NotificacoesService.marcarTodasComoLidas', () => {
  it('marca todas as não lidas do usuário', async () => {
    const prisma = buildPrismaMock();
    prisma.notificacao.updateMany.mockResolvedValue({ count: 4 });

    await new NotificacoesService(prisma).marcarTodasComoLidas(USER_ID);

    expect(prisma.notificacao.updateMany).toHaveBeenCalledWith({
      where: { userId: USER_ID, lida: false },
      data: { lida: true },
    });
  });
});

describe('NotificacoesService.removerAntigas', () => {
  it('apaga as com mais de 30 dias e devolve quantas saíram', async () => {
    const prisma = buildPrismaMock();
    prisma.notificacao.deleteMany.mockResolvedValue({ count: 7 });

    const removidas = await new NotificacoesService(prisma).removerAntigas();

    expect(removidas).toBe(7);
    const { where } = prisma.notificacao.deleteMany.mock.calls[0][0];
    const diasAtras = (Date.now() - where.createdAt.lt.getTime()) / (24 * 60 * 60 * 1000);
    expect(Math.round(diasAtras)).toBe(30);
  });
});
