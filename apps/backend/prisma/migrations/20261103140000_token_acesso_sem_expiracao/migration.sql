-- O link de acesso do síndico passa a valer até a senha ser criada (sem prazo): expiraEm vira opcional,
-- e NULL significa "não expira". Evita o síndico clicar num link vencido ou derrubado por um reenvio.
ALTER TABLE `tokens_acesso` MODIFY `expiraEm` DATETIME(3) NULL;

-- Os links ainda não usados (inclusive os que já foram enviados por e-mail) passam a valer até o uso.
UPDATE `tokens_acesso` SET `expiraEm` = NULL WHERE `usadoEm` IS NULL;
