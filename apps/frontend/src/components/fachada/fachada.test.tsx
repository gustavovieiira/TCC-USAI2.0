import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CeuNoturno } from './CeuNoturno';
import { JanelasAcendendo, JanelasEsperando } from './JanelasAcendendo';

describe('CeuNoturno', () => {
  it('é só enfeite: escondido do leitor de tela, sem nada que receba foco ou clique', () => {
    const { container } = render(<CeuNoturno />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveClass('pointer-events-none');
    expect(container.querySelectorAll('a, button, [tabindex]')).toHaveLength(0);
  });

  it('desenha estrelas, prédios e dezenas de janelas, cada uma com o seu ritmo', () => {
    const { container } = render(<CeuNoturno />);

    expect(container.querySelectorAll('circle.estrela').length).toBeGreaterThanOrEqual(30);
    const janelas = container.querySelectorAll('rect.luz-vizinho');
    expect(janelas.length).toBeGreaterThan(40);

    const duracoes = new Set(
      Array.from(janelas).map((j) => (j as SVGElement).style.getPropertyValue('--duracao')),
    );
    expect(duracoes.size).toBeGreaterThan(3);
  });

  it('é determinístico: dois renders desenham exatamente o mesmo céu', () => {
    const a = render(<CeuNoturno />).container.innerHTML;
    const b = render(<CeuNoturno />).container.innerHTML;

    expect(a).toBe(b);
  });
});

describe('JanelasAcendendo', () => {
  it('mostra a quantidade pedida de janelas, escondidas do leitor de tela', () => {
    const { container } = render(<JanelasAcendendo quantidade={8} />);

    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelectorAll('.janela-luz')).toHaveLength(8);
  });

  it('sem observador (testes) as janelas já aparecem acesas, menos uma a cada quatro', () => {
    const { container } = render(<JanelasAcendendo quantidade={12} />);

    const acesas = container.querySelectorAll('[data-acesa="true"]');
    expect(acesas).toHaveLength(9);
  });

  it('cada janela tem o seu atraso, para acender em cascata', () => {
    const { container } = render(<JanelasAcendendo quantidade={4} />);

    const atrasos = Array.from(container.querySelectorAll('[data-acesa]')).map((j) =>
      (j as HTMLElement).style.getPropertyValue('--atraso'),
    );
    expect(atrasos).toEqual(['0ms', '110ms', '220ms', '330ms']);
  });
});

describe('JanelasEsperando', () => {
  it('são cinco janelinhas piscando em sequência, só como enfeite', () => {
    const { container } = render(<JanelasEsperando />);

    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    const luzes = container.querySelectorAll('.luz-vizinho');
    expect(luzes).toHaveLength(5);
    const atrasos = Array.from(luzes).map((l) =>
      (l as HTMLElement).style.getPropertyValue('--atraso'),
    );
    expect(new Set(atrasos).size).toBe(5);
  });
});
