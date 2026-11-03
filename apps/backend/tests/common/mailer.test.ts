import { SmtpMailer, urlDoApp } from '@/common/mailer';

describe('urlDoApp', () => {
  const original = process.env.APP_URL;

  afterEach(() => {
    if (original === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = original;
  });

  it('sem APP_URL usa o endereço do frontend local', () => {
    delete process.env.APP_URL;
    expect(urlDoApp()).toBe('http://localhost:5173');
  });

  it('tira as barras do final, uma ou várias, e mantém o resto', () => {
    process.env.APP_URL = 'https://usai.exemplo.com/';
    expect(urlDoApp()).toBe('https://usai.exemplo.com');

    process.env.APP_URL = 'https://usai.exemplo.com/app///';
    expect(urlDoApp()).toBe('https://usai.exemplo.com/app');

    process.env.APP_URL = 'https://usai.exemplo.com';
    expect(urlDoApp()).toBe('https://usai.exemplo.com');
  });

  it('aguenta uma entrada enorme cheia de barras sem travar', () => {
    process.env.APP_URL = `https://usai.exemplo.com${'/'.repeat(200_000)}`;

    const inicio = Date.now();
    expect(urlDoApp()).toBe('https://usai.exemplo.com');
    expect(Date.now() - inicio).toBeLessThan(500);
  });
});

describe('SmtpMailer sem SMTP configurado', () => {
  it('não envia: só registra o conteúdo (permite testar o fluxo localmente)', async () => {
    const original = process.env.SMTP_HOST;
    delete process.env.SMTP_HOST;

    await expect(
      new SmtpMailer().enviar({ para: 'a@b.com', assunto: 'Oi', texto: 'corpo' }),
    ).resolves.toBeUndefined();

    if (original !== undefined) process.env.SMTP_HOST = original;
  });
});
