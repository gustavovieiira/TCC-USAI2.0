-- Comissão do condomínio passa a ser definida por condomínio (padrão 0) e a taxa do Asaas é gravada em cada aluguel.
ALTER TABLE `condominios` ADD COLUMN `percentualComissao` DECIMAL(5, 2) NOT NULL DEFAULT 0;
ALTER TABLE `locacoes` ADD COLUMN `taxaAsaas` DECIMAL(10, 2) NULL;
