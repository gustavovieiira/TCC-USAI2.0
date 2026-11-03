import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FiltroChips } from './FiltroChips';
import { ListaRolavel } from './ListaRolavel';

describe('ListaRolavel', () => {
  it('limita a altura, rola por dentro e pode ser focada pelo teclado', () => {
    render(
      <ListaRolavel rotulo="Posts" alturaMaxima="max-h-40">
        <p>conteúdo</p>
      </ListaRolavel>,
    );

    const regiao = screen.getByRole('region', { name: 'Posts' });
    expect(regiao).toHaveClass('max-h-40', 'overflow-y-auto');
    expect(regiao).toHaveAttribute('tabindex', '0');
    expect(screen.getByText('conteúdo')).toBeInTheDocument();
  });
});

describe('FiltroChips', () => {
  const opcoes = [
    { valor: 'A', rotulo: 'Todos', total: 3 },
    { valor: 'B', rotulo: 'Só B' },
  ];

  it('marca a opção ativa, mostra a contagem e avisa a troca', async () => {
    const onChange = vi.fn();
    render(<FiltroChips rotulo="Filtro" opcoes={opcoes} valor="A" onChange={onChange} />);

    expect(screen.getByRole('group', { name: 'Filtro' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Todos\s*3/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Só B' })).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(screen.getByRole('button', { name: 'Só B' }));
    expect(onChange).toHaveBeenCalledWith('B');
  });
});
