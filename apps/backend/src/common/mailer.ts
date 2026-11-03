import nodemailer, { Transporter } from 'nodemailer';
import { logger } from './logger';

export interface Email {
  para: string;
  assunto: string;
  texto: string;
  html?: string;
}

/**
 * Envio de e-mail por SMTP (nodemailer). Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
 * `SMTP_PASS` e `MAIL_FROM` no `.env` — funciona com Gmail (senha de app), Outlook ou o SMTP da
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

  async enviar(email: Email): Promise<void> {
    const transporte = this.obterTransporte();

    if (!transporte) {
      logger.warn('SMTP não configurado — e-mail NÃO enviado, conteúdo abaixo (somente log)', {
        para: email.para,
        assunto: email.assunto,
        texto: email.texto,
      });
      return;
    }

    await transporte.sendMail({
      from: process.env.MAIL_FROM ?? 'USAI <nao-responda@usai.local>',
      to: email.para,
      subject: email.assunto,
      text: email.texto,
      html: email.html,
    });
  }
}

/** URL pública do frontend, usada nos links enviados por e-mail. */
export function urlDoApp(): string {
  let url = process.env.APP_URL ?? 'http://localhost:5173';
  // Tira as barras do final sem regex (uma regex como /\/+$/ tem custo super-linear em entradas longas).
  while (url.endsWith('/')) url = url.slice(0, -1);
  return url;
}
