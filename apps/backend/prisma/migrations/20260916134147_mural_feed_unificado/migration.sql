/*
  Warnings:

  - You are about to drop the column `titulo` on the `pedidos` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `pedidos` DROP COLUMN `titulo`,
    ADD COLUMN `tipo` ENUM('PEDIDO', 'AVISO') NOT NULL DEFAULT 'PEDIDO',
    MODIFY `status` ENUM('ABERTO', 'ATENDIDO') NULL;
