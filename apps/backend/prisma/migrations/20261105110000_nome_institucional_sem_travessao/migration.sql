-- O nome institucional padrão antigo usava travessão. Só troca quando o Admin não editou o valor.
UPDATE `configuracoes`
SET `valor` = 'USAI: compartilhamento entre vizinhos'
WHERE `chave` = 'nome_institucional'
  AND `valor` IN ('USAI — Compartilhamento entre vizinhos', 'USAI — compartilhamento entre vizinhos');
