-- Os títulos dos termos de retirada e devolução (versão 1) usavam travessão. O título não entra na assinatura
-- nem na impressão digital do documento (só a versão e as declarações marcadas), então corrigir o texto é
-- seguro. Só muda quando ninguém editou o título.
UPDATE `termos_responsabilidade`
SET `titulo` = 'Termo de Responsabilidade: Retirada do Item'
WHERE `tipo` = 'RETIRADA' AND `versao` = 1 AND `titulo` = 'Termo de Responsabilidade — Retirada do Item';

UPDATE `termos_responsabilidade`
SET `titulo` = 'Termo de Responsabilidade: Devolução do Item'
WHERE `tipo` = 'DEVOLUCAO' AND `versao` = 1 AND `titulo` = 'Termo de Responsabilidade — Devolução do Item';
