import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import request from 'supertest';

jest.mock('@/modules/notificacoes/notificacoes.service');

jest.mock('@/common/prisma', () => {
  const mockPrisma = {
    locacao: { findUnique: jest.fn(), updateMany: jest.fn() },
    movimentacao: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    termoResponsabilidade: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn(),
    },
    eventoMovimentacao: { create: jest.fn() },
    aceiteTermo: { create: jest.fn() },
    logAuditoria: { create: jest.fn() },
    user: { findUnique: jest.fn() },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  mockPrisma.$transaction = jest.fn((callback: (tx: unknown) => unknown) => callback(mockPrisma));
  return { prisma: mockPrisma };
});

import { createApp } from '@/app';
import { prisma } from '@/common/prisma';

const ACCESS_SECRET = 'test-access-secret';
const DONO = 'dono-1';
const LOCATARIO = 'locatario-1';

beforeAll(() => {
  process.env.JWT_ACCESS_SECRET = ACCESS_SECRET;
});

function token(userId: string, papel: 'MORADOR' | 'ADMIN' | 'SINDICO' = 'MORADOR') {
  return jwt.sign(
    { userId, papel, condominioId: papel === 'ADMIN' ? null : 'cond-1' },
    ACCESS_SECRET,
    { expiresIn: '1h' },
  );
}

const termo = {
  id: 'termo-1',
  tipo: 'RETIRADA',
  versao: 1,
  titulo: 'Termo de Retirada',
  clausulas: ['Cláusula'],
  declaracoes: [{ id: 'ciencia', texto: 'Declaro que li os termos.' }],
  statusRevisao: 'MODELO',
  aprovadoEm: null,
  createdAt: new Date('2026-10-01'),
};

const movimentacao = {
  id: 'mov-1',
  numero: 3,
  createdAt: new Date('2026-10-27T12:00:00Z'),
  locacaoId: 'loc-1',
  tipo: 'RETIRADA',
  status: 'AGUARDANDO_ACEITE',
  entreguePorId: DONO,
  recebidoPorId: LOCATARIO,
  ocorridoEm: new Date('2026-10-27T12:00:00Z'),
  concluidaEm: null,
  estadoConservacao: 'BOM',
  acessorios: [],
  observacoes: null,
  termoId: 'termo-1',
  snapshot: {},
  hashIntegridade: null,
  entreguePor: { id: DONO, nome: 'Davi Dono' },
  recebidoPor: { id: LOCATARIO, nome: 'Carla Locataria' },
  locacao: { id: 'loc-1', status: 'PAGA' },
  termo,
  aceites: [],
  eventos: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  (prisma.termoResponsabilidade.findFirst as jest.Mock).mockResolvedValue(termo);
  (prisma.movimentacao.findUnique as jest.Mock).mockResolvedValue(movimentacao);
  (prisma.movimentacao.findFirst as jest.Mock).mockResolvedValue(null);
  (prisma.movimentacao.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
  (prisma.locacao.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
});

describe('autenticação e papéis', () => {
  it.each([
    ['get', '/api/movimentacoes/termos/retirada'],
    ['get', '/api/movimentacoes/mov-1'],
    ['post', '/api/movimentacoes/mov-1/aceite'],
    ['post', '/api/movimentacoes/mov-1/cancelar'],
    ['post', '/api/movimentacoes/mov-1/retificacoes'],
    ['get', '/api/locacoes/loc-1/movimentacoes'],
    ['post', '/api/locacoes/loc-1/movimentacoes'],
  ] as const)('%s %s sem token retorna 401', async (metodo, rota) => {
    const response = await request(createApp())[metodo](rota);

    expect(response.status).toBe(401);
  });

  it.each([
    ['get', '/api/admin/termos'],
    ['post', '/api/admin/termos'],
    ['post', '/api/admin/termos/termo-1/aprovar'],
    ['get', '/api/admin/movimentacoes'],
  ] as const)('%s %s é só do Admin: morador e síndico recebem 403', async (metodo, rota) => {
    for (const papel of ['MORADOR', 'SINDICO'] as const) {
      const response = await request(createApp())
        [metodo](rota)
        .set('Authorization', `Bearer ${token('u-9', papel)}`)
        .send({});
      expect(response.status).toBe(403);
    }
  });
});

describe('GET /api/movimentacoes/termos/:tipo', () => {
  it('devolve o termo vigente (aceita minúsculas) e indica que é modelo ainda não aprovado', async () => {
    const response = await request(createApp())
      .get('/api/movimentacoes/termos/retirada')
      .set('Authorization', `Bearer ${token(LOCATARIO)}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ tipo: 'RETIRADA', statusRevisao: 'MODELO' });
  });

  it('tipo desconhecido responde 400', async () => {
    const response = await request(createApp())
      .get('/api/movimentacoes/termos/transferencia')
      .set('Authorization', `Bearer ${token(LOCATARIO)}`);

    expect(response.status).toBe(400);
  });
});

describe('POST /api/locacoes/:id/movimentacoes', () => {
  const corpoValido = {
    tipo: 'RETIRADA',
    estadoConservacao: 'BOM',
    acessorios: [{ nome: 'Maleta', conferido: true }],
    observacoes: '  Tudo conferido  ',
  };

  const locacao = {
    id: 'loc-1',
    status: 'PAGA',
    locatarioId: LOCATARIO,
    dataInicio: new Date('2026-11-01'),
    dataFim: new Date('2026-11-03'),
    valorTotal: 100,
    finalidade: null,
    item: {
      id: 'item-1',
      titulo: 'Furadeira',
      descricao: 'desc',
      categoria: 'Ferramentas',
      fabricante: null,
      modelo: null,
      numeroSerie: null,
      acessorios: null,
      ownerId: DONO,
      owner: { id: DONO, nome: 'Davi Dono', apartamento: null, cpf: null, condominio: null },
    },
    locatario: { id: LOCATARIO, nome: 'Carla', apartamento: null, cpf: null, condominio: null },
  };

  it('o dono registra a entrega (201)', async () => {
    (prisma.locacao.findUnique as jest.Mock).mockResolvedValue(locacao);
    (prisma.movimentacao.create as jest.Mock).mockResolvedValue(movimentacao);

    const response = await request(createApp())
      .post('/api/locacoes/loc-1/movimentacoes')
      .set('Authorization', `Bearer ${token(DONO)}`)
      .send(corpoValido);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      numeroDocumento: 'USAI-2026-000003',
      status: 'AGUARDANDO_ACEITE',
    });
    expect((prisma.movimentacao.create as jest.Mock).mock.calls[0][0].data.observacoes).toBe(
      'Tudo conferido',
    );
  });

  it('estado de conservação ausente ou inválido responde 400 com mensagem clara', async () => {
    const response = await request(createApp())
      .post('/api/locacoes/loc-1/movimentacoes')
      .set('Authorization', `Bearer ${token(DONO)}`)
      .send({ ...corpoValido, estadoConservacao: 'PERFEITO' });

    expect(response.status).toBe(400);
  });

  it('o locatário não registra a entrega (403)', async () => {
    (prisma.locacao.findUnique as jest.Mock).mockResolvedValue(locacao);

    const response = await request(createApp())
      .post('/api/locacoes/loc-1/movimentacoes')
      .set('Authorization', `Bearer ${token(LOCATARIO)}`)
      .send(corpoValido);

    expect(response.status).toBe(403);
  });
});

describe('POST /api/movimentacoes/:id/aceite', () => {
  async function prepararUsuario() {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: LOCATARIO,
      nome: 'Carla',
      senhaHash: await bcrypt.hash('senha-certa', 4),
    });
    (prisma.locacao.findUnique as jest.Mock).mockResolvedValue({
      id: 'loc-1',
      item: { titulo: 'Furadeira' },
    });
    (prisma.aceiteTermo.create as jest.Mock).mockImplementation(async ({ data }) => ({
      ...data,
      id: 'a-1',
    }));
  }

  it('sem marcar todas as declarações responde 400 e não conclui', async () => {
    await prepararUsuario();

    const response = await request(createApp())
      .post('/api/movimentacoes/mov-1/aceite')
      .set('Authorization', `Bearer ${token(LOCATARIO)}`)
      .send({ declaracoes: [], senha: 'senha-certa' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('ACEITE_INCOMPLETO');
    expect(prisma.aceiteTermo.create).not.toHaveBeenCalled();
  });

  it('sem a senha (campo ausente) responde 400', async () => {
    const response = await request(createApp())
      .post('/api/movimentacoes/mov-1/aceite')
      .set('Authorization', `Bearer ${token(LOCATARIO)}`)
      .send({ declaracoes: ['ciencia'] });

    expect(response.status).toBe(400);
  });

  it('senha errada responde 403 SENHA_INVALIDA', async () => {
    await prepararUsuario();

    const response = await request(createApp())
      .post('/api/movimentacoes/mov-1/aceite')
      .set('Authorization', `Bearer ${token(LOCATARIO)}`)
      .send({ declaracoes: ['ciencia'], senha: 'errada' });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('SENHA_INVALIDA');
  });

  it('aceite completo conclui (200), registra IP e navegador e responde com o documento', async () => {
    await prepararUsuario();

    const response = await request(createApp())
      .post('/api/movimentacoes/mov-1/aceite')
      .set('Authorization', `Bearer ${token(LOCATARIO)}`)
      .set('User-Agent', 'Teste/1.0')
      .send({ declaracoes: ['ciencia'], senha: 'senha-certa' });

    expect(response.status).toBe(200);
    expect(response.body.numeroDocumento).toBe('USAI-2026-000003');
    const aceite = (prisma.aceiteTermo.create as jest.Mock).mock.calls[0][0].data;
    expect(aceite.userAgent).toBe('Teste/1.0');
    expect(aceite.ip).toBeTruthy();
    expect(aceite.assinatura).toMatch(/^[0-9a-f]{64}$/);
  });

  it('quem entregou não aceita (403)', async () => {
    const response = await request(createApp())
      .post('/api/movimentacoes/mov-1/aceite')
      .set('Authorization', `Bearer ${token(DONO)}`)
      .send({ declaracoes: ['ciencia'], senha: 'qualquer' });

    expect(response.status).toBe(403);
  });
});

describe('GET /api/movimentacoes/:id, cancelar e retificações', () => {
  it('estranho não vê o documento (403); as partes e o Admin veem', async () => {
    const app = createApp();

    expect(
      (
        await request(app)
          .get('/api/movimentacoes/mov-1')
          .set('Authorization', `Bearer ${token('estranho')}`)
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .get('/api/movimentacoes/mov-1')
          .set('Authorization', `Bearer ${token(DONO)}`)
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .get('/api/movimentacoes/mov-1')
          .set('Authorization', `Bearer ${token('adm', 'ADMIN')}`)
      ).status,
    ).toBe(200);
  });

  it('retificação com texto curto demais responde 400; com texto válido acrescenta ao histórico (201)', async () => {
    const app = createApp();

    const curto = await request(app)
      .post('/api/movimentacoes/mov-1/retificacoes')
      .set('Authorization', `Bearer ${token(LOCATARIO)}`)
      .send({ texto: 'ok' });
    expect(curto.status).toBe(400);

    const valido = await request(app)
      .post('/api/movimentacoes/mov-1/retificacoes')
      .set('Authorization', `Bearer ${token(LOCATARIO)}`)
      .send({ texto: 'O risco já existia antes da retirada.' });
    expect(valido.status).toBe(201);
    expect(prisma.eventoMovimentacao.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ acao: 'RETIFICACAO' }),
    });
  });

  it('quem registrou cancela (200); quem recebe não (403)', async () => {
    const app = createApp();

    expect(
      (
        await request(app)
          .post('/api/movimentacoes/mov-1/cancelar')
          .set('Authorization', `Bearer ${token(DONO)}`)
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .post('/api/movimentacoes/mov-1/cancelar')
          .set('Authorization', `Bearer ${token(LOCATARIO)}`)
      ).status,
    ).toBe(403);
  });
});

describe('Admin: termos e documentos', () => {
  it('lista termos, cria nova versão (201) e aprova (200)', async () => {
    const app = createApp();
    const auth = `Bearer ${token('adm', 'ADMIN')}`;
    (prisma.termoResponsabilidade.findMany as jest.Mock).mockResolvedValue([termo]);
    (prisma.termoResponsabilidade.aggregate as jest.Mock).mockResolvedValue({
      _max: { versao: 1 },
    });
    (prisma.termoResponsabilidade.create as jest.Mock).mockResolvedValue({ ...termo, versao: 2 });
    (prisma.termoResponsabilidade.findUnique as jest.Mock).mockResolvedValue(termo);
    (prisma.termoResponsabilidade.update as jest.Mock).mockResolvedValue({
      ...termo,
      statusRevisao: 'APROVADO',
    });

    expect((await request(app).get('/api/admin/termos').set('Authorization', auth)).status).toBe(
      200,
    );

    const criado = await request(app)
      .post('/api/admin/termos')
      .set('Authorization', auth)
      .send({
        tipo: 'RETIRADA',
        titulo: 'Termo de Retirada v2',
        clausulas: ['O locatário zela pelo item.'],
        declaracoes: [{ id: 'ciencia', texto: 'Declaro que li e estou ciente dos termos.' }],
      });
    expect(criado.status).toBe(201);
    expect(criado.body.versao).toBe(2);

    const aprovado = await request(app)
      .post('/api/admin/termos/termo-1/aprovar')
      .set('Authorization', auth);
    expect(aprovado.status).toBe(200);
    expect(aprovado.body.statusRevisao).toBe('APROVADO');
  });

  it('termo mal formado (sem declaração) responde 400', async () => {
    const response = await request(createApp())
      .post('/api/admin/termos')
      .set('Authorization', `Bearer ${token('adm', 'ADMIN')}`)
      .send({
        tipo: 'RETIRADA',
        titulo: 'Termo sem declaração',
        clausulas: ['Cláusula válida aqui'],
        declaracoes: [],
      });

    expect(response.status).toBe(400);
  });

  it('Admin lista os documentos recentes da plataforma (auditoria)', async () => {
    (prisma.movimentacao.findMany as jest.Mock).mockResolvedValue([
      { ...movimentacao, locacao: { id: 'loc-1', item: { titulo: 'Furadeira' } } },
    ]);

    const response = await request(createApp())
      .get('/api/admin/movimentacoes')
      .set('Authorization', `Bearer ${token('adm', 'ADMIN')}`);

    expect(response.status).toBe(200);
    expect(response.body[0]).toMatchObject({
      numeroDocumento: 'USAI-2026-000003',
      itemTitulo: 'Furadeira',
    });
  });
});
