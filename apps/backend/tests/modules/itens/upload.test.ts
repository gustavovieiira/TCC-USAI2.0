import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createApp } from '@/app';
import { UPLOADS_DIR } from '@/common/uploads';

const ACCESS_SECRET = 'test-access-secret';

beforeAll(() => {
  process.env.JWT_ACCESS_SECRET = ACCESS_SECRET;
});

function tokenMorador(): string {
  return jwt.sign({ userId: 'user-1', papel: 'MORADOR', condominioId: 'cond-1' }, ACCESS_SECRET, {
    expiresIn: '1h',
  });
}

describe('POST /api/itens/upload-imagem', () => {
  const app = createApp();
  const arquivosCriados: string[] = [];

  afterAll(() => {
    arquivosCriados.forEach((arquivo) => fs.rmSync(arquivo, { force: true }));
  });

  it('sem token retorna 401', async () => {
    const response = await request(app).post('/api/itens/upload-imagem');
    expect(response.status).toBe(401);
  });

  it('faz upload de uma imagem válida e retorna a URL pública', async () => {
    const response = await request(app)
      .post('/api/itens/upload-imagem')
      .set('Authorization', `Bearer ${tokenMorador()}`)
      .attach('imagem', Buffer.from('conteudo-fake-de-imagem'), {
        filename: 'foto.jpg',
        contentType: 'image/jpeg',
      });

    expect(response.status).toBe(201);
    expect(response.body.url).toMatch(/\/uploads\/itens\/.+\.jpg$/);

    const nomeArquivo = String(response.body.url).split('/uploads/itens/')[1];
    const caminho = path.join(UPLOADS_DIR, 'itens', nomeArquivo);
    arquivosCriados.push(caminho);
    expect(fs.existsSync(caminho)).toBe(true);
  });

  it('rejeita formato de arquivo não suportado', async () => {
    const response = await request(app)
      .post('/api/itens/upload-imagem')
      .set('Authorization', `Bearer ${tokenMorador()}`)
      .attach('imagem', Buffer.from('não é imagem'), {
        filename: 'arquivo.txt',
        contentType: 'text/plain',
      });

    expect(response.status).toBe(400);
  });

  it('rejeita quando nenhum arquivo é enviado', async () => {
    const response = await request(app)
      .post('/api/itens/upload-imagem')
      .set('Authorization', `Bearer ${tokenMorador()}`);

    expect(response.status).toBe(400);
  });
});
