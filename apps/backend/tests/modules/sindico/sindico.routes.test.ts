import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '@/app';

const ACCESS_SECRET = 'test-access-secret';

beforeAll(() => {
  process.env.JWT_ACCESS_SECRET = ACCESS_SECRET;
});

function tokenPara(papel: 'MORADOR' | 'SINDICO'): string {
  return jwt.sign({ userId: 'user-1', papel, condominioId: 'cond-1' }, ACCESS_SECRET, {
    expiresIn: '1h',
  });
}

describe('RBAC de /api/sindico — rotas exclusivas do papel SINDICO', () => {
  const app = createApp();

  it('bloqueia morador tentando ver o painel do condomínio', async () => {
    const response = await request(app)
      .get('/api/sindico/condominio')
      .set('Authorization', `Bearer ${tokenPara('MORADOR')}`);

    expect(response.status).toBe(403);
  });

  it('bloqueia morador tentando listar moradores do condomínio', async () => {
    const response = await request(app)
      .get('/api/sindico/moradores')
      .set('Authorization', `Bearer ${tokenPara('MORADOR')}`);

    expect(response.status).toBe(403);
  });

  it('bloqueia morador tentando atualizar o PIN do condomínio', async () => {
    const response = await request(app)
      .patch('/api/sindico/condominio/pin')
      .set('Authorization', `Bearer ${tokenPara('MORADOR')}`)
      .send({ pin: '9999' });

    expect(response.status).toBe(403);
  });
});
