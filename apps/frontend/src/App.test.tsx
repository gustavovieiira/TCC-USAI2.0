import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import App from './App';

function renderEm(rota: string) {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <App />
    </MemoryRouter>,
  );
}

describe('rotas públicas dos documentos legais', () => {
  it('/termos abre os Termos de Uso sem exigir login', () => {
    renderEm('/termos');

    expect(screen.getByRole('heading', { level: 1, name: 'Termos de Uso' })).toBeInTheDocument();
  });

  it('/privacidade abre a Política de Privacidade sem exigir login', () => {
    renderEm('/privacidade');

    expect(
      screen.getByRole('heading', { level: 1, name: 'Política de Privacidade' }),
    ).toBeInTheDocument();
  });
});
