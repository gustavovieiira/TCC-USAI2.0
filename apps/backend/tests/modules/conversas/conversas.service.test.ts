import { ConversasService } from '@/modules/conversas/conversas.service';
import { ForbiddenError, NotFoundError } from '@/common/errors';

function buildPrismaMock() {
  return {
    user: { findFirst: jest.fn(), findMany: jest.fn() },
    conversaPrivada: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    mensagemPrivada: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    locacao: { findUnique: jest.fn() },
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

describe('ConversasService.buscarOutroParticipanteId', () => {
  it('retorna o participante B quando quem pergunta é o participante A', async () => {
    const prisma = buildPrismaMock();
    prisma.conversaPrivada.findUnique.mockResolvedValue({
      participanteAId: ANA_ID,
      participanteBId: BRUNO_ID,
    });

    const service = new ConversasService(prisma);
    const result = await service.buscarOutroParticipanteId('conversa-1', ANA_ID);

    expect(result).toBe(BRUNO_ID);
  });

  it('retorna o participante A quando quem pergunta é o participante B', async () => {
    const prisma = buildPrismaMock();
    prisma.conversaPrivada.findUnique.mockResolvedValue({
      participanteAId: ANA_ID,
      participanteBId: BRUNO_ID,
    });

    const service = new ConversasService(prisma);
    const result = await service.buscarOutroParticipanteId('conversa-1', BRUNO_ID);

    expect(result).toBe(ANA_ID);
  });

  it('retorna null para conversa inexistente', async () => {
    const prisma = buildPrismaMock();
    prisma.conversaPrivada.findUnique.mockResolvedValue(null);

    const service = new ConversasService(prisma);
    const result = await service.buscarOutroParticipanteId('inexistente', ANA_ID);

    expect(result).toBeNull();
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

describe('ConversasService.abrirPorLocacao (chat da locação)', () => {
  const LOCATARIO_ID = BRUNO_ID;
  const DONO_ID = ANA_ID;

  const locacao = {
    id: 'locacao-1',
    locatarioId: LOCATARIO_ID,
    status: 'APROVADA',
    item: { id: 'item-1', titulo: 'Projetor', ownerId: DONO_ID, condominioId: CONDOMINIO_ID },
  };

  const conversaDaLocacao = {
    ...conversaBase,
    id: 'conversa-loc',
    postOrigemId: null,
    locacaoId: 'locacao-1',
    participanteAId: LOCATARIO_ID,
    participanteBId: DONO_ID,
    participanteA: bruno,
    participanteB: ana,
    expiraEm: null,
    participanteALidoEm: null,
    participanteBLidoEm: null,
    locacao,
    mensagens: [],
  };

  it('o locatário abre o chat: cria (ou reaproveita) a conversa única da locação, sem expiração', async () => {
    const prisma = buildPrismaMock();
    prisma.locacao.findUnique.mockResolvedValue(locacao);
    prisma.conversaPrivada.upsert.mockResolvedValue(conversaDaLocacao);

    const result = await new ConversasService(prisma).abrirPorLocacao(
      CONDOMINIO_ID,
      LOCATARIO_ID,
      'locacao-1',
    );

    expect(prisma.conversaPrivada.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { locacaoId: 'locacao-1' },
        update: {},
        create: expect.objectContaining({
          locacaoId: 'locacao-1',
          participanteAId: LOCATARIO_ID,
          participanteBId: DONO_ID,
          condominioId: CONDOMINIO_ID,
          expiraEm: null,
        }),
      }),
    );
    expect(result.expiraEm).toBeNull();
    expect(result.locacao).toEqual({ id: 'locacao-1', itemTitulo: 'Projetor', status: 'APROVADA' });
    expect(result.outroParticipante.id).toBe(DONO_ID);
  });

  it('o dono do item também abre, e vê o locatário como o outro participante', async () => {
    const prisma = buildPrismaMock();
    prisma.locacao.findUnique.mockResolvedValue(locacao);
    prisma.conversaPrivada.upsert.mockResolvedValue(conversaDaLocacao);

    const result = await new ConversasService(prisma).abrirPorLocacao(
      CONDOMINIO_ID,
      DONO_ID,
      'locacao-1',
    );

    expect(result.outroParticipante.id).toBe(LOCATARIO_ID);
  });

  it('rejeita quem não é nem locatário nem dono (403) sem criar nada', async () => {
    const prisma = buildPrismaMock();
    prisma.locacao.findUnique.mockResolvedValue(locacao);

    await expect(
      new ConversasService(prisma).abrirPorLocacao(CONDOMINIO_ID, ESTRANHO_ID, 'locacao-1'),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(prisma.conversaPrivada.upsert).not.toHaveBeenCalled();
  });

  it('locação inexistente ou de outro condomínio responde 404', async () => {
    const prisma = buildPrismaMock();
    const service = new ConversasService(prisma);

    prisma.locacao.findUnique.mockResolvedValue(null);
    await expect(service.abrirPorLocacao(CONDOMINIO_ID, ANA_ID, 'x')).rejects.toBeInstanceOf(
      NotFoundError,
    );

    prisma.locacao.findUnique.mockResolvedValue({
      ...locacao,
      item: { ...locacao.item, condominioId: 'outro-condominio' },
    });
    await expect(
      service.abrirPorLocacao(CONDOMINIO_ID, ANA_ID, 'locacao-1'),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('a conversa do Mural nunca reaproveita o chat de uma locação (filtra locacaoId: null)', async () => {
    const prisma = buildPrismaMock();
    prisma.user.findFirst.mockResolvedValue(bruno);
    prisma.conversaPrivada.findFirst.mockResolvedValue(null);
    prisma.conversaPrivada.create.mockResolvedValue(conversaBase);

    await new ConversasService(prisma).abrirOuContinuar(CONDOMINIO_ID, ANA_ID, {
      usuarioId: BRUNO_ID,
    });

    expect(prisma.conversaPrivada.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ locacaoId: null }) }),
    );
  });
});

describe('ConversasService — mensagens não lidas (persistidas)', () => {
  it('conta só as mensagens do outro depois do "lido em" de quem pergunta', async () => {
    const prisma = buildPrismaMock();
    const lidoEm = new Date('2026-09-17T10:00:00Z');
    prisma.conversaPrivada.findFirst.mockResolvedValue({
      ...conversaBase,
      participanteBLidoEm: lidoEm,
    });
    prisma.mensagemPrivada.count.mockResolvedValue(3);

    const result = await new ConversasService(prisma).buscarPorId(
      'conversa-1',
      CONDOMINIO_ID,
      BRUNO_ID,
    );

    expect(prisma.mensagemPrivada.count).toHaveBeenCalledWith({
      where: {
        conversaId: 'conversa-1',
        remetenteId: { not: BRUNO_ID },
        createdAt: { gt: lidoEm },
      },
    });
    expect(result.naoLidas).toBe(3);
  });

  it('quem nunca leu (lidoEm nulo) tem todas as mensagens do outro como não lidas', async () => {
    const prisma = buildPrismaMock();
    prisma.conversaPrivada.findFirst.mockResolvedValue({
      ...conversaBase,
      participanteALidoEm: null,
    });

    await new ConversasService(prisma).buscarPorId('conversa-1', CONDOMINIO_ID, ANA_ID);

    expect(prisma.mensagemPrivada.count).toHaveBeenCalledWith({
      where: { conversaId: 'conversa-1', remetenteId: { not: ANA_ID } },
    });
  });

  it('marcarComoLida grava o "lido em" do participante certo (A ou B) e de mais ninguém', async () => {
    const prisma = buildPrismaMock();
    prisma.conversaPrivada.findFirst.mockResolvedValue(conversaBase);
    const service = new ConversasService(prisma);

    await service.marcarComoLida('conversa-1', CONDOMINIO_ID, ANA_ID);
    await service.marcarComoLida('conversa-1', CONDOMINIO_ID, BRUNO_ID);

    expect(prisma.conversaPrivada.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'conversa-1' },
      data: { participanteALidoEm: expect.any(Date) },
    });
    expect(prisma.conversaPrivada.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'conversa-1' },
      data: { participanteBLidoEm: expect.any(Date) },
    });
  });

  it('marcarComoLida bloqueia quem não participa', async () => {
    const prisma = buildPrismaMock();
    prisma.conversaPrivada.findFirst.mockResolvedValue(conversaBase);

    await expect(
      new ConversasService(prisma).marcarComoLida('conversa-1', CONDOMINIO_ID, ESTRANHO_ID),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(prisma.conversaPrivada.update).not.toHaveBeenCalled();
  });

  it('quem envia a mensagem já fica "lido" até ela', async () => {
    const prisma = buildPrismaMock();
    const enviadaEm = new Date('2026-09-17T12:00:00Z');
    prisma.conversaPrivada.findFirst.mockResolvedValue(conversaBase);
    prisma.mensagemPrivada.create.mockResolvedValue({
      id: 'msg-1',
      conversaId: 'conversa-1',
      remetenteId: ANA_ID,
      conteudo: 'Oi',
      createdAt: enviadaEm,
    });

    await new ConversasService(prisma).enviarMensagem('conversa-1', CONDOMINIO_ID, ANA_ID, {
      conteudo: 'Oi',
    });

    expect(prisma.conversaPrivada.update).toHaveBeenCalledWith({
      where: { id: 'conversa-1' },
      data: { participanteALidoEm: enviadaEm },
    });
  });

  it('contarNaoLidas soma as não lidas de todas as conversas do usuário', async () => {
    const prisma = buildPrismaMock();
    prisma.conversaPrivada.findMany.mockResolvedValue([
      conversaBase,
      { ...conversaBase, id: 'conversa-2' },
    ]);
    prisma.mensagemPrivada.count.mockResolvedValueOnce(2).mockResolvedValueOnce(5);

    const total = await new ConversasService(prisma).contarNaoLidas(CONDOMINIO_ID, ANA_ID);

    expect(total).toBe(7);
  });

  it('listarMinhas junta Mural e locações, a mais recente primeiro, com a contagem de cada uma', async () => {
    const prisma = buildPrismaMock();
    prisma.conversaPrivada.findMany.mockResolvedValue([
      {
        ...conversaBase,
        id: 'antiga',
        mensagens: [{ conteudo: 'a', createdAt: new Date('2026-09-10') }],
      },
      {
        ...conversaBase,
        id: 'locacao',
        locacaoId: 'locacao-1',
        expiraEm: null,
        locacao: { id: 'locacao-1', status: 'PAGA', item: { titulo: 'Projetor' } },
        mensagens: [{ conteudo: 'b', createdAt: new Date('2026-09-20') }],
      },
    ]);
    prisma.mensagemPrivada.count.mockResolvedValueOnce(0).mockResolvedValueOnce(4);

    const result = await new ConversasService(prisma).listarMinhas(CONDOMINIO_ID, ANA_ID);

    expect(result.map((c) => c.id)).toEqual(['locacao', 'antiga']);
    expect(result[0]).toMatchObject({ naoLidas: 4, expiraEm: null });
    expect(result[0].locacao?.itemTitulo).toBe('Projetor');
    expect(result[1].locacao).toBeNull();
  });
});
