import nodemailer, { Transporter } from 'nodemailer';
import { logger } from './logger';

/** Imagem embutida no próprio e-mail, citada no HTML por `<img src="cid:...">`. */
export interface AnexoInline {
  cid: string;
  nomeArquivo: string;
  conteudo: Buffer;
  tipo: string;
}

export interface Email {
  para: string;
  assunto: string;
  texto: string;
  html?: string;
  anexos?: AnexoInline[];
  /** Endereço que recebe as respostas; sem ele vale `MAIL_REPLY_TO` do ambiente (ou nenhum). */
  responderPara?: string;
}

/**
 * Envio de e-mail por SMTP (nodemailer). Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
 * `SMTP_PASS` e `MAIL_FROM` no `.env`, funciona com Gmail (senha de app), Outlook ou o SMTP da
 * instituição. Sem `SMTP_HOST` o e-mail não sai: o conteúdo vai pro log do servidor, o que permite
 * testar o fluxo inteiro localmente (ex.: copiar o link de acesso do log).
 */
export interface Mailer {
  enviar(email: Email): Promise<void>;
}

export class SmtpMailer implements Mailer {
  private transporte: Transporter | null = null;

  private obterTransporte(): Transporter | null {
    const host = process.env.SMTP_HOST;
    if (!host) return null;

    if (!this.transporte) {
      const porta = Number(process.env.SMTP_PORT ?? 587);
      const usuario = process.env.SMTP_USER;
      this.transporte = nodemailer.createTransport({
        host,
        port: porta,
        secure: porta === 465,
        auth: usuario ? { user: usuario, pass: process.env.SMTP_PASS ?? '' } : undefined,
      });
    }
    return this.transporte;
  }

  /**
   * Confere se o SMTP está configurado e se a conexão e o login funcionam, sem enviar nada. Usado pelo
   * comando `smtp:testar`; lança com a causa quando algo está errado.
   */
  async verificar(): Promise<void> {
    const transporte = this.obterTransporte();
    if (!transporte) {
      throw Object.assign(
        new Error('SMTP_HOST não está configurado: o e-mail não sairia, só iria para o log.'),
        { code: 'SMTP_NAO_CONFIGURADO' },
      );
    }
    await transporte.verify();
  }

  async enviar(email: Email): Promise<void> {
    const transporte = this.obterTransporte();

    if (!transporte) {
      logger.warn('SMTP não configurado: e-mail NÃO enviado, conteúdo abaixo (somente log)', {
        para: email.para,
        assunto: email.assunto,
        texto: email.texto,
      });
      return;
    }

    const resultado = await transporte.sendMail({
      from: process.env.MAIL_FROM ?? 'USAI <nao-responda@usai.local>',
      to: email.para,
      subject: email.assunto,
      text: email.texto,
      html: email.html,
      replyTo: email.responderPara ?? process.env.MAIL_REPLY_TO,
      // Mensagem automática do sistema: evita respostas automáticas em cadeia (férias, "fora do escritório").
      headers: { 'Auto-Submitted': 'auto-generated', 'X-Auto-Response-Suppress': 'OOF, AutoReply' },
      attachments: email.anexos?.map((anexo) => ({
        filename: anexo.nomeArquivo,
        content: anexo.conteudo,
        cid: anexo.cid,
        contentType: anexo.tipo,
        contentDisposition: 'inline' as const,
      })),
    });

    // O servidor aceitou a mensagem (isso não garante que caiu na caixa de entrada: pode ir pro spam).
    // Guardar a resposta dele é o que permite provar o que aconteceu quando alguém diz "não chegou".
    const recusados = (resultado.rejected ?? []).map(String);
    const log = {
      para: email.para,
      assunto: email.assunto,
      messageId: resultado.messageId,
      aceitos: (resultado.accepted ?? []).map(String),
      recusados,
      respostaDoServidor: resultado.response,
    };
    if (recusados.length > 0) {
      logger.warn('Servidor de e-mail RECUSOU o destinatário', log);
    } else {
      logger.info('E-mail entregue ao servidor de e-mail', log);
    }
  }
}

/** Explica em português o que costuma estar por trás de um erro de SMTP (pelo código do nodemailer). */
export function dicaDeErroSmtp(error: unknown): string {
  const codigo = (error as { code?: unknown } | null)?.code;

  switch (codigo) {
    case 'SMTP_NAO_CONFIGURADO':
      return 'Defina SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS e MAIL_FROM no .env (modelo em .env.example) e rode de novo.';
    case 'EAUTH':
      return 'Usuário ou senha recusados. No Gmail é preciso uma "senha de app" (não a senha normal da conta) e a verificação em duas etapas ligada.';
    case 'ENOTFOUND':
    case 'EDNS':
      return 'O endereço do servidor (SMTP_HOST) não foi encontrado. Confira o nome e a conexão com a internet.';
    case 'ECONNREFUSED':
      return 'O servidor recusou a conexão. Confira SMTP_PORT (587 para STARTTLS, 465 para SSL).';
    case 'ETIMEDOUT':
    case 'ECONNECTION':
    case 'ESOCKET':
      return 'Não foi possível conectar. Confira SMTP_HOST e SMTP_PORT e se a rede ou o firewall liberam saída nessa porta.';
    case 'EENVELOPE':
      return 'O servidor recusou o remetente ou o destinatário. Confira MAIL_FROM (no Gmail precisa ser a própria conta) e o endereço de destino.';
    default:
      return 'Erro não reconhecido; a mensagem acima vem direto do servidor de e-mail.';
  }
}

/** URL pública do frontend, usada nos links enviados por e-mail. */
export function urlDoApp(): string {
  let url = process.env.APP_URL ?? 'http://localhost:5173';
  // Tira as barras do final sem regex (uma regex como /\/+$/ tem custo super-linear em entradas longas).
  while (url.endsWith('/')) url = url.slice(0, -1);
  return url;
}
