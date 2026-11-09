import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AbaPlataforma, lerValorEmReais } from './AbaPlataforma';
import * as api from './plataforma.api';
import { mesAtualBr, deslocarMes } from './plataforma.logica';
import { AssinaturasAdminDTO, VendasDoMesDTO } from './plataforma.types';

const MES = mesAtualBr();

function vendas(extra: Partial<VendasDoMesDTO> = {}): VendasDoMesDTO {
  return {
    mes: MES,
    resumo: {
      entrou: 448,
      taxasAsaas: 3.98,
      despesas: 60,
      resultado: 384.02,
      pagamentos: 2,
      taxasNaoInformadas: 0,
    },
    recebimentos: [
      {
        id: 'r-1',
        numeroRecibo: 'USAI-ABCD1234',
        pagoEm: '2026-11-10T15:00:00.000Z',
        condominio: { id: 'c-1', nome: 'Residencial Aurora' },
        sindico: { nome: 'Sílvia Souza', email: 'silvia@exemplo.com', documento: '***.982.247-**' },
        plano: 'Condomínio',
        periodo: 'Mensal',
        valor: 299,
        taxaAsaas: 1.99,
        liquido: 297.01,
        dias: 30,
        vigenciaInicio: '2026-11-10T15:00:00.000Z',
        vigenciaFim: '2026-12-10T15:00:00.000Z',
        comprovanteUrl: null,
      },
    ],
    despesas: [
      {
        id: 'd-1',
        data: '2026-11-05T15:00:00.000Z',
        valor: 60,
        descricao: 'Servidor da DigitalOcean',
        categoria: 'SERVIDOR',
      },
    ],
    ...extra,
  };
}

function assinaturas(): AssinaturasAdminDTO {
  const base = {
    sindico: { nome: 'Síndico', email: 's@exemplo.com' },
    plano: 'Condomínio',
    periodo: 'Mensal',
    valorCiclo: 299,
  };
  return {
    resumo: { total: 3, ativas: 2, aguardandoPagamento: 1, suspensas: 0, vencidas: 0 },
    itens: [
      {
        ...base,
        id: 'a-1',
        condominio: { id: 'c-1', nome: 'Residencial Aurora' },
        status: 'ATIVA',
        ativaAte: '2026-11-13T15:00:00.000Z',
        diasRestantes: 3,
      },
      {
        ...base,
        id: 'a-2',
        condominio: { id: 'c-2', nome: 'Edifício Monte Verde' },
        status: 'ATIVA',
        ativaAte: '2027-01-10T15:00:00.000Z',
        diasRestantes: 60,
      },
      {
        ...base,
        id: 'a-3',
        condominio: { id: 'c-3', nome: 'Condomínio Novo' },
        status: 'AGUARDANDO_PAGAMENTO',
        ativaAte: null,
        diasRestantes: null,
      },
    ],
  };
}

function montar(vend = vendas(), assin = assinaturas()) {
  const buscar = vi.spyOn(api, 'buscarVendasDoMes').mockResolvedValue(vend);
  vi.spyOn(api, 'listarAssinaturasAdmin').mockResolvedValue(assin);
  render(<AbaPlataforma />);
  return { buscar };
}

beforeEach(() => vi.restoreAllMocks());
afterEach(() => vi.restoreAllMocks());

describe('lerValorEmReais', () => {
  it.each([
    ['60', 60],
    ['59,90', 59.9],
    ['59.9', 59.9],
    [' 1,5 ', 1.5],
  ])('aceita "%s"', (texto, esperado) => {
    expect(lerValorEmReais(texto)).toEqual({ valor: esperado });
  });

  it.each([[''], ['abc'], ['-5'], ['1,234'], ['0'], ['0,00'], ['R$ 10']])(
    'recusa "%s"',
    (texto) => {
      expect(lerValorEmReais(texto)).toHaveProperty('erro');
    },
  );
});

describe('AbaPlataforma: resumo do mês', () => {
  it('mostra o que entrou, as taxas do Asaas, as despesas e o resultado', async () => {
    montar();

    expect(await screen.findByText('Entrou')).toBeInTheDocument();
    const cartaoEntrou = screen.getByText('Entrou').parentElement as HTMLElement;
    expect(cartaoEntrou).toHaveTextContent(/448,00/);
    expect(cartaoEntrou).toHaveTextContent('2 pagamentos');
    expect(screen.getByText('Taxas do Asaas').parentElement).toHaveTextContent(/3,98/);
    expect(screen.getByText('Despesas').parentElement).toHaveTextContent(/60,00/);
    expect(screen.getByText('Resultado do mês').parentElement).toHaveTextContent(/384,02/);
  });

  it('avisa quando há mensalidades sem a taxa do Asaas gravada', async () => {
    montar(
      vendas({
        resumo: {
          entrou: 299,
          taxasAsaas: 0,
          despesas: 0,
          resultado: 299,
          pagamentos: 1,
          taxasNaoInformadas: 1,
        },
      }),
    );

    expect(await screen.findByText(/1 mensalidade do mês sem a taxa do Asaas/)).toBeInTheDocument();
  });

  it('navega entre os meses: o anterior consulta o mês de trás e o seguinte fica desligado no mês atual', async () => {
    const { buscar } = montar();
    await screen.findByText('Entrou');

    expect(screen.getByRole('button', { name: 'Próximo mês' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Mês anterior' }));

    expect(buscar).toHaveBeenLastCalledWith(deslocarMes(MES, -1));
    expect(screen.getByRole('button', { name: 'Próximo mês' })).toBeEnabled();

    await userEvent.click(screen.getByRole('button', { name: 'Próximo mês' }));
    expect(buscar).toHaveBeenLastCalledWith(MES);
  });
});

describe('AbaPlataforma: assinaturas', () => {
  it('lista as assinaturas com a situação e a data de vencimento', async () => {
    montar();

    const lista = await screen.findByRole('region', { name: 'Lista de assinaturas' });
    expect(within(lista).getByText('Residencial Aurora')).toBeInTheDocument();
    expect(within(lista).getByText('Vence em 3 dias')).toBeInTheDocument();
    expect(within(lista).getByText('Vence em 60 dias')).toBeInTheDocument();
    expect(within(lista).getByText('Aguardando o 1º pagamento')).toBeInTheDocument();
  });

  it('os filtros mostram a contagem e escondem o que não combina', async () => {
    montar();
    await screen.findByRole('region', { name: 'Lista de assinaturas' });

    await userEvent.click(screen.getByRole('button', { name: /Vencem em 7 dias/ }));

    const lista = screen.getByRole('region', { name: 'Lista de assinaturas' });
    expect(within(lista).getByText('Residencial Aurora')).toBeInTheDocument();
    expect(within(lista).queryByText('Edifício Monte Verde')).not.toBeInTheDocument();
    expect(within(lista).queryByText('Condomínio Novo')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Aguardando pagamento/ }));
    expect(
      within(screen.getByRole('region', { name: 'Lista de assinaturas' })).getByText(
        'Condomínio Novo',
      ),
    ).toBeInTheDocument();
  });

  it('a busca acha o condomínio sem diferenciar acento nem maiúscula', async () => {
    montar();
    await screen.findByRole('region', { name: 'Lista de assinaturas' });

    await userEvent.type(screen.getByLabelText('Buscar assinaturas'), 'EDIFICIO');

    const lista = screen.getByRole('region', { name: 'Lista de assinaturas' });
    expect(within(lista).getByText('Edifício Monte Verde')).toBeInTheDocument();
    expect(within(lista).queryByText('Residencial Aurora')).not.toBeInTheDocument();
  });

  it('filtro sem resultado mostra o aviso', async () => {
    montar();
    await screen.findByRole('region', { name: 'Lista de assinaturas' });

    await userEvent.click(screen.getByRole('button', { name: /Vencidas/ }));

    expect(screen.getByText('Nenhuma assinatura neste filtro')).toBeInTheDocument();
  });

  it('sem assinaturas, explica quando elas aparecem', async () => {
    montar(vendas(), {
      resumo: { total: 0, ativas: 0, aguardandoPagamento: 0, suspensas: 0, vencidas: 0 },
      itens: [],
    });

    expect(await screen.findByText('Nenhuma assinatura ainda')).toBeInTheDocument();
  });
});

describe('AbaPlataforma: pagamentos recebidos e recibo', () => {
  it('mostra quem pagou, o valor e o número do recibo', async () => {
    montar();

    const lista = await screen.findByRole('region', { name: 'Pagamentos recebidos' });
    expect(within(lista).getByText('Residencial Aurora')).toBeInTheDocument();
    expect(within(lista).getByText(/Pago por Sílvia Souza/)).toBeInTheDocument();
    expect(within(lista).getByText(/\+\s*R\$\s*299,00/)).toBeInTheDocument();
    expect(within(lista).getByText(/Recibo USAI-ABCD1234/)).toBeInTheDocument();
  });

  it('clicar abre o recibo com os dados do pagamento', async () => {
    montar();
    const lista = await screen.findByRole('region', { name: 'Pagamentos recebidos' });

    await userEvent.click(within(lista).getByRole('button', { name: /Ver detalhes/ }));

    const recibo = screen.getByRole('dialog', { name: 'Recibo de assinatura da plataforma' });
    expect(recibo).toHaveTextContent('USAI-ABCD1234');
    expect(recibo).toHaveTextContent('Sílvia Souza');
    expect(recibo).toHaveTextContent(/297,01/);
    expect(within(recibo).getByRole('button', { name: /recibo|imprimir/i })).toBeInTheDocument();
  });

  it('mês sem pagamentos mostra o aviso', async () => {
    montar(
      vendas({
        recebimentos: [],
        resumo: {
          entrou: 0,
          taxasAsaas: 0,
          despesas: 0,
          resultado: 0,
          pagamentos: 0,
          taxasNaoInformadas: 0,
        },
      }),
    );

    expect(await screen.findByText('Nenhum pagamento neste mês')).toBeInTheDocument();
  });
});

describe('AbaPlataforma: despesas', () => {
  it('lança uma despesa (aceita vírgula) e recarrega o mês', async () => {
    const { buscar } = montar();
    const criar = vi.spyOn(api, 'criarDespesa').mockResolvedValue({
      id: 'd-2',
      data: '2026-11-09T15:00:00.000Z',
      valor: 59.9,
      descricao: 'Domínio usainet.com.br',
      categoria: 'DOMINIO',
    });
    await screen.findByText('Servidor da DigitalOcean');
    const chamadasAntes = buscar.mock.calls.length;

    await userEvent.type(screen.getByLabelText('Valor (R$)'), '59,90');
    await userEvent.selectOptions(screen.getByLabelText('Categoria'), 'DOMINIO');
    await userEvent.type(screen.getByLabelText('Descrição'), 'Domínio usainet.com.br');
    await userEvent.click(screen.getByRole('button', { name: 'Lançar despesa' }));

    expect(criar).toHaveBeenCalledWith({
      data: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      valor: 59.9,
      descricao: 'Domínio usainet.com.br',
      categoria: 'DOMINIO',
    });
    expect(buscar.mock.calls.length).toBeGreaterThan(chamadasAntes);
    expect(screen.getByLabelText('Valor (R$)')).toHaveValue('');
    expect(screen.getByLabelText('Descrição')).toHaveValue('');
  });

  it('valor inválido ou descrição curta mostram o erro e não chamam o servidor', async () => {
    montar();
    const criar = vi.spyOn(api, 'criarDespesa');
    await screen.findByText('Servidor da DigitalOcean');

    await userEvent.type(screen.getByLabelText('Valor (R$)'), 'abc');
    await userEvent.type(screen.getByLabelText('Descrição'), 'Servidor');
    await userEvent.click(screen.getByRole('button', { name: 'Lançar despesa' }));
    expect(screen.getByText(/Digite o valor em reais/)).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText('Valor (R$)'));
    await userEvent.type(screen.getByLabelText('Valor (R$)'), '10');
    await userEvent.clear(screen.getByLabelText('Descrição'));
    await userEvent.type(screen.getByLabelText('Descrição'), 'ab');
    await userEvent.click(screen.getByRole('button', { name: 'Lançar despesa' }));
    expect(screen.getByText(/descrição de pelo menos 3 letras/)).toBeInTheDocument();

    expect(criar).not.toHaveBeenCalled();
  });

  it('se o servidor recusar a despesa, mostra o erro', async () => {
    montar();
    vi.spyOn(api, 'criarDespesa').mockRejectedValue(new Error('rede caiu'));
    await screen.findByText('Servidor da DigitalOcean');

    await userEvent.type(screen.getByLabelText('Valor (R$)'), '10');
    await userEvent.type(screen.getByLabelText('Descrição'), 'Servidor novo');
    await userEvent.click(screen.getByRole('button', { name: 'Lançar despesa' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('remover pede confirmação, e só depois apaga e recarrega', async () => {
    const { buscar } = montar();
    const remover = vi.spyOn(api, 'removerDespesa').mockResolvedValue(undefined);
    await screen.findByText('Servidor da DigitalOcean');
    const chamadasAntes = buscar.mock.calls.length;

    await userEvent.click(
      screen.getByRole('button', { name: 'Remover a despesa Servidor da DigitalOcean' }),
    );
    expect(remover).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Remover despesa' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Sim, remover' }));

    expect(remover).toHaveBeenCalledWith('d-1');
    expect(buscar.mock.calls.length).toBeGreaterThan(chamadasAntes);
  });

  it('cancelar a confirmação mantém a despesa', async () => {
    montar();
    const remover = vi.spyOn(api, 'removerDespesa');
    await screen.findByText('Servidor da DigitalOcean');

    await userEvent.click(
      screen.getByRole('button', { name: 'Remover a despesa Servidor da DigitalOcean' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(remover).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('mês sem despesas diz isso', async () => {
    montar(vendas({ despesas: [] }));

    expect(await screen.findByText(/Nenhuma despesa lançada em/)).toBeInTheDocument();
  });
});

describe('AbaPlataforma: erros', () => {
  it('se o servidor falhar ao carregar, mostra o erro', async () => {
    vi.spyOn(api, 'buscarVendasDoMes').mockRejectedValue(new Error('rede caiu'));
    vi.spyOn(api, 'listarAssinaturasAdmin').mockResolvedValue(assinaturas());
    render(<AbaPlataforma />);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
