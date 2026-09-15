-- CreateTable
CREATE TABLE `condominios` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `linkSlug` VARCHAR(191) NOT NULL,
    `pin` VARCHAR(191) NOT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `condominios_linkSlug_key`(`linkSlug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `senhaHash` VARCHAR(191) NOT NULL,
    `cpf` VARCHAR(191) NULL,
    `papel` ENUM('MORADOR', 'SINDICO', 'ADMIN') NOT NULL DEFAULT 'MORADOR',
    `apartamento` VARCHAR(191) NULL,
    `chavePix` VARCHAR(191) NULL,
    `condominioId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_cpf_key`(`cpf`),
    INDEX `users_condominioId_idx`(`condominioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `itens` (
    `id` VARCHAR(191) NOT NULL,
    `titulo` VARCHAR(191) NOT NULL,
    `descricao` TEXT NOT NULL,
    `categoria` VARCHAR(191) NOT NULL,
    `valorDiaria` DECIMAL(10, 2) NOT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `ownerId` VARCHAR(191) NOT NULL,
    `condominioId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `itens_condominioId_idx`(`condominioId`),
    INDEX `itens_ownerId_idx`(`ownerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `item_imagens` (
    `id` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,

    INDEX `item_imagens_itemId_idx`(`itemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `locacoes` (
    `id` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NOT NULL,
    `locatarioId` VARCHAR(191) NOT NULL,
    `dataInicio` DATETIME(3) NOT NULL,
    `dataFim` DATETIME(3) NOT NULL,
    `valorTotal` DECIMAL(10, 2) NOT NULL,
    `status` ENUM('PENDENTE', 'APROVADA', 'PAGA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA') NOT NULL DEFAULT 'PENDENTE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `locacoes_itemId_idx`(`itemId`),
    INDEX `locacoes_locatarioId_idx`(`locatarioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pagamentos` (
    `id` VARCHAR(191) NOT NULL,
    `locacaoId` VARCHAR(191) NOT NULL,
    `asaasChargeId` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDENTE',
    `valor` DECIMAL(10, 2) NOT NULL,
    `pagoEm` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `pagamentos_locacaoId_key`(`locacaoId`),
    UNIQUE INDEX `pagamentos_asaasChargeId_key`(`asaasChargeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mensagens` (
    `id` VARCHAR(191) NOT NULL,
    `locacaoId` VARCHAR(191) NOT NULL,
    `remetenteId` VARCHAR(191) NOT NULL,
    `conteudo` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `mensagens_locacaoId_idx`(`locacaoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `solicitacoes_saque` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `valor` DECIMAL(10, 2) NOT NULL,
    `chavePixUsada` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDENTE', 'APROVADO', 'REJEITADO') NOT NULL DEFAULT 'PENDENTE',
    `motivoRejeicao` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processadoEm` DATETIME(3) NULL,

    INDEX `solicitacoes_saque_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `logs_auditoria` (
    `id` VARCHAR(191) NOT NULL,
    `adminId` VARCHAR(191) NOT NULL,
    `acao` VARCHAR(191) NOT NULL,
    `alvoTipo` VARCHAR(191) NOT NULL,
    `alvoId` VARCHAR(191) NOT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `logs_auditoria_adminId_idx`(`adminId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_condominioId_fkey` FOREIGN KEY (`condominioId`) REFERENCES `condominios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `itens` ADD CONSTRAINT `itens_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `itens` ADD CONSTRAINT `itens_condominioId_fkey` FOREIGN KEY (`condominioId`) REFERENCES `condominios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `item_imagens` ADD CONSTRAINT `item_imagens_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `itens`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `locacoes` ADD CONSTRAINT `locacoes_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `itens`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `locacoes` ADD CONSTRAINT `locacoes_locatarioId_fkey` FOREIGN KEY (`locatarioId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pagamentos` ADD CONSTRAINT `pagamentos_locacaoId_fkey` FOREIGN KEY (`locacaoId`) REFERENCES `locacoes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mensagens` ADD CONSTRAINT `mensagens_locacaoId_fkey` FOREIGN KEY (`locacaoId`) REFERENCES `locacoes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mensagens` ADD CONSTRAINT `mensagens_remetenteId_fkey` FOREIGN KEY (`remetenteId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `solicitacoes_saque` ADD CONSTRAINT `solicitacoes_saque_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `logs_auditoria` ADD CONSTRAINT `logs_auditoria_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
