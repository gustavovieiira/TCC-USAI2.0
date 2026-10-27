import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import request from 'supertest';

jest.mock('@/common/prisma', () => ({
  prisma: {
    configuracao: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
    logAuditoria: { create: jest.fn() },
  },
}));

import { createApp } from '@/app';
import { prisma } from '@/common/prisma';
import { UPLOADS_DIR } from '@/common/uploads';

const ACCESS_SECRET = 'test-access-secret';

beforeAll(() => {
  process.env.JWT_ACCESS_SECRET = ACCESS_SECRET;
});

beforeEach(() => {
  jest.clearAllMocks();
  (prisma.configuracao.findMany as jest.Mock).mockResolvedValue([]);
  (prisma.configuracao.findUnique as jest.Mock).mockResolvedValue(null);
});

function token(papel: 'ADMIN' | 'MORADOR' | 'SINDICO') {
  return jwt.sign(
    { userId: 'u-1', papel, condominioId: papel === 'ADMIN' ? null : 'cond-1' },
    ACCESS_SECRET,
    { expiresIn: '1h' },
  );
}

describe('GET /api/configuracao (pública)', () => {
  it('responde sem login — o cabeçalho, a tela inicial e o login precisam da logo', async () => {
    const response = await request(createApp()).get('/api/configuracao');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ logoUrl: null });
    expect(response.body.nomeInstitucional).toContain('USAI');
    expect(response.body.rodapeInstitucional.length).toBeGreaterThan(10);
  });

  it('devolve a logo configurada', async () => {
    (prisma.configuracao.findMany as jest.Mock).mockResolvedValue([
      { chave: 'logo_url', valor: 'http://localhost/uploads/marca/logo.png' },
    ]);

    const response = await request(createApp()).get('/api/configuracao');

    expect(response.body.logoUrl).toBe('http://localhost/uploads/marca/logo.png');
  });
});

describe('POST /api/admin/configuracao/logo', () => {
  const arquivosCriados: string[] = [];

  afterAll(() => {
    arquivosCriados.forEach((arquivo) => fs.rmSync(arquivo, { force: true }));
  });

  it('só o Admin envia a logo: sem token 401, morador e síndico 403', async () => {
    const app = createApp();

    expect((await request(app).post('/api/admin/configuracao/logo')).status).toBe(401);
    for (const papel of ['MORADOR', 'SINDICO'] as const) {
      const response = await request(app)
        .post('/api/admin/configuracao/logo')
        .set('Authorization', `Bearer ${token(papel)}`)
        .attach('logo', Buffer.from('x'), { filename: 'logo.png', contentType: 'image/png' });
      expect(response.status).toBe(403);
    }
  });

  it('faz upload de PNG/JPEG/WebP, guarda o arquivo como veio e passa a servir a URL pública', async () => {
    const conteudo = Buffer.from('conteudo-fake-de-logo-png');

    const response = await request(createApp())
      .post('/api/admin/configuracao/logo')
      .set('Authorization', `Bearer ${token('ADMIN')}`)
      .attach('logo', conteudo, { filename: 'logo-empresa.png', contentType: 'image/png' });

    expect(response.status).toBe(200);
    const url = (prisma.configuracao.upsert as jest.Mock).mock.calls[0][0].create.valor as string;
    expect(url).toMatch(/\/uploads\/marca\/logo-.+\.png$/);

    const nomeArquivo = url.split('/uploads/marca/')[1];
    const caminho = path.join(UPLOADS_DIR, 'marca', nomeArquivo);
    arquivosCriados.push(caminho);
    expect(fs.readFileSync(caminho).equals(conteudo)).toBe(true); // sem recompressão: qualidade intacta
    expect(prisma.logAuditoria.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ acao: 'ATUALIZAR_LOGO' }),
    });
  });

  it('recusa SVG e outros formatos (400) — SVG pode carregar script', async () => {
    for (const [nome, tipo] of [
      ['logo.svg', 'image/svg+xml'],
      ['logo.gif', 'image/gif'],
      ['logo.pdf', 'application/pdf'],
    ]) {
      const response = await request(createApp())
        .post('/api/admin/configuracao/logo')
        .set('Authorization', `Bearer ${token('ADMIN')}`)
        .attach('logo', Buffer.from('x'), { filename: nome, contentType: tipo });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('UPLOAD_INVALIDO');
    }
    expect(prisma.configuracao.upsert).not.toHaveBeenCalled();
  });

  it('recusa arquivo acima de 2 MB (400)', async () => {
    const response = await request(createApp())
      .post('/api/admin/configuracao/logo')
      .set('Authorization', `Bearer ${token('ADMIN')}`)
      .attach('logo', Buffer.alloc(2 * 1024 * 1024 + 10), {
        filename: 'grande.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(400);
  });

  it('sem arquivo responde 400 UPLOAD_AUSENTE', async () => {
    const response = await request(createApp())
      .post('/api/admin/configuracao/logo')
      .set('Authorization', `Bearer ${token('ADMIN')}`);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('UPLOAD_AUSENTE');
  });
});

describe('DELETE /api/admin/configuracao/logo e PUT /api/admin/configuracao', () => {
  it('Admin remove a logo e volta ao padrão', async () => {
    (prisma.configuracao.findUnique as jest.Mock).mockResolvedValue({
      chave: 'logo_url',
      valor: 'http://x/l.png',
    });

    const response = await request(createApp())
      .delete('/api/admin/configuracao/logo')
      .set('Authorization', `Bearer ${token('ADMIN')}`);

    expect(response.status).toBe(200);
    expect(prisma.configuracao.delete).toHaveBeenCalledWith({ where: { chave: 'logo_url' } });
  });

  it('Admin atualiza nome e rodapé institucionais; vazio é recusado (400); morador 403', async () => {
    const app = createApp();
    const corpo = {
      nomeInstitucional: 'Condomínio Aurora',
      rodapeInstitucional: 'Rodapé oficial da empresa',
    };

    const ok = await request(app)
      .put('/api/admin/configuracao')
      .set('Authorization', `Bearer ${token('ADMIN')}`)
      .send(corpo);
    expect(ok.status).toBe(200);

    const vazio = await request(app)
      .put('/api/admin/configuracao')
      .set('Authorization', `Bearer ${token('ADMIN')}`)
      .send({ nomeInstitucional: '', rodapeInstitucional: '' });
    expect(vazio.status).toBe(400);

    const proibido = await request(app)
      .put('/api/admin/configuracao')
      .set('Authorization', `Bearer ${token('MORADOR')}`)
      .send(corpo);
    expect(proibido.status).toBe(403);
  });
});
