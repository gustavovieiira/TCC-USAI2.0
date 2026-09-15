const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

/**
 * dataInicio/dataFim representam dias de calendário (não instantes) e chegam do backend como
 * meia-noite UTC — por isso o timeZone fixo em 'UTC', senão o fuso do navegador desloca a data
 * exibida um dia pra trás em qualquer timezone a oeste de UTC (ex.: America/Sao_Paulo).
 */
const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
});

export function formatCurrency(valor: number): string {
  return currencyFormatter.format(valor);
}

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

const MS_POR_DIA = 1000 * 60 * 60 * 24;

export function calcularDias(dataInicio: string, dataFim: string): number {
  const inicio = new Date(dataInicio).getTime();
  const fim = new Date(dataFim).getTime();
  if (Number.isNaN(inicio) || Number.isNaN(fim) || fim <= inicio) {
    return 0;
  }
  return Math.max(1, Math.ceil((fim - inicio) / MS_POR_DIA));
}
