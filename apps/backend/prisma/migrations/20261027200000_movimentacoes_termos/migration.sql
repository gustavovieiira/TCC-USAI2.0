-- AlterTable
ALTER TABLE `itens`
    ADD COLUMN `fabricante` VARCHAR(120) NULL,
    ADD COLUMN `modelo` VARCHAR(120) NULL,
    ADD COLUMN `numeroSerie` VARCHAR(120) NULL,
    ADD COLUMN `acessorios` JSON NULL;

-- AlterTable
ALTER TABLE `locacoes` ADD COLUMN `finalidade` TEXT NULL;

-- CreateTable
CREATE TABLE `configuracoes` (
    `chave` VARCHAR(64) NOT NULL,
    `valor` TEXT NOT NULL,
    `atualizadoPorId` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`chave`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `termos_responsabilidade` (
    `id` VARCHAR(191) NOT NULL,
    `tipo` ENUM('RETIRADA', 'DEVOLUCAO') NOT NULL,
    `versao` INTEGER NOT NULL,
    `titulo` VARCHAR(191) NOT NULL,
    `clausulas` JSON NOT NULL,
    `declaracoes` JSON NOT NULL,
    `statusRevisao` VARCHAR(191) NOT NULL DEFAULT 'MODELO',
    `aprovadoPorId` VARCHAR(191) NULL,
    `aprovadoEm` DATETIME(3) NULL,
    `criadoPorId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `termos_responsabilidade_tipo_versao_key`(`tipo`, `versao`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `movimentacoes` (
    `id` VARCHAR(191) NOT NULL,
    `numero` INTEGER NOT NULL AUTO_INCREMENT,
    `locacaoId` VARCHAR(191) NOT NULL,
    `tipo` ENUM('RETIRADA', 'DEVOLUCAO') NOT NULL,
    `status` ENUM('AGUARDANDO_ACEITE', 'CONCLUIDA', 'CANCELADA') NOT NULL DEFAULT 'AGUARDANDO_ACEITE',
    `entreguePorId` VARCHAR(191) NOT NULL,
    `recebidoPorId` VARCHAR(191) NOT NULL,
    `ocorridoEm` DATETIME(3) NOT NULL,
    `estadoConservacao` ENUM('OTIMO', 'BOM', 'REGULAR', 'COM_AVARIAS') NOT NULL,
    `acessorios` JSON NOT NULL,
    `observacoes` TEXT NULL,
    `termoId` VARCHAR(191) NOT NULL,
    `snapshot` JSON NOT NULL,
    `hashIntegridade` VARCHAR(64) NULL,
    `concluidaEm` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `movimentacoes_numero_key`(`numero`),
    INDEX `movimentacoes_locacaoId_idx`(`locacaoId`),
    INDEX `movimentacoes_entreguePorId_idx`(`entreguePorId`),
    INDEX `movimentacoes_recebidoPorId_idx`(`recebidoPorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `aceites_termo` (
    `id` VARCHAR(191) NOT NULL,
    `movimentacaoId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `termoId` VARCHAR(191) NOT NULL,
    `declaracoes` JSON NOT NULL,
    `aceitoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ip` VARCHAR(64) NULL,
    `userAgent` VARCHAR(255) NULL,
    `assinatura` VARCHAR(64) NOT NULL,

    UNIQUE INDEX `aceites_termo_movimentacaoId_userId_key`(`movimentacaoId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `eventos_movimentacao` (
    `id` VARCHAR(191) NOT NULL,
    `movimentacaoId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `acao` VARCHAR(40) NOT NULL,
    `detalhe` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `eventos_movimentacao_movimentacaoId_createdAt_idx`(`movimentacaoId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `movimentacoes` ADD CONSTRAINT `movimentacoes_locacaoId_fkey` FOREIGN KEY (`locacaoId`) REFERENCES `locacoes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `movimentacoes` ADD CONSTRAINT `movimentacoes_entreguePorId_fkey` FOREIGN KEY (`entreguePorId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `movimentacoes` ADD CONSTRAINT `movimentacoes_recebidoPorId_fkey` FOREIGN KEY (`recebidoPorId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `movimentacoes` ADD CONSTRAINT `movimentacoes_termoId_fkey` FOREIGN KEY (`termoId`) REFERENCES `termos_responsabilidade`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `aceites_termo` ADD CONSTRAINT `aceites_termo_movimentacaoId_fkey` FOREIGN KEY (`movimentacaoId`) REFERENCES `movimentacoes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `aceites_termo` ADD CONSTRAINT `aceites_termo_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `aceites_termo` ADD CONSTRAINT `aceites_termo_termoId_fkey` FOREIGN KEY (`termoId`) REFERENCES `termos_responsabilidade`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `eventos_movimentacao` ADD CONSTRAINT `eventos_movimentacao_movimentacaoId_fkey` FOREIGN KEY (`movimentacaoId`) REFERENCES `movimentacoes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `eventos_movimentacao` ADD CONSTRAINT `eventos_movimentacao_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Termos de responsabilidade iniciais (versão 1). São TEXTOS MODELO: ficam marcados como
-- "pendente de revisão" até a empresa/condomínio revisar e aprovar pelo painel do Admin.
INSERT INTO `termos_responsabilidade` (`id`, `tipo`, `versao`, `titulo`, `clausulas`, `declaracoes`, `statusRevisao`)
VALUES
 (UUID(), 'RETIRADA', 1, 'Termo de Responsabilidade — Retirada do Item', '["Este termo registra a entrega do item descrito neste documento pelo proprietário ao locatário, no âmbito da locação realizada pela plataforma USAI.", "O locatário declara ter recebido o item e os acessórios relacionados, conferidos com o estado de conservação registrado neste documento.", "O item deve ser utilizado exclusivamente para a finalidade informada na solicitação de locação e durante o período contratado.", "O locatário é responsável pela guarda, pela conservação e pela utilização adequada do item enquanto ele estiver em sua posse.", "É vedado emprestar, ceder, sublocar ou permitir o uso do item por terceiros sem autorização expressa do proprietário.", "Perda, furto, dano, defeito ou qualquer incidente deve ser comunicado imediatamente ao proprietário e, quando aplicável, ao síndico do condomínio.", "O item e todos os acessórios devem ser devolvidos ao término do período da locação, ou antes, quando solicitado pelo proprietário, no estado de conservação registrado, ressalvado o desgaste natural decorrente do uso adequado.", "O locatário declara estar ciente das regras de utilização da plataforma USAI e do tratamento dos dados pessoais registrados neste documento, realizado para identificação das partes e comprovação da operação, nos termos da legislação de proteção de dados aplicável."]', '[{"id": "recebimento", "texto": "Declaro que recebi o item e os acessórios descritos neste documento e que conferi as informações registradas, incluindo o estado de conservação."}, {"id": "ciencia", "texto": "Declaro que li e estou ciente dos termos de responsabilidade, das regras de utilização e das políticas aplicáveis da plataforma."}, {"id": "compromisso", "texto": "Comprometo-me a zelar pelo item, a utilizá-lo apenas para a finalidade informada e a comunicar imediatamente qualquer perda, dano, defeito ou incidente."}]', 'MODELO'),
 (UUID(), 'DEVOLUCAO', 1, 'Termo de Responsabilidade — Devolução do Item', '["Este termo registra a devolução do item descrito neste documento pelo locatário ao proprietário, ao término da locação realizada pela plataforma USAI.", "O proprietário declara ter recebido o item e os acessórios, conferindo-os com o registro de retirada e com o estado de conservação informado na devolução.", "Eventuais divergências, danos ou itens faltantes constatados na conferência devem ser registrados no campo de observações deste documento e comunicados à outra parte.", "A confirmação do recebimento encerra a locação na plataforma, sem prejuízo de retificações ou registros de ocorrências posteriores, que ficam anexados ao histórico deste documento.", "O registro desta operação não substitui a comunicação ao síndico nem as medidas previstas nas regras internas do condomínio, quando aplicáveis.", "O proprietário declara estar ciente do tratamento dos dados pessoais registrados neste documento, realizado para identificação das partes e comprovação da operação, nos termos da legislação de proteção de dados aplicável."]', '[{"id": "recebimento", "texto": "Declaro que recebi o item e os acessórios descritos neste documento e que conferi o estado de conservação registrado."}, {"id": "ciencia", "texto": "Declaro que li e estou ciente dos termos desta devolução e das regras de utilização da plataforma."}, {"id": "conferencia", "texto": "Confirmo que as observações e divergências registradas correspondem ao que constatei na conferência do item."}]', 'MODELO');
