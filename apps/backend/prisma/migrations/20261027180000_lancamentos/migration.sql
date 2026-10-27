-- CreateTable
CREATE TABLE `lancamentos` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `valor` DECIMAL(10, 2) NOT NULL,
    `afetaSaldo` BOOLEAN NOT NULL DEFAULT true,
    `locacaoId` VARCHAR(191) NULL,
    `condominioId` VARCHAR(191) NULL,
    `baseCalculo` DECIMAL(10, 2) NULL,
    `taxaPercentual` DECIMAL(5, 2) NULL,
    `divididoEntre` INTEGER NULL,
    `descricao` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `lancamentos_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `lancamentos_locacaoId_idx`(`locacaoId`),
    INDEX `lancamentos_tipo_idx`(`tipo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `lancamentos` ADD CONSTRAINT `lancamentos_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `lancamentos` ADD CONSTRAINT `lancamentos_locacaoId_fkey` FOREIGN KEY (`locacaoId`) REFERENCES `locacoes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill dos aluguéis já pagos. A taxa deles foi cobrada quando a USAI ficava com os 10%, então
-- continua registrada como taxa da plataforma (o histórico e os recibos antigos não mudam).
INSERT INTO `lancamentos`
    (`id`, `userId`, `tipo`, `valor`, `afetaSaldo`, `locacaoId`, `condominioId`, `baseCalculo`,
     `taxaPercentual`, `descricao`, `createdAt`)
SELECT UUID(), i.`ownerId`, 'ALUGUEL_RECEBIDO', l.`valorLiquido`, 1, l.`id`, i.`condominioId`,
       l.`valorTotal`, 10.00, CONCAT('Aluguel de "', i.`titulo`, '"'), COALESCE(p.`pagoEm`, l.`updatedAt`)
FROM `locacoes` l
JOIN `itens` i ON i.`id` = l.`itemId`
LEFT JOIN `pagamentos` p ON p.`locacaoId` = l.`id`
WHERE l.`status` IN ('PAGA', 'EM_ANDAMENTO', 'CONCLUIDA') AND l.`valorLiquido` IS NOT NULL;

INSERT INTO `lancamentos`
    (`id`, `userId`, `tipo`, `valor`, `afetaSaldo`, `locacaoId`, `condominioId`, `baseCalculo`,
     `taxaPercentual`, `descricao`, `createdAt`)
SELECT UUID(), NULL, 'TAXA_PLATAFORMA', l.`taxaPlataforma`, 1, l.`id`, i.`condominioId`,
       l.`valorTotal`, 10.00, CONCAT('Taxa sobre o aluguel de "', i.`titulo`, '" (anterior à comissão do síndico)'),
       COALESCE(p.`pagoEm`, l.`updatedAt`)
FROM `locacoes` l
JOIN `itens` i ON i.`id` = l.`itemId`
LEFT JOIN `pagamentos` p ON p.`locacaoId` = l.`id`
WHERE l.`status` IN ('PAGA', 'EM_ANDAMENTO', 'CONCLUIDA') AND l.`taxaPlataforma` IS NOT NULL;

INSERT INTO `lancamentos`
    (`id`, `userId`, `tipo`, `valor`, `afetaSaldo`, `locacaoId`, `condominioId`, `baseCalculo`,
     `taxaPercentual`, `descricao`, `createdAt`)
SELECT UUID(), l.`locatarioId`, 'ALUGUEL_PAGO', COALESCE(p.`valor`, l.`valorTotal`), 0, l.`id`, i.`condominioId`,
       l.`valorTotal`, 10.00, CONCAT('Aluguel de "', i.`titulo`, '"'), COALESCE(p.`pagoEm`, l.`updatedAt`)
FROM `locacoes` l
JOIN `itens` i ON i.`id` = l.`itemId`
JOIN `pagamentos` p ON p.`locacaoId` = l.`id`
WHERE l.`status` IN ('PAGA', 'EM_ANDAMENTO', 'CONCLUIDA');
