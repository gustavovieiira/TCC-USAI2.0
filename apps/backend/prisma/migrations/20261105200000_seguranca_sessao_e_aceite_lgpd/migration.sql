-- Sessões que podem ser derrubadas (sair da conta, trocar a senha) e registro do aceite dos termos (LGPD).
ALTER TABLE `users`
  ADD COLUMN `tokenVersion` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `aceitouTermosEm` DATETIME(3) NULL,
  ADD COLUMN `versaoTermos` VARCHAR(191) NULL;
