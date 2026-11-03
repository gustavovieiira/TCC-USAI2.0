import { Email } from '@/common/mailer';

const HORAS_VALIDADE = 48;

/** E-mail enviado ao síndico quando o PIX é confirmado: link de uso único pra criar a senha. */
export function emailAcessoSindico(input: {
  para: string;
  nomeSindico: string;
  nomeCondominio: string;
  link: string;
}): Email {
  const texto = [
    `Olá, ${input.nomeSindico}!`,
    '',
    `Recebemos o pagamento e o condomínio "${input.nomeCondominio}" já está ativo na USAI.`,
    '',
    'Para entrar pela primeira vez, crie a sua senha neste link:',
    input.link,
    '',
    `O link vale por ${HORAS_VALIDADE} horas e só pode ser usado uma vez. Se expirar, peça um novo na tela de acompanhamento da contratação.`,
    '',
    'Depois de entrar, no painel do síndico você encontra o link e o PIN de acesso para compartilhar com os moradores.',
    '',
    'Equipe USAI',
  ].join('\n');

  const html = `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:auto;color:#241D18">
  <h2 style="color:#B4502F;margin-bottom:4px">Seu condomínio está ativo!</h2>
  <p>Olá, ${escapar(input.nomeSindico)}!</p>
  <p>Recebemos o pagamento e o condomínio <strong>${escapar(input.nomeCondominio)}</strong> já está ativo na USAI.</p>
  <p>
    <a href="${input.link}" style="display:inline-block;background:#B4502F;color:#FFFCF7;padding:12px 20px;text-decoration:none;font-weight:bold">
      Criar minha senha e entrar
    </a>
  </p>
  <p style="font-size:13px;color:#6b5f55">O link vale por ${HORAS_VALIDADE} horas e só pode ser usado uma vez. Se o botão não funcionar, copie este endereço:<br>${input.link}</p>
  <p>No painel do síndico você encontra o link e o PIN de acesso para compartilhar com os moradores.</p>
  <p style="color:#6b5f55">Equipe USAI</p>
</div>`.trim();

  return { para: input.para, assunto: 'Seu condomínio na USAI está ativo', texto, html };
}

function escapar(valor: string): string {
  return valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const HORAS_VALIDADE_ACESSO = HORAS_VALIDADE;
