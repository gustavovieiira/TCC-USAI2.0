/**
 * Formata uma data-calendário (armazenada como string ISO, ex.: "2026-11-05T00:00:00.000Z")
 * lendo o Y-M-D diretamente da string, sem passar por `new Date()` — que converteria para o fuso
 * horário local e poderia exibir o dia anterior/seguinte dependendo do offset do navegador.
 */
export function formatarDataISO(iso: string): string {
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

export function formatarPeriodo(dataInicioISO: string, dataFimISO: string): string {
  return `${formatarDataISO(dataInicioISO)} — ${formatarDataISO(dataFimISO)}`;
}
