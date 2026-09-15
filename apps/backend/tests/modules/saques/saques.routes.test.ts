import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '@/app';

const ACCESS_SECRET = 'test-access-secret';

beforeAll(() => {
  process.env.JWT_ACCESS_SECRET = ACCESS_SECRET;
});

function tokenPara(papel: 'MORADOR' | 'ADMIN'): string {
  return jwt.sign(
    { userId: 'user-1', papel, condominioId: papel === 'MORADOR' ? 'cond-1' : null },
    ACCESS_SECRET,
    { expiresIn: '1h' },
  );
}

describe('RBAC de /api/saques — rotas de avaliação são exclusivas do Admin USAI', () => {
  const app = createApp();

  it('bloqueia morador tentando listar todas as solicitações de saque', async () => {
    const response = await request(app)
      .get('/api/saques')
      .set('Authorization', `Bearer ${tokenPara('MORADOR')}`);

    expect(response.status).toBe(403);
  });

  it('bloqueia morador tentando aprovar saque', async () => {
    const response = await request(app)
      .post('/api/saques/qualquer-id/aprovar')
      .set('Authorization', `Bearer ${tokenPara('MORADOR')}`);

    expect(response.status).toBe(403);
  });

  it('bloqueia morador tentando rejeitar saque', async () => {
    const response = await request(app)
      .post('/api/saques/qualquer-id/rejeitar')
      .set('Authorization', `Bearer ${tokenPara('MORADOR')}`)
      .send({ motivoRejeicao: 'teste' });

    expect(response.status).toBe(403);
  });
});
