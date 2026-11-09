import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import request from 'supertest';

jest.mock('@/common/prisma', () => ({
  prisma: {
    post: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    comentarioPost: { create: jest.fn() },
    condominio: { findUnique: jest.fn() },
  },
}));

import { createApp } from '@/app';
import { prisma } from '@/common/prisma';
import { UPLOADS_DIR } from '@/common/uploads';

const ACCESS_SECRET = 'test-access-secret';
const CONDOMINIO_ID = 'cond-1';
const AUTOR_ID = 'user-autor';
const arquivosCriados: string[] = [];

beforeAll(() => {
  process.env.JWT_ACCESS_SECRET = ACCESS_SECRET;
});

beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  for (const arquivo of arquivosCriados) fs.rmSync(arquivo, { force: true });
});

function token(userId = AUTOR_ID, papel: 'MORADOR' | 'SINDICO' = 'MORADOR'): string {
  return jwt.sign({ userId, papel, condominioId: CONDOMINIO_ID }, ACCESS_SECRET, {
    expiresIn: '1h',
  });
}

const JPEG = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  Buffer.from('conteudo-de-foto'),
]);

const postBase = {
  id: 'post-1',
  conteudo: 'Vazamento no hall do bloco 2',
  tipo: 'AVISO',
  categoria: null,
  status: null,
  autorId: AUTOR_ID,
  condominioId: CONDOMINIO_ID,
  imagens: null,
  createdAt: new Date('2026-11-09'),
  updatedAt: new Date('2026-11-09'),
  autor: { id: AUTOR_ID, nome: 'Ana', papel: 'MORADOR' },
};

describe('POST /api/mural/upload-imagem', () => {
  it('sem login responde 401', async () => {
    const response = await request(createApp()).post('/api/mural/upload-imagem');

    expect(response.status).toBe(401);
  });

  it('guarda uma foto verdadeira em /uploads/mural e devolve o endereço', async () => {
    const response = await request(createApp())
      .post('/api/mural/upload-imagem')
      .set('Authorization', `Bearer ${token()}`)
      .attach('imagem', JPEG, { filename: 'foto.jpg', contentType: 'image/jpeg' });

    expect(response.status).toBe(201);
    expect(response.body.url).toMatch(/\/uploads\/mural\/.+\.jpg$/);

    const nome = String(response.body.url).split('/uploads/mural/')[1];
    const caminho = path.join(UPLOADS_DIR, 'mural', nome);
    arquivosCriados.push(caminho);
    expect(fs.existsSync(caminho)).toBe(true);
  });

  it('recusa um arquivo que só diz ser imagem e não deixa nada no disco', async () => {
    const antes = fs.readdirSync(path.join(UPLOADS_DIR, 'mural')).length;

    const response = await request(createApp())
      .post('/api/mural/upload-imagem')
      .set('Authorization', `Bearer ${token()}`)
      .attach('imagem', Buffer.from('<html><script>alert(1)</script></html>'), {
        filename: 'falso.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(400);
    expect(fs.readdirSync(path.join(UPLOADS_DIR, 'mural')).length).toBe(antes);
  });

  it('recusa formato que não é imagem aceita (SVG) e requisição sem arquivo', async () => {
    const svg = await request(createApp())
      .post('/api/mural/upload-imagem')
      .set('Authorization', `Bearer ${token()}`)
      .attach('imagem', Buffer.from('<svg></svg>'), {
        filename: 'x.svg',
        contentType: 'image/svg+xml',
      });
    const semArquivo = await request(createApp())
      .post('/api/mural/upload-imagem')
      .set('Authorization', `Bearer ${token()}`);

    expect(svg.status).toBe(400);
    expect(semArquivo.status).toBe(400);
    expect(semArquivo.body.error.code).toBe('UPLOAD_AUSENTE');
  });
});

describe('POST /api/mural com fotos', () => {
  const foto = (n: number) => `http://localhost:3000/uploads/mural/foto-${n}.jpg`;
  const publicar = (corpo: Record<string, unknown>) =>
    request(createApp())
      .post('/api/mural')
      .set('Authorization', `Bearer ${token()}`)
      .send({ conteudo: 'Vazamento no hall do bloco 2', tipo: 'AVISO', ...corpo });

  it('publica o post com as fotos e devolve os endereços', async () => {
    (prisma.post.create as jest.Mock).mockResolvedValue({
      ...postBase,
      imagens: [foto(1), foto(2)],
    });

    const response = await publicar({ imagens: [foto(1), foto(2)] });

    expect(response.status).toBe(201);
    expect(response.body.imagens).toEqual([foto(1), foto(2)]);
    expect(prisma.post.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ imagens: [foto(1), foto(2)] }),
      }),
    );
  });

  it('post sem fotos continua funcionando e devolve a lista vazia', async () => {
    (prisma.post.create as jest.Mock).mockResolvedValue(postBase);

    const response = await publicar({});

    expect(response.status).toBe(201);
    expect(response.body.imagens).toEqual([]);
  });

  it('aceita no máximo 4 fotos', async () => {
    const response = await publicar({ imagens: [1, 2, 3, 4, 5].map(foto) });

    expect(response.status).toBe(400);
    expect(prisma.post.create).not.toHaveBeenCalled();
  });

  it('recusa foto hospedada em outro site e foto de outra pasta de uploads', async () => {
    const externa = await publicar({ imagens: ['https://site-de-terceiros.example/rastreio.png'] });
    const deItens = await publicar({ imagens: ['http://localhost:3000/uploads/itens/abc.jpg'] });

    expect(externa.status).toBe(400);
    expect(deItens.status).toBe(400);
    expect(prisma.post.create).not.toHaveBeenCalled();
  });
});

describe('GET /api/mural e exclusão', () => {
  it('a listagem traz as fotos de cada post', async () => {
    (prisma.post.findMany as jest.Mock).mockResolvedValue([
      {
        ...postBase,
        imagens: ['http://localhost:3000/uploads/mural/a.jpg'],
        _count: { comentarios: 2 },
      },
      { ...postBase, id: 'post-2', imagens: null, _count: { comentarios: 0 } },
    ]);

    const response = await request(createApp())
      .get('/api/mural')
      .set('Authorization', `Bearer ${token('outra-pessoa')}`);

    expect(response.status).toBe(200);
    expect(response.body[0].imagens).toEqual(['http://localhost:3000/uploads/mural/a.jpg']);
    expect(response.body[1].imagens).toEqual([]);
  });

  it('excluir o post apaga também as fotos do disco', async () => {
    const dir = path.join(UPLOADS_DIR, 'mural');
    const nome = `teste-exclusao-${Date.now()}.jpg`;
    const caminho = path.join(dir, nome);
    fs.writeFileSync(caminho, JPEG);
    arquivosCriados.push(caminho);
    (prisma.post.findFirst as jest.Mock).mockResolvedValue({
      ...postBase,
      imagens: [`http://localhost:3000/uploads/mural/${nome}`],
    });
    (prisma.post.delete as jest.Mock).mockResolvedValue({});

    const response = await request(createApp())
      .delete('/api/mural/post-1')
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(204);
    expect(fs.existsSync(caminho)).toBe(false);
  });
});
