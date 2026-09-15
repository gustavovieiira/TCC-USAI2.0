import request from 'supertest';
import { createApp } from '@/app';

describe('GET /health', () => {
  it('responde 200 com status ok', async () => {
    const app = createApp();
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });
});

describe('GET /metrics', () => {
  it('expõe métricas no formato Prometheus', async () => {
    const app = createApp();
    const response = await request(app).get('/metrics');

    expect(response.status).toBe(200);
    expect(response.text).toContain('http_request_duration_seconds');
  });
});
