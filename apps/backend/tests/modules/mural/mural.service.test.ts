import { MuralService } from '@/modules/mural/mural.service';
import { ForbiddenError, NotFoundError } from '@/common/errors';

function buildPrismaMock() {
  return {
    post: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    comentarioPost: { create: jest.fn() },
    condominio: { findUnique: jest.fn() },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const CONDOMINIO_ID = 'cond-1';
const AUTOR_ID = 'user-1';
const OUTRO_MORADOR_ID = 'user-2';
const SINDICO_ID = 'user-3';

const autor = { id: AUTOR_ID, nome: 'Ana Proprietária', papel: 'MORADOR' };

const postBase = {
  id: 'post-1',
  conteudo: 'Preciso de uma escada só por um dia pra trocar uma lâmpada',
  tipo: 'PEDIDO',
  categoria: 'Ferramentas',
  status: 'ABERTO',
  autorId: AUTOR_ID,
  condominioId: CONDOMINIO_ID,
  createdAt: new Date('2026-09-16'),
  updatedAt: new Date('2026-09-16'),
  autor,
};

describe('MuralService.criarPost', () => {
  it('publica um post do tipo PEDIDO com status ABERTO, vinculado ao condomínio e autor', async () => {
    const prisma = buildPrismaMock();
    prisma.post.create.mockResolvedValue(postBase);

    const service = new MuralService(prisma);
    const result = await service.criarPost(CONDOMINIO_ID, AUTOR_ID, {
      conteudo: 'Preciso de uma escada só por um dia pra trocar uma lâmpada',
      tipo: 'PEDIDO',
      categoria: 'Ferramentas',
    });

    expect(prisma.post.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          autorId: AUTOR_ID,
          condominioId: CONDOMINIO_ID,
          status: 'ABERTO',
        }),
      }),
    );
    expect(result.autor).toEqual({ id: AUTOR_ID, nome: 'Ana Proprietária', papel: 'MORADOR' });
    expect(result.status).toBe('ABERTO');
  });

  it('publica um post do tipo AVISO sem status', async () => {
    const prisma = buildPrismaMock();
    prisma.post.create.mockResolvedValue({ ...postBase, tipo: 'AVISO', status: null });

    const service = new MuralService(prisma);
    await service.criarPost(CONDOMINIO_ID, AUTOR_ID, {
      conteudo: 'Manutenção do elevador social amanhã, das 8h às 12h.',
      tipo: 'AVISO',
    });

    expect(prisma.post.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: null }) }),
    );
  });

  it('admin precisa informar o condominioId (não tem condomínio próprio)', async () => {
    const prisma = buildPrismaMock();

    const service = new MuralService(prisma);

    await expect(
      service.criarPost(null, 'admin-1', { conteudo: 'Aviso da plataforma', tipo: 'AVISO' }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(prisma.post.create).not.toHaveBeenCalled();
  });

  it('rejeita condominioId informado pelo admin que não existe', async () => {
    const prisma = buildPrismaMock();
    prisma.condominio.findUnique.mockResolvedValue(null);

    const service = new MuralService(prisma);

    await expect(
      service.criarPost(null, 'admin-1', {
        conteudo: 'Aviso da plataforma',
        tipo: 'AVISO',
        condominioId: 'cond-inexistente',
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('admin cria post informando o condominioId explicitamente', async () => {
    const prisma = buildPrismaMock();
    prisma.condominio.findUnique.mockResolvedValue({ id: CONDOMINIO_ID });
    prisma.post.create.mockResolvedValue({ ...postBase, tipo: 'AVISO', status: null });

    const service = new MuralService(prisma);
    await service.criarPost(null, 'admin-1', {
      conteudo: 'Aviso da plataforma',
      tipo: 'AVISO',
      condominioId: CONDOMINIO_ID,
    });

    expect(prisma.post.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ condominioId: CONDOMINIO_ID }) }),
    );
  });
});

describe('MuralService.listarPorCondominio', () => {
  it('lista apenas posts do condomínio informado, com a contagem de comentários', async () => {
    const prisma = buildPrismaMock();
    prisma.post.findMany.mockResolvedValue([{ ...postBase, _count: { comentarios: 3 } }]);

    const service = new MuralService(prisma);
    const result = await service.listarPorCondominio(CONDOMINIO_ID);

    expect(prisma.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { condominioId: CONDOMINIO_ID } }),
    );
    expect(result).toHaveLength(1);
    expect(result[0].comentariosCount).toBe(3);
  });
});

describe('MuralService.buscarPorId', () => {
  it('retorna o post com os comentários em ordem cronológica', async () => {
    const prisma = buildPrismaMock();
    prisma.post.findFirst.mockResolvedValue({
      ...postBase,
      comentarios: [
        {
          id: 'comentario-1',
          postId: 'post-1',
          autorId: OUTRO_MORADOR_ID,
          conteudo: 'Tenho uma, te empresto!',
          createdAt: new Date('2026-09-16'),
          autor: { id: OUTRO_MORADOR_ID, nome: 'Bruno Locatário', papel: 'MORADOR' },
        },
      ],
    });

    const service = new MuralService(prisma);
    const result = await service.buscarPorId('post-1', CONDOMINIO_ID);

    expect(result.comentarios).toHaveLength(1);
    expect(result.comentarios[0].autor.nome).toBe('Bruno Locatário');
  });

  it('rejeita post inexistente ou de outro condomínio', async () => {
    const prisma = buildPrismaMock();
    prisma.post.findFirst.mockResolvedValue(null);

    const service = new MuralService(prisma);

    await expect(service.buscarPorId('inexistente', CONDOMINIO_ID)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe('MuralService.responder', () => {
  it('permite que qualquer morador do condomínio comente (mural público)', async () => {
    const prisma = buildPrismaMock();
    prisma.post.findFirst.mockResolvedValue(postBase);
    prisma.comentarioPost.create.mockResolvedValue({
      id: 'comentario-1',
      postId: 'post-1',
      autorId: OUTRO_MORADOR_ID,
      conteudo: 'Tenho uma, te empresto!',
      createdAt: new Date('2026-09-16'),
      autor: { id: OUTRO_MORADOR_ID, nome: 'Bruno Locatário', papel: 'MORADOR' },
    });

    const service = new MuralService(prisma);
    const result = await service.responder('post-1', CONDOMINIO_ID, OUTRO_MORADOR_ID, {
      conteudo: 'Tenho uma, te empresto!',
    });

    expect(result.autor.nome).toBe('Bruno Locatário');
  });

  it('rejeita comentar em post de outro condomínio', async () => {
    const prisma = buildPrismaMock();
    prisma.post.findFirst.mockResolvedValue(null);

    const service = new MuralService(prisma);

    await expect(
      service.responder('post-1', 'outro-condominio', OUTRO_MORADOR_ID, { conteudo: 'Oi' }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('MuralService.marcarAtendido', () => {
  it('permite que o autor marque o próprio pedido como atendido', async () => {
    const prisma = buildPrismaMock();
    prisma.post.findFirst.mockResolvedValue(postBase);
    prisma.post.update.mockResolvedValue({
      ...postBase,
      status: 'ATENDIDO',
      _count: { comentarios: 0 },
    });

    const service = new MuralService(prisma);
    const result = await service.marcarAtendido('post-1', CONDOMINIO_ID, AUTOR_ID);

    expect(prisma.post.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'ATENDIDO' } }),
    );
    expect(result.status).toBe('ATENDIDO');
  });

  it('rejeita quem não é o autor do pedido', async () => {
    const prisma = buildPrismaMock();
    prisma.post.findFirst.mockResolvedValue(postBase);

    const service = new MuralService(prisma);

    await expect(
      service.marcarAtendido('post-1', CONDOMINIO_ID, OUTRO_MORADOR_ID),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(prisma.post.update).not.toHaveBeenCalled();
  });

  it('rejeita marcar como atendido um post do tipo AVISO', async () => {
    const prisma = buildPrismaMock();
    prisma.post.findFirst.mockResolvedValue({ ...postBase, tipo: 'AVISO', status: null });

    const service = new MuralService(prisma);

    await expect(service.marcarAtendido('post-1', CONDOMINIO_ID, AUTOR_ID)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    expect(prisma.post.update).not.toHaveBeenCalled();
  });
});

describe('MuralService.excluir', () => {
  it('permite que o autor exclua o próprio post', async () => {
    const prisma = buildPrismaMock();
    prisma.post.findFirst.mockResolvedValue(postBase);

    const service = new MuralService(prisma);
    await service.excluir('post-1', CONDOMINIO_ID, AUTOR_ID, 'MORADOR');

    expect(prisma.post.delete).toHaveBeenCalledWith({ where: { id: 'post-1' } });
  });

  it('permite que o síndico exclua qualquer post do próprio condomínio', async () => {
    const prisma = buildPrismaMock();
    prisma.post.findFirst.mockResolvedValue(postBase);

    const service = new MuralService(prisma);
    await service.excluir('post-1', CONDOMINIO_ID, SINDICO_ID, 'SINDICO');

    expect(prisma.post.delete).toHaveBeenCalledWith({ where: { id: 'post-1' } });
  });

  it('rejeita morador que não é autor tentando excluir post de outro', async () => {
    const prisma = buildPrismaMock();
    prisma.post.findFirst.mockResolvedValue(postBase);

    const service = new MuralService(prisma);

    await expect(
      service.excluir('post-1', CONDOMINIO_ID, OUTRO_MORADOR_ID, 'MORADOR'),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(prisma.post.delete).not.toHaveBeenCalled();
  });
});
