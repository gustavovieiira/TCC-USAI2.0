import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AdminPage } from './AdminPage';
import * as adminApi from '@/features/admin/admin.api';
import * as saquesApi from '@/features/saques/saques.api';
import { CondominioAdminDTO, ResumoFinanceiroDTO } from '@/features/admin/admin.types';
import { SaqueDTO } from '@/features/saques/saques.types';

const resumo: ResumoFinanceiroDTO = {
  saques: {
    pendente: { quantidade: 1, valorTotal: 100 },
    aprovado: { quantidade: 2, valorTotal: 300 },
    rejeitado: { quantidade: 0, valorTotal: 0 },
  },
  condominiosAtivos: 2,
};

const saquePendente: SaqueDTO = {
  id: 'saque-1',
  userId: 'user-1',
  solicitanteNome: 'Bruno Locatario',
  valor: 100,
  chavePixUsada: 'user@pix.com',
  status: 'PENDENTE',
  motivoRejeicao: null,
  createdAt: '2026-09-15T12:00:00.000Z',
  processadoEm: null,
};

const condominioBase: CondominioAdminDTO = {
  id: 'cond-1',
  nome: 'Residencial Jardim Europa',
  linkSlug: 'residencial-jardim-europa',
  pin: '1234',
  ativo: true,
  createdAt: '2026-09-01T00:00:00.000Z',
};

function mockApis(overrides: { condominios?: CondominioAdminDTO[]; saques?: SaqueDTO[] } = {}) {
  vi.spyOn(adminApi, 'resumoFinanceiro').mockResolvedValue(resumo);
  vi.spyOn(saquesApi, 'listarTodosSaques').mockResolvedValue(overrides.saques ?? [saquePendente]);
  vi.spyOn(adminApi, 'listarCondominios').mockResolvedValue(
    overrides.condominios ?? [condominioBase],
  );
}

describe('AdminPage — aba Financeiro', () => {
  it('mostra o resumo e os saques pendentes', async () => {
    mockApis();

    render(<AdminPage />);

    expect(await screen.findByText('user@pix.com', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Bruno Locatario')).toBeInTheDocument();
    expect(screen.getByText('Condomínios ativos').nextSibling).toHaveTextContent('2');
  });

  it('aprova um saque pendente e remove ele da lista', async () => {
    mockApis();
    vi.spyOn(saquesApi, 'aprovarSaque').mockResolvedValue({ ...saquePendente, status: 'APROVADO' });

    render(<AdminPage />);
    await screen.findByText('user@pix.com', { exact: false });

    await userEvent.click(screen.getByRole('button', { name: 'Aprovar' }));

    expect(saquesApi.aprovarSaque).toHaveBeenCalledWith('saque-1');
    expect(await screen.findByText('Nenhum saque pendente')).toBeInTheDocument();
  });

  it('rejeita um saque pendente informando o motivo', async () => {
    mockApis();
    vi.spyOn(saquesApi, 'rejeitarSaque').mockResolvedValue({
      ...saquePendente,
      status: 'REJEITADO',
      motivoRejeicao: 'Chave inválida',
    });

    render(<AdminPage />);
    await screen.findByText('user@pix.com', { exact: false });

    await userEvent.click(screen.getByRole('button', { name: 'Rejeitar' }));
    await userEvent.type(screen.getByLabelText('Motivo da rejeição'), 'Chave inválida');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar rejeição' }));

    expect(saquesApi.rejeitarSaque).toHaveBeenCalledWith('saque-1', 'Chave inválida');
    expect(await screen.findByText('Nenhum saque pendente')).toBeInTheDocument();
  });
});

describe('AdminPage — aba Condomínios', () => {
  it('cria um condomínio novo', async () => {
    mockApis();
    vi.spyOn(adminApi, 'criarCondominio').mockResolvedValue({
      id: 'cond-2',
      nome: 'Residencial Monte Verde',
      linkSlug: 'residencial-monte-verde',
      pin: '4321',
      ativo: true,
      createdAt: '2026-09-15T00:00:00.000Z',
    });

    render(<AdminPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Condomínios' }));

    await userEvent.type(screen.getByLabelText('Nome'), 'Residencial Monte Verde');
    await userEvent.type(screen.getByLabelText('Link de acesso'), 'residencial-monte-verde');
    await userEvent.type(screen.getByLabelText('PIN'), '4321');
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar' }));

    expect(adminApi.criarCondominio).toHaveBeenCalledWith({
      nome: 'Residencial Monte Verde',
      linkSlug: 'residencial-monte-verde',
      pin: '4321',
    });
    expect(await screen.findByText('Residencial Monte Verde')).toBeInTheDocument();
  });

  it('desativa um condomínio ativo', async () => {
    mockApis();
    vi.spyOn(adminApi, 'atualizarCondominio').mockResolvedValue({
      ...condominioBase,
      ativo: false,
    });

    render(<AdminPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Condomínios' }));
    await screen.findByText('Residencial Jardim Europa');

    await userEvent.click(screen.getByRole('button', { name: 'Desativar' }));

    expect(adminApi.atualizarCondominio).toHaveBeenCalledWith('cond-1', { ativo: false });
    expect(await screen.findByRole('button', { name: 'Ativar' })).toBeInTheDocument();
  });
});

describe('AdminPage — aba Síndicos', () => {
  it('cria a conta de síndico pro condomínio selecionado', async () => {
    mockApis();
    vi.spyOn(adminApi, 'criarSindico').mockResolvedValue({
      id: 'user-sindico',
      nome: 'Carla Síndica',
      email: 'carla@example.com',
      condominioId: 'cond-1',
    });

    render(<AdminPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Síndicos' }));
    await screen.findByRole('option', { name: 'Residencial Jardim Europa' });

    await userEvent.type(screen.getByLabelText('Nome'), 'Carla Síndica');
    await userEvent.type(screen.getByLabelText('E-mail'), 'carla@example.com');
    await userEvent.type(screen.getByLabelText('Senha'), 'senha-forte-123');
    await userEvent.selectOptions(screen.getByLabelText('Condomínio'), 'cond-1');
    await userEvent.click(screen.getByRole('button', { name: 'Criar síndico' }));

    expect(adminApi.criarSindico).toHaveBeenCalledWith({
      nome: 'Carla Síndica',
      email: 'carla@example.com',
      senha: 'senha-forte-123',
      condominioId: 'cond-1',
    });
    expect(await screen.findByText(/criado com sucesso/)).toBeInTheDocument();
  });
});
