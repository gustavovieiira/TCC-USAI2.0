-- Chat da locação passa a ser uma ConversaPrivada com `locacaoId` (sem expiração) e o
-- controle de "lido até" por participante deixa as não lidas persistidas.

-- AlterTable
ALTER TABLE `conversas_privadas`
    MODIFY `expiraEm` DATETIME(3) NULL,
    ADD COLUMN `locacaoId` VARCHAR(191) NULL,
    ADD COLUMN `participanteALidoEm` DATETIME(3) NULL,
    ADD COLUMN `participanteBLidoEm` DATETIME(3) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `conversas_privadas_locacaoId_key` ON `conversas_privadas`(`locacaoId`);

-- AddForeignKey
ALTER TABLE `conversas_privadas` ADD CONSTRAINT `conversas_privadas_locacaoId_fkey` FOREIGN KEY (`locacaoId`) REFERENCES `locacoes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Tudo que já existe nasce como lido (ninguém recebe uma enxurrada de "não lidas" antigas).
UPDATE `conversas_privadas` SET `participanteALidoEm` = NOW(3), `participanteBLidoEm` = NOW(3);

-- Migra o chat antigo das locações: uma conversa por locação que tem mensagens
-- (A = locatário, B = dono do item) e copia as mensagens mantendo ids e datas.
INSERT INTO `conversas_privadas`
    (`id`, `postOrigemId`, `locacaoId`, `participanteAId`, `participanteBId`, `condominioId`,
     `createdAt`, `expiraEm`, `participanteALidoEm`, `participanteBLidoEm`)
SELECT UUID(), NULL, l.`id`, l.`locatarioId`, i.`ownerId`, i.`condominioId`,
       MIN(m.`createdAt`), NULL, NOW(3), NOW(3)
FROM `locacoes` l
JOIN `itens` i ON i.`id` = l.`itemId`
JOIN `mensagens` m ON m.`locacaoId` = l.`id`
GROUP BY l.`id`, l.`locatarioId`, i.`ownerId`, i.`condominioId`;

INSERT INTO `mensagens_privadas` (`id`, `conversaId`, `remetenteId`, `conteudo`, `createdAt`)
SELECT m.`id`, c.`id`, m.`remetenteId`, m.`conteudo`, m.`createdAt`
FROM `mensagens` m
JOIN `conversas_privadas` c ON c.`locacaoId` = m.`locacaoId`;

-- DropTable
DROP TABLE `mensagens`;
