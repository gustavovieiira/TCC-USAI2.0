-- CreateTable
CREATE TABLE `conversas_privadas` (
    `id` VARCHAR(191) NOT NULL,
    `postOrigemId` VARCHAR(191) NULL,
    `participanteAId` VARCHAR(191) NOT NULL,
    `participanteBId` VARCHAR(191) NOT NULL,
    `condominioId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiraEm` DATETIME(3) NOT NULL,

    INDEX `conversas_privadas_condominioId_idx`(`condominioId`),
    INDEX `conversas_privadas_participanteAId_idx`(`participanteAId`),
    INDEX `conversas_privadas_participanteBId_idx`(`participanteBId`),
    INDEX `conversas_privadas_expiraEm_idx`(`expiraEm`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mensagens_privadas` (
    `id` VARCHAR(191) NOT NULL,
    `conversaId` VARCHAR(191) NOT NULL,
    `remetenteId` VARCHAR(191) NOT NULL,
    `conteudo` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `mensagens_privadas_conversaId_idx`(`conversaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `conversas_privadas` ADD CONSTRAINT `conversas_privadas_postOrigemId_fkey` FOREIGN KEY (`postOrigemId`) REFERENCES `pedidos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversas_privadas` ADD CONSTRAINT `conversas_privadas_participanteAId_fkey` FOREIGN KEY (`participanteAId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversas_privadas` ADD CONSTRAINT `conversas_privadas_participanteBId_fkey` FOREIGN KEY (`participanteBId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversas_privadas` ADD CONSTRAINT `conversas_privadas_condominioId_fkey` FOREIGN KEY (`condominioId`) REFERENCES `condominios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mensagens_privadas` ADD CONSTRAINT `mensagens_privadas_conversaId_fkey` FOREIGN KEY (`conversaId`) REFERENCES `conversas_privadas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mensagens_privadas` ADD CONSTRAINT `mensagens_privadas_remetenteId_fkey` FOREIGN KEY (`remetenteId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
