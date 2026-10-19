-- AlterTable
ALTER TABLE `locacoes` ADD COLUMN `taxaPlataforma` DECIMAL(10, 2) NULL,
    ADD COLUMN `valorLiquido` DECIMAL(10, 2) NULL;

-- Backfill: locações que já geram saldo ficam com a taxa de 10% vigente até aqui.
UPDATE `locacoes`
SET `valorLiquido` = ROUND(`valorTotal` * 0.9, 2),
    `taxaPlataforma` = `valorTotal` - ROUND(`valorTotal` * 0.9, 2)
WHERE `status` IN ('PAGA', 'EM_ANDAMENTO', 'CONCLUIDA');
