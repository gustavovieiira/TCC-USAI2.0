import fs from 'fs';
import os from 'os';
import path from 'path';
import request from 'supertest';
import express from 'express';
import {
  emProducao,
  iguaisEmTempoConstante,
  segredosJwt,
  validarConfiguracao,
} from '@/common/config';
import { formatoDaImagem, garantirImagemReal } from '@/common/imagem';
import { limitarFalhas } from '@/common/rateLimit';
import { ehEnderecoPrivado, somenteRedePrivada } from '@/common/redePrivada';
import { senhaSchema } from '@/common/senha';
import { errorHandler } from '@/common/errorHandler';

const SEGREDO_FORTE = 'x'.repeat(40);
const ambienteOriginal = { ...process.env };

afterEach(() => {
  process.env = { ...ambienteOriginal };
});

describe('configuração obrigatória em produção', () => {
  it('em desenvolvimento aceita os segredos padrão', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.JWT_ACCESS_SECRET;
    delete process.env.JWT_REFRESH_SECRET;

    expect(emProducao()).toBe(false);
    expect(segredosJwt()).toEqual({
      accessSecret: 'dev-secret',
      refreshSecret: 'dev-refresh-secret',
    });
    expect(() => validarConfiguracao()).not.toThrow();
  });

  it('em produção recusa subir sem segredos, com segredo padrão ou curto', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_ACCESS_SECRET;
    expect(() => segredosJwt()).toThrow(/JWT_ACCESS_SECRET/);

    process.env.JWT_ACCESS_SECRET = 'dev-secret';
    expect(() => segredosJwt()).toThrow(/JWT_ACCESS_SECRET/);

    process.env.JWT_ACCESS_SECRET = 'curto';
    expect(() => segredosJwt()).toThrow(/32 caracteres/);
  });

  it('em produção exige os dois segredos diferentes, CORS e o token do webhook do Asaas', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_ACCESS_SECRET = SEGREDO_FORTE;
    process.env.JWT_REFRESH_SECRET = SEGREDO_FORTE;
    delete process.env.CORS_ORIGINS;
    process.env.ASAAS_API_KEY = 'chave';
    delete process.env.ASAAS_WEBHOOK_TOKEN;

    expect(() => validarConfiguracao()).toThrow(
      /diferentes[\s\S]*CORS_ORIGINS[\s\S]*ASAAS_WEBHOOK_TOKEN/,
    );
  });

  it('em produção com tudo certo, sobe', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_ACCESS_SECRET = SEGREDO_FORTE;
    process.env.JWT_REFRESH_SECRET = 'y'.repeat(40);
    process.env.CORS_ORIGINS = 'https://app.exemplo.com.br';
    process.env.ASAAS_API_KEY = 'chave';
    process.env.ASAAS_WEBHOOK_TOKEN = 'token';

    expect(() => validarConfiguracao()).not.toThrow();
  });

  it('compara segredos em tempo constante, inclusive de tamanhos diferentes', () => {
    expect(iguaisEmTempoConstante('1234', '1234')).toBe(true);
    expect(iguaisEmTempoConstante('1234', '1235')).toBe(false);
    expect(iguaisEmTempoConstante('1234', '12345')).toBe(false);
  });
});

describe('política de senha', () => {
  it.each(['password', 'SENHA123', '12345678', 'aaaaaaaa', 'abababab'])('recusa %s', (senha) => {
    expect(senhaSchema.safeParse(senha).success).toBe(false);
  });

  it('recusa senha acima do limite de 72 bytes do bcrypt', () => {
    expect(senhaSchema.safeParse('a1'.repeat(37)).success).toBe(false);
  });

  it('aceita uma senha razoável', () => {
    expect(senhaSchema.safeParse('cafe-com-pao-42').success).toBe(true);
  });
});

describe('uploads: conteúdo real da imagem', () => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'usai-img-'));
  afterAll(() => fs.rmSync(pasta, { recursive: true, force: true }));

  it('reconhece JPEG, PNG e WebP pelos primeiros bytes', () => {
    expect(formatoDaImagem(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0]))).toBe('jpeg');
    expect(formatoDaImagem(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe(
      'png',
    );
    expect(formatoDaImagem(Buffer.from('RIFF\0\0\0\0WEBPVP8 ', 'latin1'))).toBe('webp');
    expect(formatoDaImagem(Buffer.from('<html><script>alert(1)</script>'))).toBeNull();
    expect(formatoDaImagem(Buffer.alloc(0))).toBeNull();
  });

  it('apaga e recusa um arquivo que só declara ser imagem', async () => {
    const falso = path.join(pasta, 'falso.png');
    fs.writeFileSync(falso, '<html><script>alert(1)</script></html>');

    await expect(garantirImagemReal(falso)).rejects.toMatchObject({ statusCode: 400 });
    expect(fs.existsSync(falso)).toBe(false);
  });

  it('mantém a imagem verdadeira', async () => {
    const certo = path.join(pasta, 'certo.jpg');
    fs.writeFileSync(certo, Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]));

    await expect(garantirImagemReal(certo)).resolves.toBeUndefined();
    expect(fs.existsSync(certo)).toBe(true);
  });

  it('arquivo que não existe é tratado como inválido', async () => {
    await expect(garantirImagemReal(path.join(pasta, 'nada.png'))).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});

describe('/metrics só para a rede interna', () => {
  it.each([
    '127.0.0.1',
    '::1',
    '::ffff:127.0.0.1',
    '10.1.2.3',
    '172.18.0.5',
    '192.168.0.9',
    'fd00::1',
  ])('%s é privado', (ip) => expect(ehEnderecoPrivado(ip)).toBe(true));

  it.each(['8.8.8.8', '172.32.0.1', '203.0.113.7', '2001:db8::1', 'lixo', '', undefined])(
    '%s é público',
    (ip) => expect(ehEnderecoPrivado(ip as string | undefined)).toBe(false),
  );

  it('responde 404 para quem vem da internet e 200 para a rede privada', async () => {
    const app = express();
    app.set('trust proxy', 1);
    app.get('/metrics', somenteRedePrivada, (_req, res) => res.send('ok'));

    const dePublico = await request(app).get('/metrics').set('X-Forwarded-For', '203.0.113.7');
    const dePrivado = await request(app).get('/metrics').set('X-Forwarded-For', '10.0.0.4');

    expect(dePublico.status).toBe(404);
    expect(dePrivado.status).toBe(200);
  });
});

describe('limitarFalhas', () => {
  function montar(zeraNoSucesso = false) {
    const app = express();
    app.use(express.json());
    app.post(
      '/entrar',
      limitarFalhas({
        max: 3,
        janelaMs: 60_000,
        chave: (req) => req.body?.email,
        zeraNoSucesso,
        ativoEmTeste: true,
      }),
      (req, res) => res.status(req.body.senha === 'certa' ? 200 : 401).json({}),
    );
    app.use(errorHandler);
    return app;
  }
  const tentar = (app: express.Express, email: string, senha: string) =>
    request(app).post('/entrar').send({ email, senha });

  it('só as tentativas que erram contam, e bloqueia na quarta', async () => {
    const app = montar();

    for (let i = 0; i < 3; i += 1) {
      expect((await tentar(app, 'a@x.com', 'errada')).status).toBe(401);
    }
    const bloqueada = await tentar(app, 'a@x.com', 'certa');

    expect(bloqueada.status).toBe(429);
    expect(bloqueada.body.error.code).toBe('TOO_MANY_REQUESTS');
    // Outra conta não é afetada.
    expect((await tentar(app, 'b@x.com', 'certa')).status).toBe(200);
  });

  it('acertos nunca bloqueiam quem acerta', async () => {
    const app = montar();
    for (let i = 0; i < 6; i += 1) {
      expect((await tentar(app, 'c@x.com', 'certa')).status).toBe(200);
    }
  });

  it('com zeraNoSucesso, um acerto recomeça a contagem', async () => {
    const app = montar(true);
    await tentar(app, 'd@x.com', 'errada');
    await tentar(app, 'd@x.com', 'errada');
    await tentar(app, 'd@x.com', 'certa');
    await tentar(app, 'd@x.com', 'errada');
    await tentar(app, 'd@x.com', 'errada');

    expect((await tentar(app, 'd@x.com', 'certa')).status).toBe(200);
  });
});
