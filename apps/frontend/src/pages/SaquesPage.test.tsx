import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SaquesPage } from './SaquesPage';
import * as saquesApi from '@/features/saques/saques.api';
import { ExtratoDTO, MovimentoExtratoDTO } from '@/features/saques/saques.types';

function buildExtrato(overrides: Partial<ExtratoDTO> = {}): ExtratoDTO {
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

const recebimento: MovimentoExtratoDTO = {
  id: 'loc-1',
  tipo: 'RECEBIMENTO',
  data: '2026-10-03T12:00:00.000Z',
  descricao: 'Aluguel de "Furadeira"',
  contraparte: { id: 'u-2', nome: 'Carla Locataria' },
  valor: 90,
  valorBruto: 100,
  taxa: 10,
  status: 'CONFIRMADO',
};

function buildSaque(overrides: Partial<MovimentoExtratoDTO> = {}): MovimentoExtratoDTO {
  return {
    id: 'saque-1',
    tipo: 'SAQUE',
    data: '2026-10-05T12:00:00.000Z',
    descricao: 'Saque via PIX',
    contraparte: null,
    valor: -30,
    status: 'EM_ANALISE',
    chavePix: '****1234',
    ...overrides,
  };
}

describe('SaquesPage — extrato', () => {
  it('mostra o saldo disponível e os totais do resumo', async () => {
    vi.spyOn(saquesApi, 'buscarExtrato').mockResolvedValue(
      buildExtrato({
        resumo: {
          saldoDisponivel: 250.5,
          totalRecebido: 400,
          totalComissoes: 0,
          totalSacado: 100,
          aPagar: 0,
          emAnalise: 49.5,
        },
      }),
    );

    render(<SaquesPage />);

    expect(await screen.findByText(/250,50/)).toBeInTheDocument();
    expect(screen.getByText(/400,00/)).toBeInTheDocument();
    expect(screen.getByText(/49,50/)).toBeInTheDocument();
  });

  it('mostra quem pagou e a conta bruto − taxa = líquido de cada recebimento', async () => {
    vi.spyOn(saquesApi, 'buscarExtrato').mockResolvedValue(
      buildExtrato({ movimentos: [recebimento] }),
    );

    render(<SaquesPage />);

    expect(await screen.findByText('Pago por Carla Locataria')).toBeInTheDocument();
    expect(screen.getByText(/Aluguel de R\$\s*100,00/)).toHaveTextContent(/R\$\s*10,00/);
    expect(screen.getByText(/\+\s*R\$\s*90,00/)).toBeInTheDocument();
  });

  it('mostra o saque em análise com a chave PIX mascarada', async () => {
    vi.spyOn(saquesApi, 'buscarExtrato').mockResolvedValue(
      buildExtrato({ movimentos: [buildSaque()] }),
    );

    render(<SaquesPage />);

    expect(await screen.findByText(/\*\*\*\*1234/)).toBeInTheDocument();
    expect(screen.getByText('Em análise', { selector: 'span.notch-sm' })).toBeInTheDocument();
  });

  it('mostra o motivo e avisa que o valor voltou quando o saque foi rejeitado', async () => {
    vi.spyOn(saquesApi, 'buscarExtrato').mockResolvedValue(
      buildExtrato({
        movimentos: [buildSaque({ status: 'REJEITADO', motivo: 'Chave PIX divergente' })],
      }),
    );

    render(<SaquesPage />);

    expect(await screen.findByText(/Chave PIX divergente/)).toBeInTheDocument();
    expect(screen.getByText(/voltou para o seu saldo/)).toBeInTheDocument();
  });

  it('separa o que a pessoa pagou como locatária e avisa do reembolso pendente', async () => {
    vi.spyOn(saquesApi, 'buscarExtrato').mockResolvedValue(
      buildExtrato({
        pagamentos: [
          {
            id: 'p-1',
            data: '2026-10-02T12:00:00.000Z',
            descricao: 'Aluguel de "Escada"',
            contraparte: { id: 'u-3', nome: 'Davi Dono' },
            valor: 50,
            periodo: { inicio: '2026-10-10T00:00:00.000Z', fim: '2026-10-11T00:00:00.000Z' },
            status: 'EM_REEMBOLSO',
          },
        ],
      }),
    );

    render(<SaquesPage />);

    expect(await screen.findByText('O que você pagou')).toBeInTheDocument();
    expect(screen.getByText('Pago a Davi Dono')).toBeInTheDocument();
    expect(screen.getByText('Aguardando reembolso')).toBeInTheDocument();
  });

  it('mostra estado vazio quando não há movimentações', async () => {
    vi.spyOn(saquesApi, 'buscarExtrato').mockResolvedValue(buildExtrato());

    render(<SaquesPage />);

    expect(await screen.findByText('Nenhuma movimentação ainda')).toBeInTheDocument();
    expect(screen.queryByText('O que você pagou')).not.toBeInTheDocument();
  });

  it('mostra o erro quando o extrato não carrega', async () => {
    vi.spyOn(saquesApi, 'buscarExtrato').mockRejectedValue({
      isAxiosError: true,
      response: { data: { error: { message: 'Falha ao carregar' } } },
    });

    render(<SaquesPage />);

    expect(await screen.findByText('Falha ao carregar')).toBeInTheDocument();
  });
});

describe('SaquesPage — detalhes e recibo', () => {
  it('saque aprovado aparece como "PIX a caminho" e a soma vai pro card "Aprovado, a caminho"', async () => {
    vi.spyOn(saquesApi, 'buscarExtrato').mockResolvedValue(
      buildExtrato({
        resumo: {
          saldoDisponivel: 0,
          totalRecebido: 40,
          totalComissoes: 0,
          totalSacado: 0,
          aPagar: 40,
          emAnalise: 0,
        },
        movimentos: [buildSaque({ valor: -40, status: 'APROVADO' })],
      }),
    );

    render(<SaquesPage />);

    expect(await screen.findByText('Aprovado — PIX a caminho')).toBeInTheDocument();
    expect(screen.getByText('Aprovado, a caminho').nextSibling).toHaveTextContent(/40,00/);
  });

  it('saque pago mostra quando o PIX foi enviado', async () => {
    vi.spyOn(saquesApi, 'buscarExtrato').mockResolvedValue(
      buildExtrato({
        movimentos: [buildSaque({ status: 'PAGO', pagoEm: '2026-10-06T12:00:00.000Z' })],
      }),
    );

    render(<SaquesPage />);

    expect(
      await screen.findByText('PIX enviado', { selector: 'span.notch-sm' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/PIX enviado em/)).toBeInTheDocument();
  });

  it('clicar num recebimento abre o recibo com a conta e o protocolo; "Gerar recibo" imprime', async () => {
    const imprimir = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    vi.spyOn(saquesApi, 'buscarExtrato').mockResolvedValue(
      buildExtrato({
        movimentos: [
          {
            ...recebimento,
            periodo: { inicio: '2026-10-05T00:00:00.000Z', fim: '2026-10-07T00:00:00.000Z' },
          },
        ],
      }),
    );

    render(<SaquesPage />);
    await userEvent.click(await screen.findByText('Pago por Carla Locataria'));

    const dialogo = await screen.findByRole('dialog', { name: 'Recibo de aluguel recebido' });
    expect(dialogo).toHaveTextContent('05/10/2026 a 07/10/2026');
    expect(dialogo).toHaveTextContent('Protocolo: loc-1');

    await userEvent.click(screen.getByRole('button', { name: 'Gerar recibo' }));
    expect(imprimir).toHaveBeenCalled();
  });

  it('Esc fecha a janela de detalhes', async () => {
    vi.spyOn(saquesApi, 'buscarExtrato').mockResolvedValue(
      buildExtrato({ movimentos: [buildSaque()] }),
    );

    render(<SaquesPage />);
    await userEvent.click(await screen.findByRole('button', { name: /Ver detalhes e recibo/ }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('saque em análise abre os detalhes sem recibo', async () => {
    vi.spyOn(saquesApi, 'buscarExtrato').mockResolvedValue(
      buildExtrato({ movimentos: [buildSaque()] }),
    );

    render(<SaquesPage />);
    await userEvent.click(await screen.findByRole('button', { name: /Ver detalhes e recibo/ }));

    expect(screen.getByRole('button', { name: 'Imprimir detalhes' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Gerar recibo' })).not.toBeInTheDocument();
  });

  it('a lista de movimentações rola (altura máxima) em vez de esticar a página', async () => {
    vi.spyOn(saquesApi, 'buscarExtrato').mockResolvedValue(
      buildExtrato({ movimentos: [recebimento] }),
    );

    render(<SaquesPage />);

    const lista = (await screen.findByText('Pago por Carla Locataria')).closest('.overflow-y-auto');
    expect(lista).toHaveClass('max-h-[32rem]');
  });
});

describe('SaquesPage — síndico com comissões do condomínio', () => {
  const comissao: MovimentoExtratoDTO = {
    id: 'l-1',
    tipo: 'COMISSAO',
    data: '2026-10-03T12:00:00.000Z',
    descricao: 'Comissão do condomínio sobre o aluguel de "Furadeira"',
    contraparte: null,
    valor: 5,
    valorBruto: 100,
    taxa: 10,
    taxaPercentual: 10,
    divididoEntre: 2,
    origem: {
      locacaoId: 'loc-1',
      itemTitulo: 'Furadeira',
      dono: { id: 'd-1', nome: 'Davi Dono' },
      locatario: { id: 'c-1', nome: 'Carla Locataria' },
    },
    status: 'CONFIRMADO',
  };

  it('mostra a comissão como entrada, com a origem, a conta da taxa e a divisão entre síndicos', async () => {
    vi.spyOn(saquesApi, 'buscarExtrato').mockResolvedValue(
      buildExtrato({
        resumo: {
          saldoDisponivel: 5,
          totalRecebido: 0,
          totalComissoes: 5,
          totalSacado: 0,
          aPagar: 0,
          emAnalise: 0,
        },
        movimentos: [comissao],
      }),
    );

    render(<SaquesPage />);

    expect(
      await screen.findByText('Aluguel pago por Carla Locataria a Davi Dono'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Taxa de 10% sobre/)).toHaveTextContent('dividida entre 2 síndicos');
    expect(screen.getByText(/\+\s*R\$\s*5,00/)).toBeInTheDocument();
    expect(screen.getByText('Comissões do condomínio').nextSibling).toHaveTextContent(/5,00/);
  });

  it('o card "Comissões do condomínio" só aparece pra quem recebe comissão', async () => {
    vi.spyOn(saquesApi, 'buscarExtrato').mockResolvedValue(buildExtrato());

    render(<SaquesPage />);
    await screen.findByText('Nenhuma movimentação ainda');

    expect(screen.queryByText('Comissões do condomínio')).not.toBeInTheDocument();
  });

  it('clicar na comissão abre o recibo com tudo: item, dono, quem pagou, base, taxa e a parte do síndico', async () => {
    vi.spyOn(saquesApi, 'buscarExtrato').mockResolvedValue(
      buildExtrato({ movimentos: [comissao] }),
    );

    render(<SaquesPage />);
    await userEvent.click(await screen.findByText('Aluguel pago por Carla Locataria a Davi Dono'));

    const dialogo = await screen.findByRole('dialog', { name: 'Recibo de comissão do condomínio' });
    expect(dialogo).toHaveTextContent('Furadeira');
    expect(dialogo).toHaveTextContent('Davi Dono');
    expect(dialogo).toHaveTextContent('Carla Locataria');
    expect(dialogo).toHaveTextContent('2 síndicos');
    expect(screen.getByRole('button', { name: 'Gerar recibo' })).toBeInTheDocument();
  });

  it('o locatário vê no que pagou quanto foi pro dono e quanto foi taxa', async () => {
    vi.spyOn(saquesApi, 'buscarExtrato').mockResolvedValue(
      buildExtrato({
        pagamentos: [
          {
            id: 'p-1',
            data: '2026-10-02T12:00:00.000Z',
            descricao: 'Aluguel de "Escada"',
            contraparte: { id: 'u-3', nome: 'Davi Dono' },
            valor: 100,
            taxa: 10,
            repasseDono: 90,
            taxaPercentual: 10,
            periodo: { inicio: '2026-10-10T00:00:00.000Z', fim: '2026-10-11T00:00:00.000Z' },
            status: 'CONFIRMADO',
          },
        ],
      }),
    );

    render(<SaquesPage />);

    expect(await screen.findByText(/foi para Davi Dono e/)).toHaveTextContent(
      /90,00.*10,00.*\(10%\).*taxa do condomínio/,
    );
  });
});

describe('SaquesPage — pedir saque', () => {
  async function abrirAbaPedirSaque() {
    await screen.findByText('Nenhuma movimentação ainda');
    await userEvent.click(screen.getByRole('button', { name: 'Pedir saque' }));
  }

  it('solicita o saque, volta para o extrato e recarrega os dados', async () => {
    const buscar = vi
      .spyOn(saquesApi, 'buscarExtrato')
      .mockResolvedValueOnce(
        buildExtrato({
          resumo: {
            saldoDisponivel: 100,
            totalRecebido: 100,
            totalComissoes: 0,
            totalSacado: 0,
            aPagar: 0,
            emAnalise: 0,
          },
        }),
      )
      .mockResolvedValueOnce(buildExtrato({ movimentos: [buildSaque({ valor: -50 })] }));
    vi.spyOn(saquesApi, 'solicitarSaque').mockResolvedValue({
      id: 'saque-novo',
      userId: 'u-1',
      valor: 50,
      chavePixUsada: 'novo@pix.com',
      status: 'PENDENTE',
      motivoRejeicao: null,
      createdAt: '2026-10-05T12:00:00.000Z',
      processadoEm: null,
      pagoEm: null,
    });

    render(<SaquesPage />);
    await screen.findByText('Nenhuma movimentação ainda');
    await userEvent.click(screen.getByRole('button', { name: 'Pedir saque' }));

    await userEvent.type(screen.getByLabelText('Valor (R$)'), '50');
    await userEvent.type(screen.getByLabelText('Chave PIX'), 'novo@pix.com');
    await userEvent.click(screen.getByRole('button', { name: 'Solicitar' }));

    expect(saquesApi.solicitarSaque).toHaveBeenCalledWith({
      valor: 50,
      chavePixUsada: 'novo@pix.com',
    });
    expect(await screen.findByText(/\*\*\*\*1234/)).toBeInTheDocument();
    expect(buscar).toHaveBeenCalledTimes(2);
  });

  it('exibe erro quando a solicitação falha (ex: saldo insuficiente)', async () => {
    vi.spyOn(saquesApi, 'buscarExtrato').mockResolvedValue(buildExtrato());
    vi.spyOn(saquesApi, 'solicitarSaque').mockRejectedValue({
      isAxiosError: true,
      response: { data: { error: { message: 'Valor solicitado maior que o saldo disponível' } } },
    });

    render(<SaquesPage />);
    await abrirAbaPedirSaque();

    await userEvent.type(screen.getByLabelText('Valor (R$)'), '50');
    await userEvent.type(screen.getByLabelText('Chave PIX'), 'novo@pix.com');
    await userEvent.click(screen.getByRole('button', { name: 'Solicitar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Valor solicitado maior que o saldo disponível',
    );
  });
});
