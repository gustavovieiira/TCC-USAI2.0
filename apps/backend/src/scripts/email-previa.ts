/**
 * Gera uma prévia do e-mail de acesso do síndico num arquivo HTML, para ver no navegador sem enviar
 * nada. A logo (que no e-mail real vai anexada) é trocada por uma imagem embutida na própria página.
 *
 *   npm run email:previa --workspace=apps/backend
 *
 * O arquivo é sempre `previa-email-acesso.html`, na pasta de onde o comando foi executado (o
 * caminho de saída não é lido de argumento da linha de comando, de propósito).
 */
import fs from 'node:fs';
import path from 'node:path';
import { emailAcessoSindico, LOGO_CID } from '@/modules/assinaturas/assinaturas.emails';
import { LOGO_USAI_PNG_BASE64 } from '@/modules/assinaturas/assinaturas.logo';

const ARQUIVO_DA_PREVIA = 'previa-email-acesso.html';
const destino = path.join(process.cwd(), ARQUIVO_DA_PREVIA);

const UM_DIA = 24 * 60 * 60 * 1000;
const ativaAte = new Date(Date.now() + 365 * UM_DIA);

const email = emailAcessoSindico({
  para: 'sindico@exemplo.com',
  nomeSindico: 'Sílvia Souza',
  nomeCondominio: 'Residencial Jardim Europa',
  link: 'http://localhost:5173/definir-senha?token=exemplo-de-link-de-acesso',
  detalhes: {
    plano: 'Condomínio',
    periodo: 'Anual',
    valor: 2870,
    ativaAte,
    recibo: {
      numero: 'USAI-3F9A12BC',
      pagoEm: new Date(),
      forma: 'PIX',
      pagador: 'Sílvia Souza',
      documento: '***.982.247-**',
      vigenciaInicio: new Date(ativaAte.getTime() - 365 * UM_DIA),
      comprovanteUrl: 'https://sandbox.asaas.com/i/exemplo',
    },
  },
});

const html = (email.html ?? '').replace(
  `cid:${LOGO_CID}`,
  `data:image/png;base64,${LOGO_USAI_PNG_BASE64}`,
);

fs.writeFileSync(destino, html, 'utf-8');
console.log(`Prévia gerada em: ${destino}`);
