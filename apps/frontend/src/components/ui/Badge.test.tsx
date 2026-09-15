import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from './Badge';

describe('StatusBadge', () => {
  it.each([
    ['PENDENTE', 'Pendente'],
    ['APROVADA', 'Aprovada'],
    ['PAGA', 'Paga'],
    ['EM_ANDAMENTO', 'Em andamento'],
    ['CONCLUIDA', 'Concluída'],
    ['CANCELADA', 'Cancelada'],
  ] as const)('exibe o rótulo em português pro status %s', (status, rotulo) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(rotulo)).toBeInTheDocument();
  });
});
