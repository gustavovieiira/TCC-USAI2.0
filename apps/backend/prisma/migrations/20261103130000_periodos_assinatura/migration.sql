-- AlterTable
ALTER TABLE `assinaturas` ADD COLUMN `periodoCodigo` VARCHAR(191) NOT NULL DEFAULT 'MENSAL', ADD COLUMN `valorCiclo` DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `cobrancas_assinatura` ADD COLUMN `periodoCodigo` VARCHAR(191) NOT NULL DEFAULT 'MENSAL', ADD COLUMN `dias` INTEGER NOT NULL DEFAULT 30;

-- Assinaturas que já existiam eram mensais: o valor do ciclo é a própria mensalidade.
UPDATE `assinaturas` SET `valorCiclo` = `valorMensal` WHERE `valorCiclo` = 0;
