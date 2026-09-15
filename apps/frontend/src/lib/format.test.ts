import { describe, expect, it } from 'vitest';
import { calcularDias, formatCurrency, formatDate, formatTime } from './format';

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
