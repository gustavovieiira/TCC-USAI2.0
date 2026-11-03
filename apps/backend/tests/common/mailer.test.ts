import { logger } from '@/common/logger';
import { dicaDeErroSmtp, SmtpMailer, urlDoApp } from '@/common/mailer';

const sendMail = jest.fn();
jest.mock('nodemailer', () => ({
  __esModule: true,
  default: {
    createTransport: jest.fn(() => ({
      sendMail: (...args: unknown[]) => sendMail(...args),
      verify: jest.fn(),
    })),
  },
}));

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

describe('SmtpMailer.verificar', () => {
  it('sem SMTP_HOST avisa que o e-mail só iria pro log, em vez de fingir que deu certo', async () => {
    const original = process.env.SMTP_HOST;
    delete process.env.SMTP_HOST;

    await expect(new SmtpMailer().verificar()).rejects.toThrow(/SMTP_HOST não está configurado/);

    if (original !== undefined) process.env.SMTP_HOST = original;
  });
});

describe('dicaDeErroSmtp', () => {
  it.each([
    ['SMTP_NAO_CONFIGURADO', /\.env/],
    ['EAUTH', /senha de app/],
    ['ENOTFOUND', /SMTP_HOST/],
    ['ECONNREFUSED', /SMTP_PORT/],
    ['ETIMEDOUT', /firewall/],
    ['ECONNECTION', /firewall/],
    ['EENVELOPE', /MAIL_FROM/],
  ])('explica o erro %s', (codigo, padrao) => {
    expect(dicaDeErroSmtp({ code: codigo })).toMatch(padrao);
  });

  it('erro desconhecido ou sem código ainda devolve uma mensagem útil', () => {
    expect(dicaDeErroSmtp({ code: 'XYZ' })).toMatch(/não reconhecido/);
    expect(dicaDeErroSmtp(new Error('falhou'))).toMatch(/não reconhecido/);
    expect(dicaDeErroSmtp(null)).toMatch(/não reconhecido/);
  });
});

describe('SmtpMailer.enviar com SMTP configurado', () => {
  const original = process.env.SMTP_HOST;
  const email = {
    para: 'sindico@exemplo.com',
    assunto: 'Seu condomínio na USAI está ativo',
    texto: 'corpo',
    html: '<p>corpo</p>',
    anexos: [
      { cid: 'logo-usai', nomeArquivo: 'usai.png', conteudo: Buffer.from('x'), tipo: 'image/png' },
    ],
  };

  beforeEach(() => {
    process.env.SMTP_HOST = 'smtp.exemplo.com';
    sendMail.mockReset();
    jest.restoreAllMocks();
  });

  afterAll(() => {
    if (original === undefined) delete process.env.SMTP_HOST;
    else process.env.SMTP_HOST = original;
  });

  it('manda o e-mail com a logo como anexo inline (cid) e registra a resposta do servidor', async () => {
    sendMail.mockResolvedValue({
      accepted: ['sindico@exemplo.com'],
      rejected: [],
      messageId: '<abc@exemplo.com>',
      response: '250 2.0.0 OK gsmtp',
    });
    const info = jest.spyOn(logger, 'info').mockReturnValue(logger);

    await new SmtpMailer().enviar(email);

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'sindico@exemplo.com',
        subject: 'Seu condomínio na USAI está ativo',
        html: '<p>corpo</p>',
        // mensagem automática: não deve gerar respostas automáticas em cadeia
        headers: expect.objectContaining({ 'Auto-Submitted': 'auto-generated' }),
        attachments: [
          expect.objectContaining({
            cid: 'logo-usai',
            contentDisposition: 'inline',
            contentType: 'image/png',
          }),
        ],
      }),
    );
    expect(info).toHaveBeenCalledWith(
      'E-mail entregue ao servidor de e-mail',
      expect.objectContaining({
        para: 'sindico@exemplo.com',
        aceitos: ['sindico@exemplo.com'],
        recusados: [],
        messageId: '<abc@exemplo.com>',
        respostaDoServidor: '250 2.0.0 OK gsmtp',
      }),
    );
  });

  it('usa MAIL_REPLY_TO como endereço de resposta, e o do próprio e-mail tem prioridade', async () => {
    sendMail.mockResolvedValue({ accepted: ['sindico@exemplo.com'], rejected: [] });
    jest.spyOn(logger, 'info').mockReturnValue(logger);
    const original = process.env.MAIL_REPLY_TO;

    process.env.MAIL_REPLY_TO = 'contato@usai.exemplo.com';
    await new SmtpMailer().enviar(email);
    expect(sendMail).toHaveBeenLastCalledWith(
      expect.objectContaining({ replyTo: 'contato@usai.exemplo.com' }),
    );

    await new SmtpMailer().enviar({ ...email, responderPara: 'financeiro@usai.exemplo.com' });
    expect(sendMail).toHaveBeenLastCalledWith(
      expect.objectContaining({ replyTo: 'financeiro@usai.exemplo.com' }),
    );

    delete process.env.MAIL_REPLY_TO;
    await new SmtpMailer().enviar(email);
    expect(sendMail.mock.calls.at(-1)?.[0].replyTo).toBeUndefined();

    if (original !== undefined) process.env.MAIL_REPLY_TO = original;
  });

  it('avisa em nível de alerta quando o servidor recusa o destinatário', async () => {
    sendMail.mockResolvedValue({
      accepted: [],
      rejected: ['sindico@exemplo.com'],
      messageId: '<abc@exemplo.com>',
      response: '550 usuário inexistente',
    });
    const warn = jest.spyOn(logger, 'warn').mockReturnValue(logger);
    const info = jest.spyOn(logger, 'info').mockReturnValue(logger);

    await new SmtpMailer().enviar({ ...email, anexos: undefined });

    expect(warn).toHaveBeenCalledWith(
      'Servidor de e-mail RECUSOU o destinatário',
      expect.objectContaining({ recusados: ['sindico@exemplo.com'] }),
    );
    expect(info).not.toHaveBeenCalled();
  });

  it('se o envio falha, o erro sobe pra quem chamou (nada de engolir)', async () => {
    sendMail.mockRejectedValue(Object.assign(new Error('Invalid login'), { code: 'EAUTH' }));

    await expect(new SmtpMailer().enviar(email)).rejects.toThrow('Invalid login');
  });
});
