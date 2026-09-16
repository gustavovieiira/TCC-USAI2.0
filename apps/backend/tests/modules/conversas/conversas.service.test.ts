import { ConversasService } from '@/modules/conversas/conversas.service';
import { ForbiddenError, NotFoundError } from '@/common/errors';

function buildPrismaMock() {
  return {
    user: { findFirst: jest.fn(), findMany: jest.fn() },
    conversaPrivada: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    mensagemPrivada: { create: jest.fn(), findMany: jest.fn() },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const CONDOMINIO_ID = 'cond-1';
const ANA_ID = 'user-ana';
const BRUNO_ID = 'user-bruno';
const ESTRANHO_ID = 'user-estranho';

const ana = { id: ANA_ID, nome: 'Ana Proprietaria', papel: 'MORADOR' };
const bruno = { id: BRUNO_ID, nome: 'Bruno Locatario', papel: 'MORADOR' };

const conversaBase = {
  id: 'conversa-1',
  postOrigemId: 'post-1',
  participanteAId: ANA_ID,
  participanteBId: BRUNO_ID,
  condominioId: CONDOMINIO_ID,
  createdAt: new Date('2026-09-16'),
  expiraEm: new Date('2026-09-23'),
  participanteA: ana,
  participanteB: bruno,
};

describe('ConversasService.abrirOuContinuar', () => {
  it('rejeita abrir conversa consigo mesmo', async () => {
    const prisma = buildPrismaMock();
    const service = new ConversasService(prisma);

    await expect(
      service.abrirOuContinuar(CONDOMINIO_ID, ANA_ID, { usuarioId: ANA_ID }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(prisma.conversaPrivada.create).not.toHaveBeenCalled();
  });

  it('rejeita usuário inexistente ou de outro condomínio', async () => {
    const prisma = buildPrismaMock();
    prisma.user.findFirst.mockResolvedValue(null);
    const service = new ConversasService(prisma);

    await expect(
      service.abrirOuContinuar(CONDOMINIO_ID, ANA_ID, { usuarioId: 'user-outro-condominio' }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('cria uma nova conversa quando não existe uma ativa entre os dois', async () => {
    const prisma = buildPrismaMock();
    prisma.user.findFirst.mockResolvedValue(bruno);
    prisma.conversaPrivada.findFirst.mockResolvedValue(null);
    prisma.conversaPrivada.create.mockResolvedValue(conversaBase);

    const service = new ConversasService(prisma);
    const result = await service.abrirOuContinuar(CONDOMINIO_ID, ANA_ID, {
      usuarioId: BRUNO_ID,
      postOrigemId: 'post-1',
    });

    expect(prisma.conversaPrivada.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          participanteAId: ANA_ID,
          participanteBId: BRUNO_ID,
          condominioId: CONDOMINIO_ID,
          postOrigemId: 'post-1',
        }),
      }),
    );
    expect(result.outroParticipante).toEqual({
      id: BRUNO_ID,
      nome: 'Bruno Locatario',
      papel: 'MORADOR',
    });
  });

  it('reaproveita uma conversa ativa já existente com a mesma pessoa (em vez de duplicar)', async () => {
    const prisma = buildPrismaMock();
    prisma.user.findFirst.mockResolvedValue(bruno);
    prisma.conversaPrivada.findFirst.mockResolvedValue(conversaBase);

    const service = new ConversasService(prisma);
    const result = await service.abrirOuContinuar(CONDOMINIO_ID, ANA_ID, { usuarioId: BRUNO_ID });

    expect(prisma.conversaPrivada.create).not.toHaveBeenCalled();
    expect(result.id).toBe('conversa-1');
  });

  it('resolve o outro participante corretamente nos dois sentidos', async () => {
    const prisma = buildPrismaMock();
    prisma.user.findFirst.mockResolvedValue(ana);
    prisma.conversaPrivada.findFirst.mockResolvedValue(conversaBase);

    const service = new ConversasService(prisma);
    const result = await service.abrirOuContinuar(CONDOMINIO_ID, BRUNO_ID, { usuarioId: ANA_ID });

    expect(result.outroParticipante.id).toBe(ANA_ID);
  });
});

describe('ConversasService.listarUsuariosDoCondominio', () => {
  it('lista os usuários do condomínio, exceto quem está buscando', async () => {
    const prisma = buildPrismaMock();
    prisma.user.findMany.mockResolvedValue([bruno]);

    const service = new ConversasService(prisma);
    const result = await service.listarUsuariosDoCondominio(CONDOMINIO_ID, ANA_ID);

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { condominioId: CONDOMINIO_ID, id: { not: ANA_ID } },
      }),
    );
    expect(result).toEqual([{ id: BRUNO_ID, nome: 'Bruno Locatario', papel: 'MORADOR' }]);
  });
});

describe('ConversasService.listarMinhas', () => {
  it('lista as conversas do usuário com a última mensagem, expirando as antigas antes', async () => {
    const prisma = buildPrismaMock();
    prisma.conversaPrivada.findMany.mockResolvedValue([
      { ...conversaBase, mensagens: [{ conteudo: 'Oi!', createdAt: new Date('2026-09-16') }] },
    ]);

    const service = new ConversasService(prisma);
    const result = await service.listarMinhas(CONDOMINIO_ID, ANA_ID);

    expect(prisma.conversaPrivada.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ condominioId: CONDOMINIO_ID }) }),
    );
    expect(result).toHaveLength(1);
    expect(result[0].ultimaMensagem).toEqual({
      conteudo: 'Oi!',
      createdAt: new Date('2026-09-16'),
    });
  });
});

describe('ConversasService.buscarPorId / listarMensagens / enviarMensagem', () => {
  it('rejeita conversa inexistente', async () => {
    const prisma = buildPrismaMock();
    prisma.conversaPrivada.findFirst.mockResolvedValue(null);

    const service = new ConversasService(prisma);

    await expect(service.buscarPorId('inexistente', CONDOMINIO_ID, ANA_ID)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('rejeita quem não participa da conversa', async () => {
    const prisma = buildPrismaMock();
    prisma.conversaPrivada.findFirst.mockResolvedValue(conversaBase);

    const service = new ConversasService(prisma);

    await expect(
      service.buscarPorId('conversa-1', CONDOMINIO_ID, ESTRANHO_ID),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('permite que um participante liste as mensagens', async () => {
    const prisma = buildPrismaMock();
    prisma.conversaPrivada.findFirst.mockResolvedValue(conversaBase);
    prisma.mensagemPrivada.findMany.mockResolvedValue([
      {
        id: 'msg-1',
        conversaId: 'conversa-1',
        remetenteId: ANA_ID,
        conteudo: 'Oi',
        createdAt: new Date(),
      },
    ]);

    const service = new ConversasService(prisma);
    const result = await service.listarMensagens('conversa-1', CONDOMINIO_ID, BRUNO_ID);

    expect(result).toHaveLength(1);
  });

  it('permite que um participante envie mensagem', async () => {
    const prisma = buildPrismaMock();
    prisma.conversaPrivada.findFirst.mockResolvedValue(conversaBase);
    prisma.mensagemPrivada.create.mockResolvedValue({
      id: 'msg-1',
      conversaId: 'conversa-1',
      remetenteId: BRUNO_ID,
      conteudo: 'Consigo te ajudar!',
      createdAt: new Date(),
    });

    const service = new ConversasService(prisma);
    const result = await service.enviarMensagem('conversa-1', CONDOMINIO_ID, BRUNO_ID, {
      conteudo: 'Consigo te ajudar!',
    });

    expect(result.conteudo).toBe('Consigo te ajudar!');
  });

  it('bloqueia quem não participa de enviar mensagem', async () => {
    const prisma = buildPrismaMock();
    prisma.conversaPrivada.findFirst.mockResolvedValue(conversaBase);

    const service = new ConversasService(prisma);

    await expect(
      service.enviarMensagem('conversa-1', CONDOMINIO_ID, ESTRANHO_ID, { conteudo: 'Oi' }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(prisma.mensagemPrivada.create).not.toHaveBeenCalled();
  });
});

describe('ConversasService.verificarParticipante', () => {
  it('não lança para quem participa', async () => {
    const prisma = buildPrismaMock();
    prisma.conversaPrivada.findFirst.mockResolvedValue(conversaBase);

    const service = new ConversasService(prisma);

    await expect(
      service.verificarParticipante('conversa-1', CONDOMINIO_ID, ANA_ID),
    ).resolves.toBeUndefined();
  });

  it('lança pra quem não participa', async () => {
    const prisma = buildPrismaMock();
    prisma.conversaPrivada.findFirst.mockResolvedValue(conversaBase);

    const service = new ConversasService(prisma);

    await expect(
      service.verificarParticipante('conversa-1', CONDOMINIO_ID, ESTRANHO_ID),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
