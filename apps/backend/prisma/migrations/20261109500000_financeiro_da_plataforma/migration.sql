-- Financeiro da plataforma: taxa do Asaas e vigência em cada mensalidade paga, e as despesas lançadas pelo Admin.
ALTER TABLE `cobrancas_assinatura` ADD COLUMN `taxaAsaas` DECIMAL(10, 2) NULL, ADD COLUMN `ativaAteApos` DATETIME(3) NULL;

CREATE TABLE `despesas_plataforma` (
    `id` VARCHAR(191) NOT NULL,
    `data` DATETIME(3) NOT NULL,
    `valor` DECIMAL(10, 2) NOT NULL,
    `descricao` VARCHAR(191) NOT NULL,
    `categoria` VARCHAR(191) NOT NULL,
    `criadoPorId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `despesas_plataforma_data_idx`(`data`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
