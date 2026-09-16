-- CreateTable
CREATE TABLE `pedidos` (
    `id` VARCHAR(191) NOT NULL,
    `titulo` VARCHAR(191) NOT NULL,
    `descricao` TEXT NOT NULL,
    `categoria` VARCHAR(191) NULL,
    `status` ENUM('ABERTO', 'ATENDIDO') NOT NULL DEFAULT 'ABERTO',
    `autorId` VARCHAR(191) NOT NULL,
    `condominioId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `pedidos_condominioId_idx`(`condominioId`),
    INDEX `pedidos_autorId_idx`(`autorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `respostas_pedido` (
    `id` VARCHAR(191) NOT NULL,
    `pedidoId` VARCHAR(191) NOT NULL,
    `autorId` VARCHAR(191) NOT NULL,
    `conteudo` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `respostas_pedido_pedidoId_idx`(`pedidoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `pedidos` ADD CONSTRAINT `pedidos_autorId_fkey` FOREIGN KEY (`autorId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pedidos` ADD CONSTRAINT `pedidos_condominioId_fkey` FOREIGN KEY (`condominioId`) REFERENCES `condominios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `respostas_pedido` ADD CONSTRAINT `respostas_pedido_pedidoId_fkey` FOREIGN KEY (`pedidoId`) REFERENCES `pedidos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `respostas_pedido` ADD CONSTRAINT `respostas_pedido_autorId_fkey` FOREIGN KEY (`autorId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
