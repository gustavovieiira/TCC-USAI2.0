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
    pago: { quantidade: 4, valorTotal: 500 },
    rejeitado: { quantidade: 0, valorTotal: 0 },
  },
  taxas: { repassadoAosSindicos: 120, retidoPelaPlataforma: 80 },
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
  pagoEm: null,
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
    expect(screen.getByText('Saques pagos').nextSibling).toHaveTextContent('4');
  });

  it('aprovar tira o saque dos pendentes e leva pra "aguardando o PIX" (ainda não é pago)', async () => {
    mockApis();
    vi.spyOn(saquesApi, 'aprovarSaque').mockResolvedValue({
      ...saquePendente,
      status: 'APROVADO',
      processadoEm: '2026-09-20T12:00:00.000Z',
    });

    render(<AdminPage />);
    await screen.findByText('user@pix.com', { exact: false });

    await userEvent.click(screen.getByRole('button', { name: 'Aprovar' }));

    expect(saquesApi.aprovarSaque).toHaveBeenCalledWith('saque-1');
    expect(await screen.findByText('Nenhum saque pendente')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Marcar como pago' })).toBeInTheDocument();
    // o nome de quem pediu continua aparecendo depois da ação
    expect(screen.getByText('Bruno Locatario')).toBeInTheDocument();
  });

  it('marcar como pago move o saque aprovado para o histórico, com o nome e a data do PIX', async () => {
    mockApis({
      saques: [{ ...saquePendente, status: 'APROVADO', processadoEm: '2026-09-20T12:00:00.000Z' }],
    });
    vi.spyOn(saquesApi, 'pagarSaque').mockResolvedValue({
      ...saquePendente,
      status: 'PAGO',
      processadoEm: '2026-09-20T12:00:00.000Z',
      pagoEm: '2026-09-21T12:00:00.000Z',
    });

    render(<AdminPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Marcar como pago' }));

    expect(saquesApi.pagarSaque).toHaveBeenCalledWith('saque-1');
    expect(await screen.findByText('Nenhum PIX a transferir')).toBeInTheDocument();
    expect(screen.getByText(/PIX enviado em/)).toBeInTheDocument();
    expect(screen.getByText('Bruno Locatario')).toBeInTheDocument();
  });

  it('mostra erro quando marcar como pago falha e mantém o saque na fila', async () => {
    mockApis({ saques: [{ ...saquePendente, status: 'APROVADO' }] });
    vi.spyOn(saquesApi, 'pagarSaque').mockRejectedValue({
      isAxiosError: true,
      response: {
        data: { error: { message: 'Só é possível marcar como pago um saque aprovado' } },
      },
    });

    render(<AdminPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Marcar como pago' }));

    expect(await screen.findByText(/Só é possível marcar como pago/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Marcar como pago' })).toBeInTheDocument();
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
    expect(screen.getByText(/Motivo: Chave inválida/)).toBeInTheDocument();
  });

  it('o histórico mostra pagos e rejeitados, com o nome de quem pediu e o motivo', async () => {
    mockApis({
      saques: [
        saquePendente,
        {
          ...saquePendente,
          id: 'saque-2',
          valor: 40,
          solicitanteNome: 'Ana Proprietaria',
          status: 'PAGO',
          processadoEm: '2026-09-20T12:00:00.000Z',
          pagoEm: '2026-09-21T12:00:00.000Z',
        },
        {
          ...saquePendente,
          id: 'saque-3',
          valor: 60,
          status: 'REJEITADO',
          motivoRejeicao: 'Chave PIX divergente',
          processadoEm: '2026-09-21T12:00:00.000Z',
        },
      ],
    });

    render(<AdminPage />);

    expect(await screen.findByText('Histórico de saques')).toBeInTheDocument();
    expect(screen.getByText('Ana Proprietaria')).toBeInTheDocument();
    expect(screen.getByText(/Motivo: Chave PIX divergente/)).toBeInTheDocument();
    expect(screen.getAllByText(/decidido em/)).toHaveLength(2);
    // só o pendente tem os botões de decisão
    expect(screen.getAllByRole('button', { name: 'Aprovar' })).toHaveLength(1);
  });

  it('a lista do histórico rola em vez de esticar a página', async () => {
    mockApis({
      saques: [{ ...saquePendente, status: 'PAGO', pagoEm: '2026-09-21T12:00:00.000Z' }],
    });

    render(<AdminPage />);
    await screen.findByText('Histórico de saques');

    const lista = screen.getByText(/PIX enviado em/).closest('.overflow-y-auto');
    expect(lista).toHaveClass('max-h-[28rem]');
  });

  it('clicar no card abre os detalhes completos do saque, com recibo quando está pago', async () => {
    const imprimir = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    mockApis({
      saques: [
        {
          ...saquePendente,
          status: 'PAGO',
          solicitanteCondominio: 'Residencial Jardim Europa',
          processadoEm: '2026-09-20T12:00:00.000Z',
          pagoEm: '2026-09-21T12:00:00.000Z',
        },
      ],
    });

    render(<AdminPage />);
    await userEvent.click(await screen.findByText(/PIX enviado em/));

    const dialogo = await screen.findByRole('dialog', { name: 'Recibo de pagamento de saque' });
    expect(dialogo).toHaveTextContent('Residencial Jardim Europa');
    expect(dialogo).toHaveTextContent('user@pix.com');
    expect(dialogo).toHaveTextContent('Protocolo: saque-1');

    await userEvent.click(screen.getByRole('button', { name: 'Gerar recibo' }));
    expect(imprimir).toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('saque pendente abre detalhes sem recibo (só imprimir detalhes) e os botões do card não abrem o modal', async () => {
    mockApis();
    vi.spyOn(saquesApi, 'aprovarSaque').mockResolvedValue({ ...saquePendente, status: 'APROVADO' });

    render(<AdminPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Aprovar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await userEvent.click(await screen.findByRole('button', { name: /Ver detalhes e recibo/ }));
    expect(screen.getByRole('button', { name: 'Imprimir detalhes' })).toBeInTheDocument();
  });
});

describe('AdminPage — taxas e extratos', () => {
  it('mostra pra onde foi a taxa dos aluguéis: síndicos e plataforma', async () => {
    mockApis();

    render(<AdminPage />);

    expect((await screen.findByText('Taxa repassada aos síndicos')).nextSibling).toHaveTextContent(
      /120,00/,
    );
    expect(screen.getByText('Taxa retida pela USAI').nextSibling).toHaveTextContent(/80,00/);
  });

  it('a aba Extratos abre a busca de usuários', async () => {
    mockApis();
    vi.spyOn(adminApi, 'listarUsuarios').mockResolvedValue([
      {
        id: 'u-1',
        nome: 'Ana Proprietaria',
        email: 'ana@example.com',
        papel: 'MORADOR',
        condominio: 'Residencial Jardim Europa',
        ativo: true,
      },
    ]);

    render(<AdminPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Extratos' }));

    expect(await screen.findByRole('button', { name: /Ana Proprietaria/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Conta da USAI' })).toBeInTheDocument();
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
