import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SaquesPage } from './SaquesPage';
import * as saquesApi from '@/features/saques/saques.api';
import { SaqueDTO } from '@/features/saques/saques.types';

function buildSaque(overrides: Partial<SaqueDTO> = {}): SaqueDTO {
  return {
    id: 'saque-1',
    userId: 'user-1',
    valor: 100,
    chavePixUsada: 'user@pix.com',
    status: 'PENDENTE',
    motivoRejeicao: null,
    createdAt: '2026-09-15T12:00:00.000Z',
    processadoEm: null,
    ...overrides,
  };
}

describe('SaquesPage', () => {
  it('lista as solicitações existentes', async () => {
    vi.spyOn(saquesApi, 'listarMeusSaques').mockResolvedValue([buildSaque()]);
    vi.spyOn(saquesApi, 'buscarSaldo').mockResolvedValue(0);

    render(<SaquesPage />);

    expect(await screen.findByText('user@pix.com', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Pendente')).toBeInTheDocument();
  });

  it('mostra o saldo líquido disponível', async () => {
    vi.spyOn(saquesApi, 'listarMeusSaques').mockResolvedValue([]);
    vi.spyOn(saquesApi, 'buscarSaldo').mockResolvedValue(250.5);

    render(<SaquesPage />);

    expect(await screen.findByText(/250,50/)).toBeInTheDocument();
  });

  it('mostra estado vazio quando não há solicitações', async () => {
    vi.spyOn(saquesApi, 'listarMeusSaques').mockResolvedValue([]);
    vi.spyOn(saquesApi, 'buscarSaldo').mockResolvedValue(0);

    render(<SaquesPage />);

    expect(await screen.findByText('Nenhuma solicitação ainda')).toBeInTheDocument();
  });

  it('mostra o motivo quando uma solicitação foi rejeitada', async () => {
    vi.spyOn(saquesApi, 'listarMeusSaques').mockResolvedValue([
      buildSaque({ status: 'REJEITADO', motivoRejeicao: 'Chave PIX divergente do cadastro' }),
    ]);
    vi.spyOn(saquesApi, 'buscarSaldo').mockResolvedValue(0);

    render(<SaquesPage />);

    expect(await screen.findByText(/Chave PIX divergente do cadastro/)).toBeInTheDocument();
  });

  it('solicita um novo saque e adiciona na lista sem precisar recarregar', async () => {
    vi.spyOn(saquesApi, 'listarMeusSaques').mockResolvedValue([]);
    vi.spyOn(saquesApi, 'buscarSaldo').mockResolvedValue(100);
    vi.spyOn(saquesApi, 'solicitarSaque').mockResolvedValue(
      buildSaque({ id: 'saque-novo', valor: 50, chavePixUsada: 'novo@pix.com' }),
    );

    render(<SaquesPage />);
    await screen.findByText('Nenhuma solicitação ainda');

    await userEvent.type(screen.getByLabelText('Valor (R$)'), '50');
    await userEvent.type(screen.getByLabelText('Chave PIX'), 'novo@pix.com');
    await userEvent.click(screen.getByRole('button', { name: 'Solicitar' }));

    expect(saquesApi.solicitarSaque).toHaveBeenCalledWith({
      valor: 50,
      chavePixUsada: 'novo@pix.com',
    });
    expect(await screen.findByText('novo@pix.com', { exact: false })).toBeInTheDocument();
  });

  it('exibe erro quando a solicitação falha (ex: saldo insuficiente)', async () => {
    vi.spyOn(saquesApi, 'listarMeusSaques').mockResolvedValue([]);
    vi.spyOn(saquesApi, 'buscarSaldo').mockResolvedValue(0);
    vi.spyOn(saquesApi, 'solicitarSaque').mockRejectedValue({
      isAxiosError: true,
      response: { data: { error: { message: 'Valor solicitado maior que o saldo disponível' } } },
    });

    render(<SaquesPage />);
    await screen.findByText('Nenhuma solicitação ainda');

    await userEvent.type(screen.getByLabelText('Valor (R$)'), '50');
    await userEvent.type(screen.getByLabelText('Chave PIX'), 'novo@pix.com');
    await userEvent.click(screen.getByRole('button', { name: 'Solicitar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Valor solicitado maior que o saldo disponível',
    );
  });
});
