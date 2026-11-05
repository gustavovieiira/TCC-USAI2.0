import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Revelar, useNaTela } from './revelar';

type Chamada = (entradas: Partial<IntersectionObserverEntry>[]) => void;

let observadores: { chamada: Chamada; desligou: boolean }[] = [];

function instalarObservador() {
  observadores = [];
  class FalsoObservador {
    private registro: { chamada: Chamada; desligou: boolean };
    constructor(chamada: Chamada) {
      this.registro = { chamada, desligou: false };
      observadores.push(this.registro);
    }
    observe() {}
    disconnect() {
      this.registro.desligou = true;
    }
    unobserve() {}
    takeRecords() {
      return [];
    }
  }
  vi.stubGlobal('IntersectionObserver', FalsoObservador);
}

function Sonda() {
  const [ref, naTela] = useNaTela<HTMLDivElement>();
  return (
    <div ref={ref} data-testid="sonda">
      {naTela ? 'na tela' : 'fora da tela'}
    </div>
  );
}

beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi
      .fn()
      .mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useNaTela', () => {
  it('sem IntersectionObserver (testes, navegadores antigos) já devolve "na tela"', () => {
    vi.stubGlobal('IntersectionObserver', undefined);

    render(<Sonda />);

    expect(screen.getByTestId('sonda')).toHaveTextContent('na tela');
  });

  it('com "reduzir movimento" ligado, já devolve "na tela" e nem observa', () => {
    instalarObservador();
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));

    render(<Sonda />);

    expect(screen.getByTestId('sonda')).toHaveTextContent('na tela');
    expect(observadores).toHaveLength(0);
  });

  it('começa fora da tela e vira "na tela" quando o observador avisa (e para de observar)', () => {
    instalarObservador();

    render(<Sonda />);
    expect(screen.getByTestId('sonda')).toHaveTextContent('fora da tela');

    act(() => observadores[0].chamada([{ isIntersecting: true }]));

    expect(screen.getByTestId('sonda')).toHaveTextContent('na tela');
    expect(observadores[0].desligou).toBe(true);
  });

  it('um aviso de "saiu da tela" não conta', () => {
    instalarObservador();

    render(<Sonda />);
    act(() => observadores[0].chamada([{ isIntersecting: false }]));

    expect(screen.getByTestId('sonda')).toHaveTextContent('fora da tela');
  });
});

describe('Revelar', () => {
  it('sem observador, o conteúdo fica visível e sem marcação de animação', () => {
    vi.stubGlobal('IntersectionObserver', undefined);

    render(<Revelar>conteúdo</Revelar>);

    const bloco = screen.getByText('conteúdo');
    expect(bloco).toBeVisible();
    expect(bloco).not.toHaveAttribute('data-revelar');
  });

  it('abaixo da dobra é marcado "antes" e passa a "depois" quando aparece', () => {
    instalarObservador();

    render(<Revelar atraso={140}>conteúdo</Revelar>);
    const bloco = screen.getByText('conteúdo');

    expect(bloco).toHaveAttribute('data-revelar', 'antes');
    expect(bloco.style.getPropertyValue('--atraso')).toBe('140ms');

    act(() => observadores[0].chamada([{ isIntersecting: true }]));

    expect(bloco).toHaveAttribute('data-revelar', 'depois');
  });

  it('aceita trocar o elemento (ex.: li)', () => {
    vi.stubGlobal('IntersectionObserver', undefined);

    render(
      <ul>
        <Revelar as="li">item</Revelar>
      </ul>,
    );

    expect(screen.getByRole('listitem')).toHaveTextContent('item');
  });
});
