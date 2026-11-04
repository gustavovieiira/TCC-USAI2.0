import { Email, urlDoApp } from '@/common/mailer';
import { LOGO_USAI_PNG_BASE64 } from './assinaturas.logo';

/** Identificador da logo embutida no e-mail (`<img src="cid:logo-usai">`). */
export const LOGO_CID = 'logo-usai';

/** Cores da identidade da USAI (as mesmas do frontend), fixas porque e-mail não lê o CSS do app. */
const COR = {
  papel: '#F2EAE0',
  superficie: '#FFFCF7',
  tinta: '#241D18',
  tintaSuave: '#6B5F55',
  barro: '#B4502F',
  barroEscuro: '#8F3D22',
  jade: '#1F6F5C',
  jadeClaro: '#5FBFA2',
  linha: '#E4D8C7',
  sobreEscuro: '#D9CBB8',
};

const FONTE_TITULO = "Georgia,'Times New Roman',serif";
const FONTE_TEXTO = "'Segoe UI',Helvetica,Arial,sans-serif";

/** Dados do pagamento recebido, que formam o recibo mostrado no e-mail. */
export interface ReciboPagamento {
  /** Número do recibo (ex.: USAI-3F9A12BC). */
  numero: string;
  /** Quando o dinheiro foi recebido. */
  pagoEm: Date;
  /** Forma de pagamento (ex.: PIX). */
  forma: string;
  pagador: string;
  /** CPF/CNPJ já mascarado (ex.: ***.123.456-**); o e-mail nunca mostra o documento inteiro. */
  documento: string | null;
  /** Início do período pago (o fim é `ativaAte`). */
  vigenciaInicio: Date;
  /** Link do comprovante do PIX no Asaas, quando houver. */
  comprovanteUrl?: string;
}

/** Dados do que foi contratado, mostrados no e-mail (opcionais: o e-mail funciona sem eles). */
export interface DetalhesContratacao {
  plano: string;
  periodo: string;
  valor: number;
  ativaAte: Date;
  /** Com o recibo, o e-mail mostra o recibo de pagamento no lugar do resumo simples. */
  recibo?: ReciboPagamento;
}

export interface DadosEmailAcesso {
  para: string;
  nomeSindico: string;
  nomeCondominio: string;
  link: string;
  detalhes?: DetalhesContratacao;
}

function escapar(valor: string): string {
  return valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatarValor(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

function formatarData(data: Date): string {
  return data.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function formatarDataHora(data: Date): string {
  return data.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

/**
 * Assunto com o nome do condomínio ("Residencial Aurora está ativo na USAI"): um assunto específico
 * se parece menos com e-mail em massa do que um genérico repetido. O nome vem do síndico, então
 * tiramos quebras de linha (nada de injetar cabeçalho) e limitamos o tamanho.
 */
export function assuntoDoAcesso(nomeCondominio: string): string {
  const nome = nomeCondominio
    .replace(/[\r\n\t]+/g, ' ')
    .trim()
    .slice(0, 60);
  return nome ? `${nome} está ativo na USAI` : 'Seu condomínio está ativo na USAI';
}

/** Canais de suporte mostrados no rodapé do e-mail. */
const SUPORTE_EMAIL = 'usaisuporte@gmail.com';
const SUPORTE_WHATSAPP = '(47) 99925-2028';
const SUPORTE_WHATSAPP_LINK = 'https://wa.me/5547999252028';

const DICA_SPAM =
  'Este e-mail caiu no spam? Marque como "não é spam" para receber os próximos avisos da USAI na caixa de entrada.';

const PASSOS = [
  {
    titulo: 'Crie a sua senha',
    texto: 'Use o botão acima. O link funciona até você criar a senha, sem prazo.',
  },
  {
    titulo: 'Pegue o convite dos moradores',
    texto:
      'No painel do síndico, em "Convidar moradores", copie o link e o PIN, ou a mensagem pronta para o grupo do condomínio.',
  },
  {
    titulo: 'Comece a compartilhar',
    texto:
      'Os moradores se cadastram sozinhos e já veem o catálogo do condomínio. De cada locação paga, 10% ficam com o condomínio.',
  },
];

function linhaResumo(rotulo: string, valor: string, ultima = false): string {
  const borda = ultima ? '' : `border-bottom:1px solid ${COR.linha};`;
  return `
        <tr>
          <td style="padding:10px 0;${borda}font-family:${FONTE_TEXTO};font-size:14px;color:${COR.tintaSuave}">${rotulo}</td>
          <td align="right" style="padding:10px 0;${borda}font-family:${FONTE_TEXTO};font-size:15px;font-weight:700;color:${COR.tinta}">${valor}</td>
        </tr>`;
}

function blocoResumo(detalhes: DetalhesContratacao): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 0">
      <tr>
        <td width="4" bgcolor="${COR.barro}" style="background:${COR.barro};font-size:0;line-height:0">&nbsp;</td>
        <td bgcolor="${COR.papel}" style="background:${COR.papel};padding:18px 22px">
          <p style="margin:0 0 6px;font-family:${FONTE_TEXTO};font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${COR.tintaSuave}">Resumo da contratação</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${linhaResumo('Plano', escapar(detalhes.plano))}${linhaResumo('Período', escapar(detalhes.periodo))}${linhaResumo('Valor pago', escapar(formatarValor(detalhes.valor)))}${linhaResumo('Ativo até', escapar(formatarData(detalhes.ativaAte)), true)}
          </table>
        </td>
      </tr>
    </table>`;
}

function blocoRecibo(detalhes: DetalhesContratacao, recibo: ReciboPagamento): string {
  const pagador = recibo.documento
    ? `${escapar(recibo.pagador)}<br><span style="font-weight:400;font-size:12px;color:${COR.tintaSuave}">${escapar(recibo.documento)}</span>`
    : escapar(recibo.pagador);
  const comprovante = recibo.comprovanteUrl
    ? `<p style="margin:12px 0 0;font-family:${FONTE_TEXTO};font-size:13px"><a href="${escapar(recibo.comprovanteUrl)}" style="color:${COR.barro};font-weight:700">Ver o comprovante do PIX</a></p>`
    : '';

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:30px 0 0">
      <tr>
        <td width="4" bgcolor="${COR.jade}" style="background:${COR.jade};font-size:0;line-height:0">&nbsp;</td>
        <td bgcolor="${COR.papel}" style="background:${COR.papel};padding:18px 22px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="font-family:${FONTE_TEXTO};font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${COR.tintaSuave}">Recibo de pagamento</td>
              <td align="right" style="font-family:${FONTE_TEXTO};font-size:12px;font-weight:700;color:${COR.tinta}">nº ${escapar(recibo.numero)}</td>
            </tr>
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:6px">${linhaResumo('Pago em', escapar(formatarDataHora(recibo.pagoEm)))}${linhaResumo('Forma de pagamento', escapar(recibo.forma))}${linhaResumo('Pagador', pagador)}${linhaResumo('Referente a', `Plano ${escapar(detalhes.plano)} &middot; ${escapar(detalhes.periodo)}`)}${linhaResumo('Vigência', `${escapar(formatarData(recibo.vigenciaInicio))} a ${escapar(formatarData(detalhes.ativaAte))}`)}${linhaResumo('Valor pago', `<span style="font-family:${FONTE_TITULO};font-size:20px;color:${COR.jade}">${escapar(formatarValor(detalhes.valor))}</span>`, true)}
          </table>
          ${comprovante}
          <p style="margin:12px 0 0;font-family:${FONTE_TEXTO};font-size:12px;line-height:18px;color:${COR.tintaSuave}">Enviamos este e-mail somente depois que o PIX foi recebido pela USAI. Guarde-o: ele é o seu recibo.</p>
        </td>
      </tr>
    </table>`;
}

/** Explica o login: e-mail + a senha que ele criar, entrando pela página "Entrar" da plataforma. */
function blocoAcesso(input: DadosEmailAcesso): string {
  const entrar = escapar(`${urlDoApp()}/login`);

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 0">
      <tr>
        <td width="4" bgcolor="${COR.jadeClaro}" style="background:${COR.jadeClaro};font-size:0;line-height:0">&nbsp;</td>
        <td bgcolor="${COR.papel}" style="background:${COR.papel};padding:18px 22px">
          <p style="margin:0 0 6px;font-family:${FONTE_TEXTO};font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${COR.tintaSuave}">Como você entra daqui pra frente</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${linhaResumo('Seu login', escapar(input.para))}${linhaResumo('Sua senha', 'a que você criar no botão acima')}${linhaResumo('Onde entrar', `<a href="${entrar}" style="color:${COR.barro};font-weight:700">Entrar na USAI</a>`, true)}
          </table>
          <p style="margin:12px 0 0;font-family:${FONTE_TEXTO};font-size:12px;line-height:18px;color:${COR.tintaSuave}">Guarde este e-mail: depois de criar a senha, você sempre entra pelo botão &quot;Entrar&quot; da plataforma, com este e-mail e a senha que definiu.</p>
        </td>
      </tr>
    </table>`;
}

function blocoPassos(): string {
  const linhas = PASSOS.map(
    (passo, indice) => `
      <tr>
        <td width="44" valign="top" style="padding:0 0 18px">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr><td width="34" height="34" align="center" valign="middle" bgcolor="${COR.tinta}" style="background:${COR.tinta};border-radius:17px;font-family:${FONTE_TITULO};font-size:17px;font-weight:700;color:${COR.superficie};line-height:34px">${indice + 1}</td></tr>
          </table>
        </td>
        <td valign="top" style="padding:0 0 18px">
          <p style="margin:0 0 3px;font-family:${FONTE_TITULO};font-size:17px;font-weight:700;color:${COR.tinta}">${escapar(passo.titulo)}</p>
          <p style="margin:0;font-family:${FONTE_TEXTO};font-size:14px;line-height:21px;color:${COR.tintaSuave}">${escapar(passo.texto)}</p>
        </td>
      </tr>`,
  ).join('');

  return `
    <h2 style="margin:36px 0 18px;font-family:${FONTE_TITULO};font-size:22px;color:${COR.tinta}">Próximos passos</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${linhas}
    </table>`;
}

function montarHtml(input: DadosEmailAcesso): string {
  const link = escapar(input.link);
  const condominio = escapar(input.nomeCondominio);
  const resumo = input.detalhes
    ? input.detalhes.recibo
      ? blocoRecibo(input.detalhes, input.detalhes.recibo)
      : blocoResumo(input.detalhes)
    : '';
  const site = escapar(urlDoApp());

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${escapar(assuntoDoAcesso(input.nomeCondominio))}</title>
</head>
<body style="margin:0;padding:0;background:${COR.papel};-webkit-text-size-adjust:100%">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${COR.papel};font-size:1px;line-height:1px">
    Pagamento confirmado. ${condominio} já está ativo na USAI: crie a sua senha e convide os moradores.
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
            <td bgcolor="${COR.barro}" style="background:${COR.barro};padding:34px 32px 36px">
              <p style="margin:0 0 10px;font-family:${FONTE_TEXTO};font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#F6D9CC">&#10003;&nbsp; Pagamento confirmado</p>
              <h1 style="margin:0;font-family:${FONTE_TITULO};font-size:34px;line-height:38px;font-weight:700;color:${COR.superficie}">Seu condomínio está ativo!</h1>
              <p style="margin:12px 0 0;font-family:${FONTE_TEXTO};font-size:16px;line-height:24px;color:#FBEBE3">${condominio} já faz parte da USAI.</p>
            </td>
          </tr>

          <tr>
            <td bgcolor="${COR.superficie}" style="background:${COR.superficie};padding:34px 32px 30px;border-left:1px solid ${COR.linha};border-right:1px solid ${COR.linha}">
              <p style="margin:0 0 14px;font-family:${FONTE_TITULO};font-size:20px;font-weight:700;color:${COR.tinta}">Olá, ${escapar(input.nomeSindico)}!</p>
              <p style="margin:0;font-family:${FONTE_TEXTO};font-size:16px;line-height:25px;color:${COR.tinta}">Recebemos o seu pagamento e o condomínio <strong>${condominio}</strong> já está ativo na plataforma. Falta só criar a sua senha para entrar no painel do síndico.</p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 10px">
                <tr>
                  <td align="center" bgcolor="${COR.barro}" style="background:${COR.barro};border-bottom:4px solid ${COR.barroEscuro}">
                    <a href="${link}" style="display:inline-block;padding:16px 34px;font-family:${FONTE_TEXTO};font-size:17px;font-weight:700;color:${COR.superficie};text-decoration:none">Criar minha senha e entrar</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-family:${FONTE_TEXTO};font-size:13px;line-height:20px;color:${COR.tintaSuave}">O link funciona até você criar a sua senha, então pode abri-lo quando quiser. Se o botão não funcionar, copie e cole este endereço no navegador:<br><a href="${link}" style="color:${COR.barro};word-break:break-all">${link}</a></p>
              ${blocoAcesso(input)}
              ${resumo}
              ${blocoPassos()}
              <p style="margin:6px 0 0;font-family:${FONTE_TEXTO};font-size:14px;line-height:22px;color:${COR.tintaSuave}">Perdeu este e-mail? É só pedir outro na página de acompanhamento da contratação.</p>
            </td>
          </tr>

          <tr>
            <td bgcolor="${COR.superficie}" style="background:${COR.superficie};border:1px solid ${COR.linha};border-top:0;padding:0">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="33%" height="5" bgcolor="${COR.barro}" style="background:${COR.barro};font-size:0;line-height:0">&nbsp;</td>
                  <td width="33%" height="5" bgcolor="${COR.jade}" style="background:${COR.jade};font-size:0;line-height:0">&nbsp;</td>
                  <td width="34%" height="5" bgcolor="${COR.jadeClaro}" style="background:${COR.jadeClaro};font-size:0;line-height:0">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:24px 24px 8px">
              <p style="margin:0 0 6px;font-family:${FONTE_TITULO};font-size:18px;font-weight:700;color:${COR.tinta}">USAI</p>
              <p style="margin:0 0 10px;font-family:${FONTE_TEXTO};font-size:12px;line-height:19px;color:${COR.tintaSuave}">Você recebeu este e-mail porque o condomínio ${condominio} foi contratado na USAI com este endereço.<br><a href="${site}" style="color:${COR.tintaSuave}">${site}</a></p>
              <p style="margin:0 0 10px;font-family:${FONTE_TEXTO};font-size:12px;line-height:19px;color:${COR.tintaSuave}">${escapar(DICA_SPAM)}</p>
              <p style="margin:0 0 10px;font-family:${FONTE_TEXTO};font-size:12px;line-height:19px;color:${COR.tintaSuave}">Precisa de ajuda? Fale com o suporte pelo WhatsApp <a href="${SUPORTE_WHATSAPP_LINK}" style="color:${COR.tintaSuave}">${SUPORTE_WHATSAPP}</a> ou por e-mail em <a href="mailto:${SUPORTE_EMAIL}" style="color:${COR.tintaSuave}">${SUPORTE_EMAIL}</a>.</p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

function montarTexto(input: DadosEmailAcesso): string {
  const linhas = [
    `Olá, ${input.nomeSindico}!`,
    '',
    `PAGAMENTO CONFIRMADO — o condomínio "${input.nomeCondominio}" já está ativo na USAI.`,
    '',
    'Para entrar pela primeira vez, crie a sua senha neste link:',
    input.link,
    '',
    'O link funciona até você criar a sua senha, então pode abri-lo quando quiser. Se perder este e-mail, peça outro na página de acompanhamento da contratação.',
    '',
    'COMO VOCÊ ENTRA DAQUI PRA FRENTE',
    `Login: ${input.para}`,
    'Senha: a que você criar no link acima',
    `Onde entrar: ${urlDoApp()}/login (botão "Entrar")`,
  ];

  const { detalhes } = input;
  if (detalhes?.recibo) {
    const { recibo } = detalhes;
    linhas.push(
      '',
      `RECIBO DE PAGAMENTO nº ${recibo.numero}`,
      `Pago em: ${formatarDataHora(recibo.pagoEm)}`,
      `Forma de pagamento: ${recibo.forma}`,
      `Pagador: ${recibo.pagador}${recibo.documento ? ` (${recibo.documento})` : ''}`,
      `Referente a: Plano ${detalhes.plano} · ${detalhes.periodo}`,
      `Vigência: ${formatarData(recibo.vigenciaInicio)} a ${formatarData(detalhes.ativaAte)}`,
      `Valor pago: ${formatarValor(detalhes.valor)}`,
    );
    if (recibo.comprovanteUrl) linhas.push(`Comprovante do PIX: ${recibo.comprovanteUrl}`);
    linhas.push('Enviamos este e-mail somente depois que o PIX foi recebido pela USAI.');
  } else if (detalhes) {
    linhas.push(
      '',
      'RESUMO DA CONTRATAÇÃO',
      `Plano: ${detalhes.plano}`,
      `Período: ${detalhes.periodo}`,
      `Valor pago: ${formatarValor(detalhes.valor)}`,
      `Ativo até: ${formatarData(detalhes.ativaAte)}`,
    );
  }

  linhas.push('', 'PRÓXIMOS PASSOS');
  PASSOS.forEach((passo, indice) => linhas.push(`${indice + 1}. ${passo.titulo}: ${passo.texto}`));
  linhas.push(
    '',
    DICA_SPAM,
    '',
    `Precisa de ajuda? WhatsApp ${SUPORTE_WHATSAPP} ou e-mail ${SUPORTE_EMAIL}`,
    '',
    'USAI — vizinhos que compartilham',
    urlDoApp(),
  );

  return linhas.join('\n');
}

/** E-mail enviado ao síndico quando o PIX é confirmado: link de uso único pra criar a senha. */
export function emailAcessoSindico(input: DadosEmailAcesso): Email {
  return {
    para: input.para,
    assunto: assuntoDoAcesso(input.nomeCondominio),
    texto: montarTexto(input),
    html: montarHtml(input),
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
