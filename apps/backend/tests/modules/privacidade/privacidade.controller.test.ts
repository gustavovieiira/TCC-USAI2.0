import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import request from 'supertest';

jest.mock('@/common/prisma', () => {
  const resultado = () => jest.fn().mockResolvedValue([]);
  const tx: any = {
    user: { update: jest.fn() },
    tokenAcesso: { deleteMany: jest.fn() },
    notificacao: { deleteMany: jest.fn() },
    item: { updateMany: jest.fn() },
    itemImagem: { deleteMany: jest.fn() },
    comentarioPost: { deleteMany: jest.fn() },
    post: { deleteMany: jest.fn() },
    conversaPrivada: { deleteMany: jest.fn() },
    mensagemPrivada: { updateMany: jest.fn() },
    solicitacaoSaque: { updateMany: jest.fn() },
  };
  return {
    prisma: {
      user: { findUnique: jest.fn() },
      item: { findMany: resultado() },
      locacao: { findMany: resultado(), count: jest.fn().mockResolvedValue(0) },
      post: { findMany: resultado() },
      itemImagem: { findMany: resultado() },
      comentarioPost: { findMany: resultado() },
      mensagemPrivada: { findMany: resultado() },
      solicitacaoSaque: {
        findMany: resultado(),
        count: jest.fn().mockResolvedValue(0),
        aggregate: jest.fn().mockResolvedValue({ _sum: { valor: null } }),
      },
      lancamento: {
        findMany: resultado(),
        aggregate: jest.fn().mockResolvedValue({ _sum: { valor: null } }),
      },
      notificacao: { findMany: resultado() },
      aceiteTermo: { findMany: resultado() },
      assinatura: { findFirst: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn((fn: (t: unknown) => unknown) => fn(tx)),
      __tx: tx,
    },
  };
});

import { createApp } from '@/app';
import { prisma } from '@/common/prisma';

const ACCESS_SECRET = 'test-access-secret';
const SENHA = 'senha-forte-123';
const senhaHash = bcrypt.hashSync(SENHA, 4);

const usuario = {
  id: 'user-1',
  nome: 'Ana Paula',
  email: 'ana@example.com',
  cpf: '12345678901',
  apartamento: '201',
  chavePix: null,
  papel: 'MORADOR',
  ativo: true,
  senhaHash,
  createdAt: new Date('2026-09-01'),
  aceitouTermosEm: new Date('2026-09-01'),
  versaoTermos: '2026-11-05',
  condominio: { nome: 'Residencial Teste' },
};

beforeAll(() => {
  process.env.JWT_ACCESS_SECRET = ACCESS_SECRET;
});

beforeEach(() => {
  jest.clearAllMocks();
  (prisma.user.findUnique as jest.Mock).mockResolvedValue(usuario);
});

function token() {
  return jwt.sign({ userId: 'user-1', papel: 'MORADOR', condominioId: 'cond-1' }, ACCESS_SECRET, {
    expiresIn: '1h',
  });
}

describe('GET /api/privacidade/meus-dados', () => {
  it('devolve a cópia dos dados como arquivo para baixar, sem a senha', async () => {
    const response = await request(createApp())
      .get('/api/privacidade/meus-dados')
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(200);
    expect(response.headers['content-disposition']).toContain('attachment');
    expect(response.headers['content-disposition']).toContain('meus-dados-usai.json');
    const corpo = JSON.parse(response.text);
    expect(corpo.titular).toMatchObject({ nome: 'Ana Paula', email: 'ana@example.com' });
    expect(response.text).not.toContain('senhaHash');
    expect(response.text).not.toContain(senhaHash);
  });
});

describe('POST /api/privacidade/excluir-conta', () => {
  it('anonimiza a conta com a senha certa e a confirmação, e responde 204', async () => {
    const response = await request(createApp())
      .post('/api/privacidade/excluir-conta')
      .set('Authorization', `Bearer ${token()}`)
      .send({ senha: SENHA, confirmacao: 'EXCLUIR' });

    expect(response.status).toBe(204);
    const tx = (prisma as any).__tx;
    expect(tx.user.update.mock.calls[0][0].data).toMatchObject({
      nome: 'Usuário removido',
      ativo: false,
      cpf: null,
    });
  });

  it('sem a palavra de confirmação devolve 400 e não toca em nada', async () => {
    const response = await request(createApp())
      .post('/api/privacidade/excluir-conta')
      .set('Authorization', `Bearer ${token()}`)
      .send({ senha: SENHA });

    expect(response.status).toBe(400);
    expect((prisma as any).__tx.user.update).not.toHaveBeenCalled();
  });

  it('com a senha errada devolve 401', async () => {
    const response = await request(createApp())
      .post('/api/privacidade/excluir-conta')
      .set('Authorization', `Bearer ${token()}`)
      .send({ senha: 'errada-12345', confirmacao: 'EXCLUIR' });

    expect(response.status).toBe(401);
    expect((prisma as any).__tx.user.update).not.toHaveBeenCalled();
  });

  it('com pendências devolve 409 com o motivo', async () => {
    (prisma.locacao.count as jest.Mock).mockResolvedValue(2);

    const response = await request(createApp())
      .post('/api/privacidade/excluir-conta')
      .set('Authorization', `Bearer ${token()}`)
      .send({ senha: SENHA, confirmacao: 'EXCLUIR' });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('LOCACOES_EM_ABERTO');
  });
});

describe('POST /api/auth/logout', () => {
  it('é coberto pelo teste de rotas protegidas; sem login responde 401', async () => {
    const response = await request(createApp()).post('/api/auth/logout');

    expect(response.status).toBe(401);
  });
});
