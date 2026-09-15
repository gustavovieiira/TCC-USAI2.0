import request from 'supertest';
import { createApp } from '@/app';

describe('Rotas protegidas exigem autenticação (RNF08)', () => {
  const app = createApp();

  it('GET /api/itens sem token retorna 401', async () => {
    const response = await request(app).get('/api/itens');
    expect(response.status).toBe(401);
  });

  it('POST /api/itens sem token retorna 401', async () => {
    const response = await request(app).post('/api/itens').send({});
    expect(response.status).toBe(401);
  });

  it('GET /api/locacoes/minhas sem token retorna 401', async () => {
    const response = await request(app).get('/api/locacoes/minhas');
    expect(response.status).toBe(401);
  });

  it('POST /api/locacoes/:id/aprovar sem token retorna 401', async () => {
    const response = await request(app).post('/api/locacoes/qualquer-id/aprovar');
    expect(response.status).toBe(401);
  });

  it('rejeita token malformado com 401', async () => {
    const response = await request(app)
      .get('/api/itens')
      .set('Authorization', 'Bearer token-invalido');
    expect(response.status).toBe(401);
  });
});
