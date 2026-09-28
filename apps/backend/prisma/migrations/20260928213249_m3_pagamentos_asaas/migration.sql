-- AlterTable
ALTER TABLE `users` ADD COLUMN `asaasCustomerId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `pagamentos` ADD COLUMN `invoiceUrl` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `users_asaasCustomerId_key` ON `users`(`asaasCustomerId`);
