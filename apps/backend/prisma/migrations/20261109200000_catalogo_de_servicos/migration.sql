-- Catálogo de serviços: o mesmo anúncio passa a poder ser um ITEM para alugar (cobrado por dia) ou um SERVIÇO
-- prestado por um morador (cobrado por hora ou por serviço). Anúncios que já existem continuam sendo itens por dia.
ALTER TABLE `itens`
  ADD COLUMN `tipo` ENUM('ITEM', 'SERVICO') NOT NULL DEFAULT 'ITEM',
  ADD COLUMN `unidadeCobranca` ENUM('DIA', 'HORA', 'SERVICO') NOT NULL DEFAULT 'DIA';
