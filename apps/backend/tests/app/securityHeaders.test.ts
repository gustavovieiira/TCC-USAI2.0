import request from 'supertest';
import { createApp } from '@/app';

describe('cabeçalhos de segurança', () => {
  it('toda resposta leva nosniff, anti-iframe e política de referência, e não anuncia o Express', async () => {
    const response = await request(createApp()).get('/health');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['referrer-policy']).toBe('no-referrer');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('respostas de erro também levam os cabeçalhos', async () => {
    const response = await request(createApp()).get('/api/sindico/moradores');

    expect(response.status).toBe(401);
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  it('HSTS só é enviado quando a requisição chegou por HTTPS', async () => {
    const app = createApp();
    app.set('trust proxy', true);

    const http = await request(app).get('/health');
    const https = await request(app).get('/health').set('X-Forwarded-Proto', 'https');

    expect(http.headers['strict-transport-security']).toBeUndefined();
    expect(https.headers['strict-transport-security']).toContain('max-age=');
  });

  it('não bloqueia o carregamento das fotos por outra origem (sem Cross-Origin-Resource-Policy)', async () => {
    const response = await request(createApp()).get('/health');

    expect(response.headers['cross-origin-resource-policy']).toBeUndefined();
  });
});
