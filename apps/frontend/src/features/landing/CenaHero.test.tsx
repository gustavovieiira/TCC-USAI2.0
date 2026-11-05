import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { CenaHero } from './CenaHero';

function renderCena() {
  return render(
    <MemoryRouter>
      <CenaHero />
    </MemoryRouter>,
  );
}

const janelaDo = (apto: string) =>
  screen.getByRole('button', { name: new RegExp(`Apartamento ${apto}:`) });

describe('CenaHero', () => {
  it('traz o título, as ações e o aviso de que a cena é ilustrativa', () => {
    renderCena();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Itens e serviços entre vizinhos, com segurança e regras claras',
    );
    expect(screen.getByRole('link', { name: 'Contratar para meu condomínio' })).toHaveAttribute(
      'href',
      '/contratar',
    );
    expect(screen.getByRole('link', { name: 'Já tenho conta' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Cadastre-se com o link do síndico' })).toHaveAttribute(
      'href',
      '/cadastro',
    );
    expect(
      screen.getByText(/Exemplo ilustrativo, com apartamentos, itens e preços fictícios/),
    ).toBeInTheDocument();
  });

  it('só as janelas com item são botões (6), todas focáveis pelo teclado', () => {
    renderCena();

    const janelas = screen.getAllByRole('button', { name: /Apartamento \d+:/ });
    expect(janelas).toHaveLength(6);
    janelas.forEach((janela) => expect(janela).toHaveAttribute('tabindex', '0'));
  });

  it('antes de tocar, o bilhete convida a tocar numa janela', () => {
    renderCena();

    expect(
      screen.getByText('Toque numa janela acesa e veja o que o vizinho tem pra emprestar.'),
    ).toBeInTheDocument();
  });

  it('tocar numa janela mostra o apartamento, o item, o preço e o estado', async () => {
    renderCena();

    await userEvent.click(janelaDo('304'));

    expect(screen.getByText('Apto 304')).toBeInTheDocument();
    expect(screen.getByText('Furadeira de impacto')).toBeInTheDocument();
    expect(screen.getByText(/R\$ 20 \/ dia/)).toBeInTheDocument();
    expect(screen.getByText('disponível')).toBeInTheDocument();
    expect(janelaDo('304')).toHaveAttribute('aria-pressed', 'true');
  });

  it('"Pedir emprestado" reserva o item, avisa o leitor de tela e vira "Devolver"', async () => {
    renderCena();

    await userEvent.click(janelaDo('304'));
    await userEvent.click(screen.getByRole('button', { name: 'Pedir emprestado' }));

    expect(screen.getByRole('status')).toHaveTextContent(
      'Furadeira de impacto: reservado para você.',
    );
    expect(screen.getByText('reservado')).toBeInTheDocument();
    expect(janelaDo('304')).toHaveAttribute('aria-label', expect.stringContaining('reservado'));

    await userEvent.click(screen.getByRole('button', { name: 'Devolver' }));

    expect(screen.getByRole('status')).toHaveTextContent('devolvido, disponível de novo');
    expect(screen.getByRole('button', { name: 'Pedir emprestado' })).toBeInTheDocument();
  });

  it('a escada do 302 já começa reservada, com a data', async () => {
    renderCena();

    await userEvent.click(janelaDo('302'));

    expect(screen.getByText('reservado até 08/11')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Devolver' })).toBeInTheDocument();
  });

  it('funciona pelo teclado: Enter seleciona e tocar de novo na mesma janela solta a seleção', async () => {
    renderCena();

    janelaDo('203').focus();
    await userEvent.keyboard('{Enter}');
    expect(screen.getByText('Barraca para 4 pessoas')).toBeInTheDocument();

    await userEvent.keyboard(' ');
    expect(
      screen.getByText('Toque numa janela acesa e veja o que o vizinho tem pra emprestar.'),
    ).toBeInTheDocument();
  });

  it('o prédio tem descrição para quem usa leitor de tela', () => {
    renderCena();

    const predio = screen.getByRole('group', { name: /Prédio de apartamentos à noite/ });
    expect(within(predio).getAllByRole('button')).toHaveLength(6);
  });
});
