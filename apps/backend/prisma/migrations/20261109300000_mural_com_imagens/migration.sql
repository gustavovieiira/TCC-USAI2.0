-- Fotos nos posts do Mural: lista de endereços de imagens enviadas pela própria plataforma (até 4 por post).
ALTER TABLE `pedidos` ADD COLUMN `imagens` JSON NULL;
