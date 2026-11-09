import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AdminPage } from './AdminPage';
import * as adminApi from '@/features/admin/admin.api';
import * as plataformaApi from '@/features/admin/plataforma.api';
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
  percentualComissao: 0,
  createdAt: '2026-09-01T00:00:00.000Z',
};

function mockApis(overrides: { condominios?: CondominioAdminDTO[]; saques?: SaqueDTO[] } = {}) {
  vi.spyOn(adminApi, 'resumoFinanceiro').mockResolvedValue(resumo);
  vi.spyOn(saquesApi, 'listarTodosSaques').mockResolvedValue(overrides.saques ?? [saquePendente]);
  vi.spyOn(adminApi, 'listarCondominios').mockResolvedValue(
    overrides.condominios ?? [condominioBase],
  );
}

describe('AdminPage: aba Financeiro', () => {
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

describe('AdminPage: taxas e extratos', () => {
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

describe('AdminPage: aba Plataforma', () => {
  it('abre o financeiro das vendas da plataforma (assinaturas, o que entrou e saiu no mês e despesas)', async () => {
    mockApis();
    vi.spyOn(plataformaApi, 'buscarVendasDoMes').mockResolvedValue({
      mes: '2026-11',
      resumo: {
        entrou: 299,
        taxasAsaas: 1.99,
        despesas: 0,
        resultado: 297.01,
        pagamentos: 1,
        taxasNaoInformadas: 0,
      },
      recebimentos: [],
      despesas: [],
    });
    vi.spyOn(plataformaApi, 'listarAssinaturasAdmin').mockResolvedValue({
      resumo: { total: 0, ativas: 0, aguardandoPagamento: 0, suspensas: 0, vencidas: 0 },
      itens: [],
    });

    render(<AdminPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Plataforma' }));

    expect(
      await screen.findByRole('heading', { name: 'Vendas da plataforma' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Assinaturas dos condomínios' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Despesas da plataforma' })).toBeInTheDocument();
    expect(plataformaApi.buscarVendasDoMes).toHaveBeenCalled();
  });
});

describe('AdminPage: aba Condomínios', () => {
  it('cria um condomínio novo', async () => {
    mockApis();
    vi.spyOn(adminApi, 'criarCondominio').mockResolvedValue({
      id: 'cond-2',
      nome: 'Residencial Monte Verde',
      linkSlug: 'residencial-monte-verde',
      pin: '4321',
      ativo: true,
      percentualComissao: 0,
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

  it('desativa um condomínio ativo só depois de confirmar na janela', async () => {
    mockApis();
    vi.spyOn(adminApi, 'atualizarCondominio').mockResolvedValue({
      ...condominioBase,
      ativo: false,
    });

    render(<AdminPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Condomínios' }));
    await screen.findByText('Residencial Jardim Europa');

    await userEvent.click(screen.getByRole('button', { name: 'Desativar' }));
    expect(adminApi.atualizarCondominio).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Desativar condomínio' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Sim, desativar' }));

    expect(adminApi.atualizarCondominio).toHaveBeenCalledWith('cond-1', { ativo: false });
    expect(await screen.findByRole('button', { name: 'Ativar' })).toBeInTheDocument();
  });

  it('mostra a comissão de cada condomínio (padrão 0%) e o Admin a altera numa janela', async () => {
    mockApis();
    vi.spyOn(adminApi, 'atualizarCondominio').mockResolvedValue({
      ...condominioBase,
      percentualComissao: 7.5,
    });

    render(<AdminPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Condomínios' }));
    await screen.findByText('Residencial Jardim Europa');
    expect(screen.getByText(/Comissão do condomínio:/)).toHaveTextContent('0% do aluguel');

    await userEvent.click(
      screen.getByRole('button', { name: 'Alterar a comissão de Residencial Jardim Europa' }),
    );
    const campo = screen.getByLabelText('Comissão (% do aluguel)');
    await userEvent.clear(campo);
    await userEvent.type(campo, '7,5');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar comissão' }));

    expect(adminApi.atualizarCondominio).toHaveBeenCalledWith('cond-1', {
      percentualComissao: 7.5,
    });
    expect(await screen.findByText(/Comissão do condomínio:/)).toHaveTextContent('7,5% do aluguel');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('cancelar a janela mantém o condomínio ativo', async () => {
    mockApis();
    vi.spyOn(adminApi, 'atualizarCondominio').mockResolvedValue(condominioBase);

    render(<AdminPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Condomínios' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Desativar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(adminApi.atualizarCondominio).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('busca e filtra os condomínios por situação', async () => {
    mockApis({
      condominios: [
        condominioBase,
        {
          ...condominioBase,
          id: 'cond-2',
          nome: 'Edifício Aurora',
          linkSlug: 'aurora',
          ativo: false,
        },
      ],
    });

    render(<AdminPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Condomínios' }));
    await screen.findByText('Edifício Aurora');

    await userEvent.click(screen.getByRole('button', { name: /Inativos/ }));
    expect(screen.getByText('Edifício Aurora')).toBeInTheDocument();
    expect(screen.queryByText('Residencial Jardim Europa')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /^Todos/ }));
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar condomínio' }), 'jardim');
    expect(screen.queryByText('Edifício Aurora')).not.toBeInTheDocument();
    expect(screen.getByText('Residencial Jardim Europa')).toBeInTheDocument();
  });
});

describe('AdminPage: busca e filtros dos saques', () => {
  const saqueAna: SaqueDTO = {
    ...saquePendente,
    id: 'saque-ana',
    solicitanteNome: 'Ana Proprietaria',
    chavePixUsada: 'ana@pix.com',
  };
  const pagoCarla: SaqueDTO = {
    ...saquePendente,
    id: 'saque-carla',
    solicitanteNome: 'Carla Souza',
    status: 'PAGO',
    processadoEm: '2026-09-16T12:00:00.000Z',
    pagoEm: '2026-09-17T12:00:00.000Z',
  };
  const rejeitadoDiego: SaqueDTO = {
    ...saquePendente,
    id: 'saque-diego',
    solicitanteNome: 'Diego Martins',
    status: 'REJEITADO',
    motivoRejeicao: 'Chave inválida',
    processadoEm: '2026-09-16T12:00:00.000Z',
  };

  it('o cabeçalho e a aba avisam quantos saques esperam uma ação', async () => {
    mockApis({ saques: [saquePendente, { ...saqueAna, status: 'APROVADO' }] });

    render(<AdminPage />);

    expect(await screen.findByText('Aguardando decisão')).toBeInTheDocument();
    expect(screen.getByText('Aguardando decisão').nextSibling).toHaveTextContent('1');
    expect(screen.getByText('PIX a transferir').nextSibling).toHaveTextContent('1');
    expect(screen.getByLabelText('2 para resolver')).toBeInTheDocument();
  });

  it('busca o saque pelo nome de quem pediu', async () => {
    mockApis({ saques: [saquePendente, saqueAna] });

    render(<AdminPage />);
    await screen.findByText('Ana Proprietaria');

    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar saque' }), 'ana');

    expect(screen.getByText('Ana Proprietaria')).toBeInTheDocument();
    expect(screen.queryByText('Bruno Locatario')).not.toBeInTheDocument();
  });

  it('filtra o histórico entre pagos e rejeitados', async () => {
    mockApis({ saques: [pagoCarla, rejeitadoDiego] });

    render(<AdminPage />);
    await screen.findByText('Carla Souza');
    expect(screen.getByText('Diego Martins')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Rejeitados/ }));
    expect(screen.queryByText('Carla Souza')).not.toBeInTheDocument();
    expect(screen.getByText('Diego Martins')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Pagos/ }));
    expect(screen.getByText('Carla Souza')).toBeInTheDocument();
    expect(screen.queryByText('Diego Martins')).not.toBeInTheDocument();
  });
});

describe('AdminPage: aba Síndicos', () => {
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
