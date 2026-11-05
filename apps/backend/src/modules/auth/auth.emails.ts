import { Email, urlDoApp } from '@/common/mailer';
import { LOGO_CID } from '@/modules/assinaturas/assinaturas.emails';
import { LOGO_USAI_PNG_BASE64 } from '@/modules/assinaturas/assinaturas.logo';

/** Cores da identidade da USAI, fixas porque e-mail não lê o CSS do app. */
const COR = {
  papel: '#F2EAE0',
  superficie: '#FFFCF7',
  tinta: '#241D18',
  tintaSuave: '#6B5F55',
  barro: '#B4502F',
  barroEscuro: '#8F3D22',
  linha: '#E4D8C7',
  sobreEscuro: '#D9CBB8',
};
const FONTE_TITULO = "Georgia,'Times New Roman',serif";
const FONTE_TEXTO = "'Segoe UI',Helvetica,Arial,sans-serif";

const SUPORTE_EMAIL = 'usaisuporte@gmail.com';
const SUPORTE_WHATSAPP = '(47) 99925-2028';
const SUPORTE_WHATSAPP_LINK = 'https://wa.me/5547999252028';

export interface DadosEmailRedefinicao {
  para: string;
  nome: string;
  link: string;
  /** Quantos minutos o link vale (aparece no texto do e-mail). */
  validadeMinutos: number;
}

function escapar(valor: string): string {
  return valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function textoDaValidade(minutos: number): string {
  if (minutos % 60 === 0) {
    const horas = minutos / 60;
    return horas === 1 ? '1 hora' : `${horas} horas`;
  }
  return `${minutos} minutos`;
}

/** E-mail do "Esqueci minha senha": link para escolher uma senha nova, com prazo curto. */
export function emailRedefinicaoSenha(input: DadosEmailRedefinicao): Email {
  const validade = textoDaValidade(input.validadeMinutos);
  const link = escapar(input.link);
  const site = escapar(urlDoApp());

  const texto = [
    `Olá, ${input.nome}!`,
    '',
    'Recebemos um pedido para criar uma nova senha na USAI. Para escolher a nova senha, abra este link:',
    input.link,
    '',
    `O link vale por ${validade} e só pode ser usado uma vez. Depois de criar a senha, entre pela página "Entrar" com o seu e-mail e a senha nova.`,
    '',
    'Não foi você? Pode ignorar este e-mail: a sua senha continua a mesma.',
    '',
    `Precisa de ajuda? WhatsApp ${SUPORTE_WHATSAPP} ou e-mail ${SUPORTE_EMAIL}`,
    '',
    'USAI, vizinhos que compartilham',
    urlDoApp(),
  ].join('\n');

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>Nova senha na USAI</title>
</head>
<body style="margin:0;padding:0;background:${COR.papel};-webkit-text-size-adjust:100%">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${COR.papel};font-size:1px;line-height:1px">
    Use o link para escolher uma nova senha. Ele vale por ${validade}.
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COR.papel}" style="background:${COR.papel}">
    <tr>
      <td align="center" style="padding:28px 12px">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px">
          <tr>
            <td bgcolor="${COR.tinta}" style="background:${COR.tinta};padding:22px 32px">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="middle" style="padding-right:14px">
                    <img src="cid:${LOGO_CID}" width="52" height="52" alt="USAI" style="display:block;border:0;outline:none">
                  </td>
                  <td valign="middle">
                    <div style="font-family:${FONTE_TITULO};font-size:30px;font-weight:700;letter-spacing:-0.5px;line-height:30px;color:${COR.superficie}">USAI</div>
                    <div style="font-family:${FONTE_TEXTO};font-size:12px;line-height:18px;color:${COR.sobreEscuro}">vizinhos que compartilham</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td bgcolor="${COR.superficie}" style="background:${COR.superficie};padding:34px 32px 30px;border:1px solid ${COR.linha}">
              <p style="margin:0 0 14px;font-family:${FONTE_TITULO};font-size:22px;font-weight:700;color:${COR.tinta}">Olá, ${escapar(input.nome)}!</p>
              <p style="margin:0;font-family:${FONTE_TEXTO};font-size:16px;line-height:25px;color:${COR.tinta}">Recebemos um pedido para criar uma <strong>nova senha</strong> na USAI. Clique no botão para escolhê-la.</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 10px">
                <tr>
                  <td align="center" bgcolor="${COR.barro}" style="background:${COR.barro};border-bottom:4px solid ${COR.barroEscuro}">
                    <a href="${link}" style="display:inline-block;padding:16px 34px;font-family:${FONTE_TEXTO};font-size:17px;font-weight:700;color:${COR.superficie};text-decoration:none">Criar nova senha</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-family:${FONTE_TEXTO};font-size:13px;line-height:20px;color:${COR.tintaSuave}">O link vale por <strong>${validade}</strong> e só pode ser usado uma vez. Se o botão não funcionar, copie e cole este endereço no navegador:<br><a href="${link}" style="color:${COR.barro};word-break:break-all">${link}</a></p>
              <p style="margin:22px 0 0;font-family:${FONTE_TEXTO};font-size:14px;line-height:22px;color:${COR.tinta}">Depois de criar a senha, entre pela página <strong>Entrar</strong> com o seu e-mail e a senha nova.</p>
              <p style="margin:18px 0 0;padding-top:16px;border-top:1px solid ${COR.linha};font-family:${FONTE_TEXTO};font-size:14px;line-height:22px;color:${COR.tintaSuave}"><strong>Não foi você?</strong> Pode ignorar este e-mail: a sua senha continua a mesma.</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:20px 24px 8px">
              <p style="margin:0 0 10px;font-family:${FONTE_TEXTO};font-size:12px;line-height:19px;color:${COR.tintaSuave}">Precisa de ajuda? Fale com o suporte pelo WhatsApp <a href="${SUPORTE_WHATSAPP_LINK}" style="color:${COR.tintaSuave}">${SUPORTE_WHATSAPP}</a> ou por e-mail em <a href="mailto:${SUPORTE_EMAIL}" style="color:${COR.tintaSuave}">${SUPORTE_EMAIL}</a>.<br><a href="${site}" style="color:${COR.tintaSuave}">${site}</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return {
    para: input.para,
    assunto: 'Crie uma nova senha na USAI',
    texto,
    html,
    anexos: [
      {
        cid: LOGO_CID,
        nomeArquivo: 'usai.png',
        conteudo: Buffer.from(LOGO_USAI_PNG_BASE64, 'base64'),
        tipo: 'image/png',
      },
    ],
  };
}
