-- Os links de `tokens_acesso` passam a ter um tipo: o primeiro acesso do síndico (ACESSO, sem prazo) ou a
-- redefinição de senha pedida em "Esqueci minha senha" (REDEFINICAO, vale 1 hora). Os links que já existem
-- são todos de primeiro acesso.
ALTER TABLE `tokens_acesso` ADD COLUMN `tipo` VARCHAR(20) NOT NULL DEFAULT 'ACESSO';
