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

/** createdAt de mensagem é um instante de verdade (não um dia de calendário) — exibe no fuso local. */
const timeFormatter = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

export function formatTime(iso: string): string {
  return timeFormatter.format(new Date(iso));
}

/** Para instantes reais exibidos como data (ex.: createdAt de saque) — fuso local, sem o fix de UTC. */
const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}

/** Estilo "feed" (Twitter-like): "agora", "5m", "3h", "2d", e a partir de uma semana vira data. */
export function formatRelativeTime(iso: string): string {
  const instante = new Date(iso).getTime();
  const diffMs = Date.now() - instante;
  const diffMin = Math.floor(diffMs / (1000 * 60));

  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `${diffMin}m`;

  const diffHoras = Math.floor(diffMin / 60);
  if (diffHoras < 24) return `${diffHoras}h`;

  const diffDias = Math.floor(diffHoras / 24);
  if (diffDias < 7) return `${diffDias}d`;

  return formatDateTime(iso);
}

const MS_POR_DIA = 1000 * 60 * 60 * 24;

/** Conversas privadas do Mural expiram em 7 dias — usado pra mostrar "expira em Xd" na UI. */
export function formatDiasRestantes(expiraEmIso: string): string {
  const restanteMs = new Date(expiraEmIso).getTime() - Date.now();
  const dias = Math.ceil(restanteMs / MS_POR_DIA);

  if (dias <= 0) return 'expira em breve';
  if (dias === 1) return 'expira em 1 dia';
  return `expira em ${dias} dias`;
}

export function calcularDias(dataInicio: string, dataFim: string): number {
  const inicio = new Date(dataInicio).getTime();
  const fim = new Date(dataFim).getTime();
  if (Number.isNaN(inicio) || Number.isNaN(fim) || fim <= inicio) {
    return 0;
  }
  return Math.max(1, Math.ceil((fim - inicio) / MS_POR_DIA));
}
