/**
 * Testa o SMTP configurado no ambiente: confere conexão e login e envia um e-mail de teste, igual ao
 * que o síndico recebe depois de pagar. Nunca imprime a senha.
 *
 *   desenvolvimento:  npm run smtp:testar --workspace=apps/backend -- voce@exemplo.com
 *   produção (build): node dist/scripts/smtp-testar.js voce@exemplo.com
 */
import 'dotenv/config';
import { dicaDeErroSmtp, SmtpMailer, urlDoApp } from '@/common/mailer';
import { emailAcessoSindico } from '@/modules/assinaturas/assinaturas.emails';

/** Esconde parte do usuário (ex.: g***@gmail.com) pra o log não vazar o e-mail inteiro. */
function mascarar(valor: string | undefined): string {
  if (!valor) return '(não definido)';
  const [usuario, dominio] = valor.split('@');
  return dominio ? `${usuario.slice(0, 1)}***@${dominio}` : `${valor.slice(0, 1)}***`;
}

async function main(): Promise<number> {
  const destino = process.argv[2];

  if (!destino?.includes('@')) {
    console.error('Uso: informe o e-mail que vai receber o teste.');
    console.error('  npm run smtp:testar --workspace=apps/backend -- voce@exemplo.com');
    return 1;
  }

  const porta = Number(process.env.SMTP_PORT ?? 587);
  console.log('Configuração em uso:');
  console.log(`  SMTP_HOST  ${process.env.SMTP_HOST ?? '(não definido)'}`);
  console.log(`  SMTP_PORT  ${porta} (${porta === 465 ? 'SSL' : 'STARTTLS'})`);
  console.log(`  SMTP_USER  ${mascarar(process.env.SMTP_USER)}`);
  console.log(`  SMTP_PASS  ${process.env.SMTP_PASS ? '(definida)' : '(não definida)'}`);
  console.log(
    `  MAIL_FROM  ${process.env.MAIL_FROM ?? '(padrão: USAI <nao-responda@usai.local>)'}`,
  );
  console.log(`  APP_URL    ${urlDoApp()}`);
  console.log('');

  const mailer = new SmtpMailer();

  try {
    console.log('1/2 Conferindo conexão e login...');
    await mailer.verificar();
    console.log('    OK: o servidor aceitou a conexão e as credenciais.');
  } catch (error) {
    console.error(`    FALHOU: ${(error as Error).message}`);
    console.error(`    Dica: ${dicaDeErroSmtp(error)}`);
    return 1;
  }

  try {
    console.log(`2/2 Enviando o e-mail de teste para ${destino}...`);
    const modelo = emailAcessoSindico({
      para: destino,
      nomeSindico: 'Teste',
      nomeCondominio: 'Condomínio de Teste',
      link: `${urlDoApp()}/definir-senha?token=link-de-teste-nao-funciona`,
    });
    await mailer.enviar({ ...modelo, assunto: `[TESTE] ${modelo.assunto}` });
    console.log('    OK: enviado. Confira a caixa de entrada (e o spam).');
    console.log('    O link do e-mail é só de teste e não funciona.');
  } catch (error) {
    console.error(`    FALHOU: ${(error as Error).message}`);
    console.error(`    Dica: ${dicaDeErroSmtp(error)}`);
    return 1;
  }

  return 0;
}

main()
  .then((codigo) => process.exit(codigo))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
