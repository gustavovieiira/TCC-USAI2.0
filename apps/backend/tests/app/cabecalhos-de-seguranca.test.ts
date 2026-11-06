import request from 'supertest';
import { createApp } from '@/app';

describe('cabeçalhos de segurança e proteções do app', () => {
  const app = createApp();

  it('toda resposta traz os cabeçalhos de segurança', async () => {
    const res = await request(app).get('/health');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['content-security-policy']).toContain("default-src 'none'");
    expect(res.headers['permissions-policy']).toContain('camera=()');
    expect(res.headers['cross-origin-opener-policy']).toBe('same-origin');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('respostas de /api nunca ficam em cache (têm dados pessoais e financeiros)', async () => {
    const res = await request(app).get('/api/itens');

    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('o corpo da requisição tem limite de tamanho', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.com', senha: 'x'.repeat(200_000) });

    expect(res.status).toBe(413);
  });

  it('/metrics responde para a rede interna e some para a internet', async () => {
    // supertest chama pelo endereço local (::ffff:127.0.0.1), que é da rede interna
    expect((await request(app).get('/metrics')).status).toBe(200);
  });

  it('as rotas de privacidade (LGPD) exigem login', async () => {
    expect((await request(app).get('/api/privacidade/meus-dados')).status).toBe(401);
    expect((await request(app).post('/api/privacidade/excluir-conta')).status).toBe(401);
  });

  it('a rota de logout exige login', async () => {
    expect((await request(app).post('/api/auth/logout')).status).toBe(401);
  });
});

describe('erros de formato da requisição', () => {
  it('JSON malformado devolve 400, não 500', async () => {
    const res = await request(createApp())
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });
});
