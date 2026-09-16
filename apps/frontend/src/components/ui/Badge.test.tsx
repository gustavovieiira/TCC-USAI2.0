import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PapelTag, PostStatusBadge, StatusBadge } from './Badge';

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

describe('PostStatusBadge', () => {
  it.each([
    ['ABERTO', 'Aberto'],
    ['ATENDIDO', 'Atendido'],
  ] as const)('exibe o rótulo em português pro status %s', (status, rotulo) => {
    render(<PostStatusBadge status={status} />);
    expect(screen.getByText(rotulo)).toBeInTheDocument();
  });
});

describe('PapelTag', () => {
  it('exibe o selo "Síndico" pro papel SINDICO', () => {
    render(<PapelTag papel="SINDICO" />);
    expect(screen.getByText('Síndico')).toBeInTheDocument();
  });

  it('exibe o selo "Admin USAI" pro papel ADMIN', () => {
    render(<PapelTag papel="ADMIN" />);
    expect(screen.getByText('Admin USAI')).toBeInTheDocument();
  });

  it('não exibe nada pro papel MORADOR', () => {
    const { container } = render(<PapelTag papel="MORADOR" />);
    expect(container).toBeEmptyDOMElement();
  });
});
