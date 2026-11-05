import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AbaExtratos } from './AbaExtratos';
import * as adminApi from './admin.api';
import { UsuarioAdminDTO } from './admin.types';

const ana: UsuarioAdminDTO = {
  id: 'u-1',
  nome: 'Ana Proprietaria',
  email: 'ana@example.com',
  papel: 'MORADOR',
  condominio: 'Residencial Jardim Europa',
  ativo: true,
};
const carla: UsuarioAdminDTO = { ...ana, id: 'u-2', nome: 'Carla Sindica', papel: 'SINDICO' };

describe('AbaExtratos: filtros', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-05T12:00:00.000Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('filtra a lista de usuários por papel', async () => {
    vi.spyOn(adminApi, 'listarUsuarios').mockResolvedValue([ana, carla]);

    render(<AbaExtratos />);
    await screen.findByRole('button', { name: /Ana Proprietaria/ });

    await userEvent.click(screen.getByRole('button', { name: /Síndicos/ }));
    expect(screen.queryByRole('button', { name: /Ana Proprietaria/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Carla Sindica/ })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Admins/ }));
    expect(screen.getByText('Nenhum usuário encontrado')).toBeInTheDocument();
  });

  it('na conta da USAI, o período esconde o que é mais antigo', async () => {
    vi.spyOn(adminApi, 'listarUsuarios').mockResolvedValue([]);
    const movimento = (id: string, data: string, descricao: string) => ({
      id,
      data,
      descricao,
      valor: 10,
      baseCalculo: 100,
      taxaPercentual: 10,
      origem: null,
    });
    vi.spyOn(adminApi, 'extratoPlataforma').mockResolvedValue({
      totalRetido: 20,
      movimentos: [
        movimento('m-1', '2026-11-01T12:00:00.000Z', 'Taxa recente'),
        movimento('m-2', '2026-06-01T12:00:00.000Z', 'Taxa antiga'),
      ],
    });

    render(<AbaExtratos />);
    await userEvent.click(screen.getByRole('button', { name: 'Conta da USAI' }));
    await screen.findByText('Taxa antiga');

    await userEvent.selectOptions(screen.getByLabelText('Período'), '30');

    expect(screen.getByText('Taxa recente')).toBeInTheDocument();
    expect(screen.queryByText('Taxa antiga')).not.toBeInTheDocument();
  });
});
