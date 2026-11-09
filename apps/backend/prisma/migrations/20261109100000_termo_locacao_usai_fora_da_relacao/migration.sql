-- Nova versão do termo de responsabilidade de cada locação (retirada e devolução): acrescenta duas cláusulas
-- dizendo que a USAI é só a plataforma, não é parte da locação nem responde pelo item, e que o proprietário e o
-- locatário resolvem qualquer divergência entre si, de comum acordo. Parte da versão mais recente de cada tipo,
-- então preserva edições feitas pelo Admin. A nova versão nasce como MODELO, como todas.
INSERT INTO `termos_responsabilidade` (`id`, `tipo`, `versao`, `titulo`, `clausulas`, `declaracoes`, `statusRevisao`)
SELECT
  UUID(),
  t.`tipo`,
  t.`versao` + 1,
  t.`titulo`,
  JSON_ARRAY_APPEND(
    t.`clausulas`,
    '$', 'A plataforma USAI apenas aproxima o proprietário e o locatário e registra esta operação. A USAI não é parte da locação, não é proprietária nem depositária do item e não responde por perda, extravio, furto, roubo, dano, defeito, atraso na devolução, uso indevido ou qualquer outro prejuízo relacionado ao item.',
    '$', 'A responsabilidade pelo item é exclusivamente do proprietário (pelas informações que prestou e pelo estado do item) e do locatário (pela guarda, pelo uso e pela devolução), que se comprometem a resolver entre si, de comum acordo, qualquer divergência, podendo combinar conserto, substituição, pagamento do valor do conserto ou do bem, desconto ou outra solução que ambos aceitem, sem envolver a USAI.'
  ),
  t.`declaracoes`,
  'MODELO'
FROM `termos_responsabilidade` t
JOIN (
  SELECT `tipo`, MAX(`versao`) AS `maxima`
  FROM `termos_responsabilidade`
  GROUP BY `tipo`
) u ON u.`tipo` = t.`tipo` AND u.`maxima` = t.`versao`;
