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

  it('POST /api/itens/upload-imagem sem token retorna 401', async () => {
    const response = await request(app).post('/api/itens/upload-imagem');
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

  it('GET /api/locacoes/:id/mensagens sem token retorna 401', async () => {
    const response = await request(app).get('/api/locacoes/qualquer-id/mensagens');
    expect(response.status).toBe(401);
  });

  it('POST /api/locacoes/:id/mensagens sem token retorna 401', async () => {
    const response = await request(app).post('/api/locacoes/qualquer-id/mensagens').send({});
    expect(response.status).toBe(401);
  });

  it('POST /api/saques sem token retorna 401', async () => {
    const response = await request(app).post('/api/saques').send({});
    expect(response.status).toBe(401);
  });

  it('GET /api/saques/minhas sem token retorna 401', async () => {
    const response = await request(app).get('/api/saques/minhas');
    expect(response.status).toBe(401);
  });

  it('GET /api/saques (admin) sem token retorna 401', async () => {
    const response = await request(app).get('/api/saques');
    expect(response.status).toBe(401);
  });

  it('POST /api/saques/:id/aprovar sem token retorna 401', async () => {
    const response = await request(app).post('/api/saques/qualquer-id/aprovar');
    expect(response.status).toBe(401);
  });

  it('GET /api/sindico/condominio sem token retorna 401', async () => {
    const response = await request(app).get('/api/sindico/condominio');
    expect(response.status).toBe(401);
  });

  it('GET /api/sindico/moradores sem token retorna 401', async () => {
    const response = await request(app).get('/api/sindico/moradores');
    expect(response.status).toBe(401);
  });

  it('GET /api/sindico/locacoes sem token retorna 401', async () => {
    const response = await request(app).get('/api/sindico/locacoes');
    expect(response.status).toBe(401);
  });

  it('PATCH /api/sindico/condominio/pin sem token retorna 401', async () => {
    const response = await request(app).patch('/api/sindico/condominio/pin').send({});
    expect(response.status).toBe(401);
  });

  it('GET /api/admin/condominios sem token retorna 401', async () => {
    const response = await request(app).get('/api/admin/condominios');
    expect(response.status).toBe(401);
  });

  it('POST /api/admin/sindicos sem token retorna 401', async () => {
    const response = await request(app).post('/api/admin/sindicos').send({});
    expect(response.status).toBe(401);
  });

  it('GET /api/admin/financeiro/resumo sem token retorna 401', async () => {
    const response = await request(app).get('/api/admin/financeiro/resumo');
    expect(response.status).toBe(401);
  });

  it('rejeita token malformado com 401', async () => {
    const response = await request(app)
      .get('/api/itens')
      .set('Authorization', 'Bearer token-invalido');
    expect(response.status).toBe(401);
  });
});
