/**
 * Roda antes de cada arquivo de teste. Os testes automatizados NUNCA podem mandar e-mail de verdade:
 * o `.env` local tem o SMTP configurado (e o Prisma o carrega sozinho), então esvaziamos o host aqui.
 * Sem `SMTP_HOST` o `SmtpMailer` só escreve o e-mail no log.
 */
process.env.SMTP_HOST = '';
