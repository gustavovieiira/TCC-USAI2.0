import { Request } from 'express';
import { criarLimitador, limitarFalhas } from '@/common/rateLimit';

const QUINZE_MIN = 15 * 60 * 1000;
const UMA_HORA = 60 * 60 * 1000;

function textoDoCorpo(req: Request, campo: string): string | undefined {
  const valor = (req.body as Record<string, unknown> | undefined)?.[campo];
  return typeof valor === 'string' && valor.trim() ? valor.trim().toLowerCase() : undefined;
}

/** Contra adivinhar senhas: por endereço (qualquer e-mail) e por e-mail (qualquer endereço). */
export const limitarLoginPorIp = limitarFalhas({
  max: 40,
  janelaMs: QUINZE_MIN,
  chave: (req) => req.ip,
  mensagem: 'Muitas tentativas de entrar a partir deste endereço. Tente de novo em alguns minutos.',
});

export const limitarLoginPorEmail = limitarFalhas({
  max: 8,
  janelaMs: QUINZE_MIN,
  chave: (req) => textoDoCorpo(req, 'email'),
  zeraNoSucesso: true,
  mensagem:
    'Muitas tentativas de entrar nesta conta. Aguarde 15 minutos ou use "Esqueci minha senha".',
});

/** Contra adivinhar o PIN do condomínio (4 dígitos): por endereço e por condomínio. */
export const limitarCadastroPorIp = limitarFalhas({
  max: 10,
  janelaMs: UMA_HORA,
  chave: (req) => req.ip,
  mensagem: 'Muitas tentativas de cadastro a partir deste endereço. Tente de novo em uma hora.',
});

export const limitarCadastroPorCondominio = limitarFalhas({
  max: 20,
  janelaMs: UMA_HORA,
  chave: (req) => textoDoCorpo(req, 'linkSlug'),
  zeraNoSucesso: true,
  mensagem:
    'Muitas tentativas de PIN para este condomínio. Por segurança, aguarde uma hora ou peça o PIN ao síndico.',
});

export const limitarCadastros = criarLimitador({
  max: 30,
  janelaMs: UMA_HORA,
  mensagem: 'Muitos cadastros a partir deste endereço. Tente de novo em uma hora.',
});

export const limitarRenovacaoDeSessao = criarLimitador({
  max: 120,
  janelaMs: QUINZE_MIN,
  mensagem: 'Muitas renovações de sessão. Aguarde alguns minutos.',
});

export const limitarTrocaDeSenha = criarLimitador({
  max: 20,
  janelaMs: UMA_HORA,
  mensagem: 'Muitas tentativas a partir deste endereço. Tente de novo em uma hora.',
});
