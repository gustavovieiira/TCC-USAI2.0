import request from 'supertest';
import { createApp } from '@/app';
import { origensPermitidas } from '@/common/cors';

describe('CORS restrito às origens do front', () => {
  const original = process.env.CORS_ORIGINS;

  afterEach(() => {
    if (original === undefined) delete process.env.CORS_ORIGINS;
    else process.env.CORS_ORIGINS = original;
  });

  it('por padrão só o front local é autorizado', () => {
    delete process.env.CORS_ORIGINS;

    expect(origensPermitidas()).toEqual(['http://localhost:5173', 'http://127.0.0.1:5173']);
  });

  it('CORS_ORIGINS troca a lista (aceita vários, ignora espaços e vazios)', () => {
    process.env.CORS_ORIGINS = ' https://app.usai.com.br , https://admin.usai.com.br ,, ';

    expect(origensPermitidas()).toEqual(['https://app.usai.com.br', 'https://admin.usai.com.br']);
  });

  it('a API responde com a origem autorizada e não libera as outras', async () => {
    delete process.env.CORS_ORIGINS;
    const app = createApp();

    const permitida = await request(app).get('/health').set('Origin', 'http://localhost:5173');
    expect(permitida.headers['access-control-allow-origin']).toBe('http://localhost:5173');

    const estranha = await request(app)
      .get('/health')
      .set('Origin', 'https://site-malicioso.example');
    expect(estranha.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('o preflight de uma origem estranha não recebe autorização', async () => {
    delete process.env.CORS_ORIGINS;

    const resposta = await request(createApp())
      .options('/api/auth/login')
      .set('Origin', 'https://site-malicioso.example')
      .set('Access-Control-Request-Method', 'POST');

    expect(resposta.headers['access-control-allow-origin']).toBeUndefined();
  });
});
