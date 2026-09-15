import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '@/app';

const ACCESS_SECRET = 'test-access-secret';

beforeAll(() => {
  process.env.JWT_ACCESS_SECRET = ACCESS_SECRET;
});

function tokenPara(papel: 'MORADOR' | 'SINDICO' | 'ADMIN'): string {
  return jwt.sign({ userId: 'user-1', papel, condominioId: 'cond-1' }, ACCESS_SECRET, {
    expiresIn: '1h',
  });
}

describe('RBAC de /api/admin — rotas exclusivas do papel ADMIN', () => {
  const app = createApp();

  it('bloqueia morador tentando criar condomínio', async () => {
    const response = await request(app)
      .post('/api/admin/condominios')
      .set('Authorization', `Bearer ${tokenPara('MORADOR')}`)
      .send({ nome: 'X', linkSlug: 'x', pin: '1234' });

    expect(response.status).toBe(403);
  });

  it('bloqueia síndico tentando ver o resumo financeiro', async () => {
    const response = await request(app)
      .get('/api/admin/financeiro/resumo')
      .set('Authorization', `Bearer ${tokenPara('SINDICO')}`);

    expect(response.status).toBe(403);
  });

  it('bloqueia síndico tentando criar outro síndico', async () => {
    const response = await request(app)
      .post('/api/admin/sindicos')
      .set('Authorization', `Bearer ${tokenPara('SINDICO')}`)
      .send({
        nome: 'X',
        email: 'x@example.com',
        senha: 'senha-forte-123',
        condominioId: 'cond-1',
      });

    expect(response.status).toBe(403);
  });
});
