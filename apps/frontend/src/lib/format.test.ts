import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  calcularDias,
  formatCurrency,
  formatDate,
  formatDiasRestantes,
  formatRelativeTime,
  formatTime,
} from './format';

describe('formatCurrency', () => {
  it('formata valor em reais', () => {
    expect(formatCurrency(20)).toContain('20');
    expect(formatCurrency(20)).toMatch(/R\$/);
  });
});

describe('formatDate', () => {
  it('formata data ISO no padrão brasileiro', () => {
    expect(formatDate('2026-10-01T00:00:00.000Z')).toBe('01/10/2026');
  });
});

describe('formatTime', () => {
  it('formata um instante como hora:minuto', () => {
    expect(formatTime('2026-09-15T12:05:00.000Z')).toMatch(/^\d{2}:\d{2}$/);
  });
});

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-16T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('mostra "agora" para instantes muito recentes', () => {
    expect(formatRelativeTime('2026-09-16T11:59:40.000Z')).toBe('agora');
  });

  it('mostra minutos quando faz menos de uma hora', () => {
    expect(formatRelativeTime('2026-09-16T11:45:00.000Z')).toBe('15m');
  });

  it('mostra horas quando faz menos de um dia', () => {
    expect(formatRelativeTime('2026-09-16T09:00:00.000Z')).toBe('3h');
  });

  it('mostra dias quando faz menos de uma semana', () => {
    expect(formatRelativeTime('2026-09-14T12:00:00.000Z')).toBe('2d');
  });

  it('mostra a data completa a partir de uma semana', () => {
    expect(formatRelativeTime('2026-09-01T12:00:00.000Z')).toBe('01/09/2026');
  });
});

describe('formatDiasRestantes', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-16T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('mostra os dias restantes até expirar', () => {
    expect(formatDiasRestantes('2026-09-20T12:00:00.000Z')).toBe('expira em 4 dias');
  });

  it('usa singular quando falta menos de um dia inteiro', () => {
    expect(formatDiasRestantes('2026-09-16T18:00:00.000Z')).toBe('expira em 1 dia');
  });

  it('mostra "expira em breve" quando já passou ou expira agora', () => {
    expect(formatDiasRestantes('2026-09-16T12:00:00.000Z')).toBe('expira em breve');
    expect(formatDiasRestantes('2026-09-10T12:00:00.000Z')).toBe('expira em breve');
  });
});

describe('calcularDias', () => {
  it('calcula a diferença em dias entre duas datas', () => {
    expect(calcularDias('2026-10-01', '2026-10-03')).toBe(2);
  });

  it('arredonda pra cima quando a diferença não é um número inteiro de dias', () => {
    expect(calcularDias('2026-10-01T00:00:00', '2026-10-02T12:00:00')).toBe(2);
  });

  it('retorna 0 quando as datas estão vazias ou a data fim não é depois do início', () => {
    expect(calcularDias('', '')).toBe(0);
    expect(calcularDias('2026-10-03', '2026-10-01')).toBe(0);
    expect(calcularDias('2026-10-01', '2026-10-01')).toBe(0);
  });
});
