-- CreateTable
CREATE TABLE `assinaturas` (
    `id` VARCHAR(191) NOT NULL,
    `condominioId` VARCHAR(191) NOT NULL,
    `responsavelId` VARCHAR(191) NOT NULL,
    `planoCodigo` VARCHAR(191) NOT NULL,
    `valorMensal` DECIMAL(10, 2) NOT NULL,
    `limiteMoradores` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `ativaAte` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `assinaturas_condominioId_key`(`condominioId`),
    INDEX `assinaturas_status_ativaAte_idx`(`status`, `ativaAte`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cobrancas_assinatura` (
    `id` VARCHAR(191) NOT NULL,
    `assinaturaId` VARCHAR(191) NOT NULL,
    `asaasChargeId` VARCHAR(191) NOT NULL,
    `invoiceUrl` VARCHAR(191) NOT NULL,
    `valor` DECIMAL(10, 2) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `referencia` VARCHAR(191) NOT NULL,
    `pagoEm` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `cobrancas_assinatura_asaasChargeId_key`(`asaasChargeId`),
    INDEX `cobrancas_assinatura_assinaturaId_status_idx`(`assinaturaId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tokens_acesso` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `expiraEm` DATETIME(3) NOT NULL,
    `usadoEm` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `tokens_acesso_tokenHash_key`(`tokenHash`),
    INDEX `tokens_acesso_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `assinaturas` ADD CONSTRAINT `assinaturas_condominioId_fkey` FOREIGN KEY (`condominioId`) REFERENCES `condominios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `assinaturas` ADD CONSTRAINT `assinaturas_responsavelId_fkey` FOREIGN KEY (`responsavelId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `cobrancas_assinatura` ADD CONSTRAINT `cobrancas_assinatura_assinaturaId_fkey` FOREIGN KEY (`assinaturaId`) REFERENCES `assinaturas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `tokens_acesso` ADD CONSTRAINT `tokens_acesso_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
