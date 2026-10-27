-- Alinha a chave estrangeira do chat da locação com o que o Prisma espera pra relação opcional
-- (ON DELETE SET NULL). Sem efeito prático hoje (locações não são apagadas); só zera o "drift".
ALTER TABLE `conversas_privadas` DROP FOREIGN KEY `conversas_privadas_locacaoId_fkey`;
ALTER TABLE `conversas_privadas` ADD CONSTRAINT `conversas_privadas_locacaoId_fkey` FOREIGN KEY (`locacaoId`) REFERENCES `locacoes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
