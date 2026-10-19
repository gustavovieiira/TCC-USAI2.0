-- AlterTable: novo estado PAGO (PIX já transferido) e a data em que isso aconteceu
ALTER TABLE `solicitacoes_saque`
    MODIFY `status` ENUM('PENDENTE', 'APROVADO', 'REJEITADO', 'PAGO') NOT NULL DEFAULT 'PENDENTE',
    ADD COLUMN `pagoEm` DATETIME(3) NULL;

-- Backfill: até aqui APROVADO significava "aprovado e pago por fora" (o saldo já descontava);
-- esses saques passam a PAGO pra não ficarem eternamente "aguardando pagamento".
UPDATE `solicitacoes_saque` SET `status` = 'PAGO', `pagoEm` = `processadoEm` WHERE `status` = 'APROVADO';
