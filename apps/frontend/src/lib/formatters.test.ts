import { describe, expect, it } from 'vitest';
import { formatarDataISO, formatarPeriodo } from './formatters';

describe('formatarDataISO', () => {
  it('formata a data sem sofrer deslocamento de fuso horário', () => {
    // Regressão: usar `new Date(iso).toLocaleDateString()` pode exibir o dia anterior
    // dependendo do fuso do navegador, porque a data-calendário é armazenada como UTC.
    expect(formatarDataISO('2026-11-05T00:00:00.000Z')).toBe('05/11/2026');
    expect(formatarDataISO('2026-01-01T00:00:00.000Z')).toBe('01/01/2026');
  });
});

describe('formatarPeriodo', () => {
  it('formata o período entre duas datas', () => {
    expect(formatarPeriodo('2026-11-05T00:00:00.000Z', '2026-11-08T00:00:00.000Z')).toBe(
      '05/11/2026 — 08/11/2026',
    );
  });
});
