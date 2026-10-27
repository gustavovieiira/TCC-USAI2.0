import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AbaExtratos } from './AbaExtratos';
import * as adminApi from './admin.api';
import { ExtratoDeUsuarioDTO, UsuarioAdminDTO } from './admin.types';
import { ExtratoDTO } from '@/features/saques/saques.types';

const ana: UsuarioAdminDTO = {
  id: 'u-1',
  nome: 'Ana Proprietaria',
  email: 'ana@example.com',
  papel: 'MORADOR',
  condominio: 'Residencial Jardim Europa',
  ativo: true,
};

const carla: UsuarioAdminDTO = {
  id: 'u-2',
  nome: 'Carla Sindica',
  email: 'carla@example.com',
  papel: 'SINDICO',
  condominio: 'Residencial Jardim Europa',
  ativo: true,
};

function extratoVazio(overrides: Partial<ExtratoDTO> = {}): ExtratoDTO {
  return {
    resumo: {
      saldoDisponivel: 0,
      totalRecebido: 0,
      totalComissoes: 0,
      totalSacado: 0,
      aPagar: 0,
      emAnalise: 0,
    },
    movimentos: [],
    pagamentos: [],
    ...overrides,
  };
}

describe('AbaExtratos — extrato de qualquer usuário', () => {
  it('lista os usuários e abre o extrato de quem o Admin escolher', async () => {
    vi.spyOn(adminApi, 'listarUsuarios').mockResolvedValue([ana, carla]);
    const extrato: ExtratoDeUsuarioDTO = {
      usuario: carla,
      extrato: extratoVazio({
        resumo: {
          saldoDisponivel: 12.5,
          totalRecebido: 0,
          totalComissoes: 12.5,
          totalSacado: 0,
          aPagar: 0,
          emAnalise: 0,
        },
        movimentos: [
          {
            id: 'l-1',
            tipo: 'COMISSAO',
            data: '2026-10-03T12:00:00.000Z',
            descricao: 'Comissão do condomínio sobre o aluguel de "Furadeira"',
            contraparte: null,
            valor: 12.5,
            valorBruto: 125,
            taxa: 12.5,
            taxaPercentual: 10,
            origem: {
              locacaoId: 'loc-1',
              itemTitulo: 'Furadeira',
              dono: { id: 'd-1', nome: 'Davi Dono' },
              locatario: { id: 'c-1', nome: 'Carla Locataria' },
            },
            status: 'CONFIRMADO',
          },
        ],
      }),
    };
    const abrir = vi.spyOn(adminApi, 'extratoDoUsuario').mockResolvedValue(extrato);

    render(<AbaExtratos />);
    await userEvent.click(await screen.findByRole('button', { name: /Carla Sindica/ }));

    expect(abrir).toHaveBeenCalledWith('u-2');
    expect(await screen.findByRole('heading', { name: 'Carla Sindica' })).toBeInTheDocument();
    expect(screen.getByText(/carla@example.com/)).toBeInTheDocument();
    // a comissão aparece com a origem e a conta
    expect(screen.getByText('Aluguel pago por Carla Locataria a Davi Dono')).toBeInTheDocument();
    expect(screen.getByText(/Taxa de 10% sobre/)).toBeInTheDocument();
    expect(
      screen.getByText('Comissão do condomínio', { selector: 'span.notch-sm' }),
    ).toBeInTheDocument();
  });

  it('busca por nome ou e-mail (a lista é refeita com o termo digitado)', async () => {
    const listar = vi.spyOn(adminApi, 'listarUsuarios').mockResolvedValue([ana]);

    render(<AbaExtratos />);
    await screen.findByRole('button', { name: /Ana Proprietaria/ });
    await userEvent.type(screen.getByLabelText('Buscar usuário'), 'ana@');

    await waitFor(() => expect(listar).toHaveBeenLastCalledWith('ana@'));
  });

  it('mostra erro quando o extrato não abre e continua na busca', async () => {
    vi.spyOn(adminApi, 'listarUsuarios').mockResolvedValue([ana]);
    vi.spyOn(adminApi, 'extratoDoUsuario').mockRejectedValue({
      isAxiosError: true,
      response: { data: { error: { message: 'Usuário não encontrado' } } },
    });

    render(<AbaExtratos />);
    await userEvent.click(await screen.findByRole('button', { name: /Ana Proprietaria/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Usuário não encontrado');
    expect(screen.getByLabelText('Buscar usuário')).toBeInTheDocument();
  });

  it('o botão voltar leva de volta à busca', async () => {
    vi.spyOn(adminApi, 'listarUsuarios').mockResolvedValue([ana]);
    vi.spyOn(adminApi, 'extratoDoUsuario').mockResolvedValue({
      usuario: ana,
      extrato: extratoVazio(),
    });

    render(<AbaExtratos />);
    await userEvent.click(await screen.findByRole('button', { name: /Ana Proprietaria/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Voltar à busca' }));

    expect(await screen.findByLabelText('Buscar usuário')).toBeInTheDocument();
  });

  it('o extrato do terceiro usa a linguagem "dele" (não "seu")', async () => {
    vi.spyOn(adminApi, 'listarUsuarios').mockResolvedValue([ana]);
    vi.spyOn(adminApi, 'extratoDoUsuario').mockResolvedValue({
      usuario: ana,
      extrato: extratoVazio(),
    });

    render(<AbaExtratos />);
    await userEvent.click(await screen.findByRole('button', { name: /Ana Proprietaria/ }));

    expect(await screen.findByText('Movimentações do saldo')).toBeInTheDocument();
    expect(screen.queryByText('Movimentações do seu saldo')).not.toBeInTheDocument();
  });
});

describe('AbaExtratos — conta da USAI', () => {
  async function abrirContaDaUsai() {
    render(<AbaExtratos />);
    await userEvent.click(screen.getByRole('button', { name: 'Conta da USAI' }));
  }

  it('mostra o total retido e cada linha com origem, base e taxa', async () => {
    vi.spyOn(adminApi, 'listarUsuarios').mockResolvedValue([]);
    vi.spyOn(adminApi, 'extratoPlataforma').mockResolvedValue({
      totalRetido: 15.5,
      movimentos: [
        {
          id: 'm-1',
          data: '2026-10-03T12:00:00.000Z',
          descricao: 'Taxa sobre o aluguel de "Furadeira" (condomínio sem síndico ativo)',
          valor: 10,
          baseCalculo: 100,
          taxaPercentual: 10,
          origem: {
            locacaoId: 'loc-1',
            itemTitulo: 'Furadeira',
            dono: { id: 'd-1', nome: 'Davi Dono' },
            locatario: { id: 'c-1', nome: 'Carla Locataria' },
          },
        },
      ],
    });

    await abrirContaDaUsai();

    expect(await screen.findByText(/15,50/)).toBeInTheDocument();
    expect(screen.getByText('Aluguel pago por Carla Locataria a Davi Dono')).toBeInTheDocument();
    expect(screen.getByText(/Taxa de 10% sobre/)).toBeInTheDocument();
  });

  it('clicar numa linha abre o registro com a origem e o valor retido', async () => {
    vi.spyOn(adminApi, 'listarUsuarios').mockResolvedValue([]);
    vi.spyOn(adminApi, 'extratoPlataforma').mockResolvedValue({
      totalRetido: 10,
      movimentos: [
        {
          id: 'm-1',
          data: '2026-10-03T12:00:00.000Z',
          descricao: 'Taxa sobre o aluguel',
          valor: 10,
          baseCalculo: 100,
          taxaPercentual: 10,
          origem: {
            locacaoId: 'loc-1',
            itemTitulo: 'Furadeira',
            dono: { id: 'd-1', nome: 'Davi Dono' },
            locatario: { id: 'c-1', nome: 'Carla Locataria' },
          },
        },
      ],
    });

    await abrirContaDaUsai();
    await userEvent.click(await screen.findByRole('button', { name: /Ver detalhes e recibo/ }));

    const dialogo = await screen.findByRole('dialog', { name: 'Registro da conta da USAI' });
    expect(dialogo).toHaveTextContent('Furadeira');
    expect(dialogo).toHaveTextContent('Base de cálculo');
    expect(dialogo).toHaveTextContent('Protocolo: m-1');
  });

  it('sem nada retido mostra o estado vazio', async () => {
    vi.spyOn(adminApi, 'listarUsuarios').mockResolvedValue([]);
    vi.spyOn(adminApi, 'extratoPlataforma').mockResolvedValue({ totalRetido: 0, movimentos: [] });

    await abrirContaDaUsai();

    expect(await screen.findByText('Nada retido pela plataforma')).toBeInTheDocument();
  });
});
