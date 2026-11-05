import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AcompanharContratacaoPage } from '@/pages/AcompanharContratacaoPage';
import { ContratarPage } from '@/pages/ContratarPage';
import { DefinirSenhaPage } from '@/pages/DefinirSenhaPage';
import * as authApi from '@/features/auth/auth.api';
import { getStoredUser } from '@/lib/authStorage';
import * as api from './assinaturas.api';
import { CartaoAssinatura } from './CartaoAssinatura';
import { ConviteMoradores, textoDoConvite } from './ConviteMoradores';
import { planoIdeal, PlanosPrecos } from './PlanosPrecos';

const periodos: api.PeriodoDTO[] = [
  { codigo: 'MENSAL', nome: 'Mensal', meses: 1, dias: 30, desconto: 0 },
  { codigo: 'TRIMESTRAL', nome: 'Trimestral', meses: 3, dias: 90, desconto: 5 },
  { codigo: 'SEMESTRAL', nome: 'Semestral', meses: 6, dias: 180, desconto: 10 },
  { codigo: 'ANUAL', nome: 'Anual', meses: 12, dias: 365, desconto: 20 },
];

/** Mesma conta do backend (planos.ts): meses x mensalidade, menos o desconto, em reais inteiros. */
function precos(valorMensal: number): api.PrecoDoPeriodoDTO[] {
  return periodos.map((p) => {
    const cheio = valorMensal * p.meses;
    const valorTotal = Math.round((cheio * (100 - p.desconto)) / 100);
    return {
      periodoCodigo: p.codigo,
      valorTotal,
      valorMensalEquivalente: Math.round((valorTotal / p.meses) * 100) / 100,
      economia: cheio - valorTotal,
    };
  });
}

function plano(
  codigo: string,
  nome: string,
  limiteMoradores: number,
  valorMensal: number,
  destaque = false,
  teste = false,
): api.PlanoDTO {
  return {
    codigo,
    nome,
    limiteMoradores,
    valorMensal,
    descricao: `Plano ${nome}`,
    destaque,
    teste,
    precos: precos(valorMensal),
  };
}

const planos: api.PlanoDTO[] = [
  plano('ESSENCIAL', 'Essencial', 20, 149),
  plano('CONDOMINIO', 'Condomínio', 60, 299, true),
  plano('GRANDE', 'Grande', 150, 499),
  plano('PREMIUM', 'Premium', 300, 799),
];

const catalogo: api.PlanosDTO = { periodos, planos };

/** Resposta da API com o modo de teste ligado: o plano de R$ 5,00 vem junto, marcado como teste. */
const catalogoComTeste: api.PlanosDTO = {
  periodos,
  planos: [...planos, plano('TESTE', 'Teste', 3, 5, false, true)],
};

const contratacao = (extra: Partial<api.ContratacaoDTO> = {}): api.ContratacaoDTO => ({
  assinaturaId: 'assin-1',
  status: 'AGUARDANDO_PAGAMENTO',
  plano: { codigo: 'CONDOMINIO', nome: 'Condomínio', valorMensal: 299, limiteMoradores: 60 },
  periodo: { codigo: 'ANUAL', nome: 'Anual', meses: 12, desconto: 20 },
  valorCiclo: 2870,
  nomeCondominio: 'Residencial Aurora',
  invoiceUrl: 'https://asaas/pay_1',
  emailMascarado: 's***@exemplo.com',
  ...extra,
});

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('planoIdeal', () => {
  it('escolhe o menor plano que comporta as pessoas', () => {
    expect(planoIdeal(planos, 1)?.codigo).toBe('ESSENCIAL');
    expect(planoIdeal(planos, 20)?.codigo).toBe('ESSENCIAL');
    expect(planoIdeal(planos, 21)?.codigo).toBe('CONDOMINIO');
    expect(planoIdeal(planos, 300)?.codigo).toBe('PREMIUM');
    expect(planoIdeal(planos, 301)).toBeNull();
    expect(planoIdeal(planos, 0)).toBeNull();
    expect(planoIdeal(planos, Number.NaN)).toBeNull();
  });
});

describe('PlanosPrecos', () => {
  function renderSecao() {
    return render(
      <MemoryRouter>
        <PlanosPrecos />
      </MemoryRouter>,
    );
  }

  it('mostra os planos pelo preço mensal, com limite e link pra contratar cada um', async () => {
    vi.spyOn(api, 'listarPlanos').mockResolvedValue(catalogo);

    renderSecao();

    expect(await screen.findByRole('heading', { name: 'Essencial' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText('Até 150 moradores')).toBeInTheDocument();
    expect(screen.getByText('R$ 299,00')).toBeInTheDocument();
    expect(screen.getAllByText('Cobrado todo mês, sem desconto')).toHaveLength(4);
    expect(screen.getByRole('link', { name: 'Contratar o Grande' })).toHaveAttribute(
      'href',
      '/contratar?plano=GRANDE&periodo=MENSAL',
    );
    // sem número informado, o plano marcado como destaque é o "mais indicado"
    expect(screen.getByText('Mais indicado')).toBeInTheDocument();
  });

  it('oferece os períodos com o desconto e recalcula os preços ao trocar', async () => {
    vi.spyOn(api, 'listarPlanos').mockResolvedValue(catalogo);

    renderSecao();
    await screen.findByRole('heading', { name: 'Essencial' });

    const grupo = screen.getByRole('group', { name: 'Período de cobrança' });
    expect(within(grupo).getByRole('button', { name: /Mensal/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(grupo).getByRole('button', { name: /Trimestral/ })).toHaveTextContent('−5%');
    expect(within(grupo).getByRole('button', { name: /Semestral/ })).toHaveTextContent('−10%');
    expect(within(grupo).getByRole('button', { name: /Anual/ })).toHaveTextContent('−20%');

    await userEvent.click(within(grupo).getByRole('button', { name: /Anual/ }));

    // Essencial: 149 x 12 = 1788, menos 20% = 1430 (119,17 por mês), economia de 358
    expect(within(grupo).getByRole('button', { name: /Anual/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByText('R$ 119,17')).toBeInTheDocument();
    expect(screen.getByText(/R\$ 1.430,00 cobrados a cada 12 meses/)).toBeInTheDocument();
    expect(screen.getByText('Economia de R$ 358,00 (20%)')).toBeInTheDocument();
    // o preço cheio fica riscado pra comparar
    expect(screen.getAllByText('R$ 149,00 / mês')[0]).toHaveClass('line-through');
    expect(screen.getByRole('link', { name: 'Contratar o Essencial' })).toHaveAttribute(
      'href',
      '/contratar?plano=ESSENCIAL&periodo=ANUAL',
    );

    await userEvent.click(within(grupo).getByRole('button', { name: /Trimestral/ }));
    expect(screen.getByText(/R\$ 425,00 cobrados a cada 3 meses/)).toBeInTheDocument();
  });

  it('recomenda o plano ideal conforme a quantidade de pessoas', async () => {
    vi.spyOn(api, 'listarPlanos').mockResolvedValue(catalogo);

    renderSecao();
    await screen.findByRole('heading', { name: 'Essencial' });

    await userEvent.type(screen.getByLabelText(/Quantas pessoas/), '20');
    expect(screen.getByRole('status')).toHaveTextContent('Essencial');
    expect(screen.getByText('Ideal para você')).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText(/Quantas pessoas/));
    await userEvent.type(screen.getByLabelText(/Quantas pessoas/), '400');
    expect(screen.getByRole('status')).toHaveTextContent('Ainda não temos plano');
    expect(screen.queryByText('Ideal para você')).not.toBeInTheDocument();
  });

  it('esclarece que o limite conta contas cadastradas', async () => {
    vi.spyOn(api, 'listarPlanos').mockResolvedValue(catalogo);

    renderSecao();

    expect(await screen.findByText(/conta as contas cadastradas/)).toBeInTheDocument();
  });

  it('avisa quando não consegue carregar os planos', async () => {
    vi.spyOn(api, 'listarPlanos').mockRejectedValue(new Error('offline'));

    renderSecao();

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar');
  });
});

describe('plano de teste de R$ 5,00', () => {
  function renderSecao() {
    return render(
      <MemoryRouter>
        <PlanosPrecos />
      </MemoryRouter>,
    );
  }

  it('sem o modo de teste, o card não aparece', async () => {
    vi.spyOn(api, 'listarPlanos').mockResolvedValue(catalogo);

    renderSecao();
    await screen.findByRole('heading', { name: 'Essencial' });

    expect(screen.queryByTestId('plano-teste')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /plano de teste/ })).not.toBeInTheDocument();
  });

  it('com o modo de teste ligado, mostra o card separado, com R$ 5,00 e o link pra contratar', async () => {
    vi.spyOn(api, 'listarPlanos').mockResolvedValue(catalogoComTeste);

    renderSecao();
    await screen.findByRole('heading', { name: 'Essencial' });

    const card = within(screen.getByTestId('plano-teste'));
    expect(card.getByText('Plano de teste')).toBeInTheDocument();
    expect(card.getByText('R$ 5,00')).toBeInTheDocument();
    expect(card.getByText(/Até 3 moradores/)).toBeInTheDocument();
    expect(card.getByRole('link', { name: 'Contratar o plano de teste' })).toHaveAttribute(
      'href',
      '/contratar?plano=TESTE&periodo=MENSAL',
    );
    // os quatro planos de verdade continuam sendo quatro, sem o de teste na grade
    expect(screen.getAllByRole('link', { name: /^Contratar o (?!plano de teste)/ })).toHaveLength(
      4,
    );
  });

  it('o card acompanha o período escolhido nas abas', async () => {
    vi.spyOn(api, 'listarPlanos').mockResolvedValue(catalogoComTeste);

    renderSecao();
    await screen.findByRole('heading', { name: 'Essencial' });
    await userEvent.click(
      within(screen.getByRole('group', { name: 'Período de cobrança' })).getByRole('button', {
        name: /Trimestral/,
      }),
    );

    const card = within(screen.getByTestId('plano-teste'));
    // 5 x 3 = 15, menos 5% = 14,25 -> R$ 14,00 a cada 3 meses
    expect(card.getByText('R$ 14,00')).toBeInTheDocument();
    expect(card.getByText(/a cada 3 meses/)).toBeInTheDocument();
    expect(card.getByRole('link', { name: 'Contratar o plano de teste' })).toHaveAttribute(
      'href',
      '/contratar?plano=TESTE&periodo=TRIMESTRAL',
    );
  });

  it('nunca é o plano recomendado no calculador, mesmo cabendo 2 pessoas nele', async () => {
    vi.spyOn(api, 'listarPlanos').mockResolvedValue(catalogoComTeste);

    renderSecao();
    await screen.findByRole('heading', { name: 'Essencial' });
    await userEvent.type(screen.getByLabelText(/Quantas pessoas/), '2');

    expect(screen.getByRole('status')).toHaveTextContent('Essencial');
    expect(screen.getByRole('status')).not.toHaveTextContent('Teste');
    expect(planoIdeal(catalogoComTeste.planos, 2)?.codigo).toBe('ESSENCIAL');
  });

  it('na contratação o plano de teste vem marcado e pré-selecionado pela URL', async () => {
    vi.spyOn(api, 'listarPlanos').mockResolvedValue(catalogoComTeste);

    render(
      <MemoryRouter initialEntries={['/contratar?plano=TESTE&periodo=MENSAL']}>
        <Routes>
          <Route path="/contratar" element={<ContratarPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const radio = await screen.findByRole('radio', { name: /Teste/ });
    expect(radio).toBeChecked();
    expect(radio.closest('label')).toHaveTextContent('teste');
    expect(screen.getByText(/Plano Teste · até 3 moradores/)).toBeInTheDocument();
    expect(screen.getAllByText(/R\$\s5,00/).length).toBeGreaterThan(0);
  });
});

describe('ContratarPage', () => {
  function renderPage(entrada = '/contratar?plano=GRANDE&periodo=SEMESTRAL') {
    return render(
      <MemoryRouter initialEntries={[entrada]}>
        <Routes>
          <Route path="/contratar" element={<ContratarPage />} />
          <Route path="/contratacao/:id" element={<p>Tela de acompanhamento</p>} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('pré-seleciona plano e período da URL e mostra o resumo com valor e economia', async () => {
    vi.spyOn(api, 'listarPlanos').mockResolvedValue(catalogo);

    renderPage();

    expect(await screen.findByRole('radio', { name: /Grande/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Semestral/ })).toBeChecked();
    expect(screen.getByText(/Plano Grande · até 150 moradores/)).toBeInTheDocument();
    // Grande: 499 x 6 = 2994, menos 10% = 2694,60 -> R$ 2.695,00; economia R$ 299,00
    expect(screen.getAllByText(/R\$\s2.695,00/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Você economiza R\$\s299,00/)).toBeInTheDocument();
  });

  it('cai no mensal quando o período da URL não existe', async () => {
    vi.spyOn(api, 'listarPlanos').mockResolvedValue(catalogo);

    renderPage('/contratar?plano=GRANDE&periodo=QUINZENAL');

    expect(await screen.findByRole('radio', { name: /Mensal/ })).toBeChecked();
  });

  it('envia o cadastro com o período escolhido e segue pro acompanhamento', async () => {
    vi.spyOn(api, 'listarPlanos').mockResolvedValue(catalogo);
    const contratar = vi.spyOn(api, 'contratar').mockResolvedValue(contratacao());

    renderPage('/contratar');
    await screen.findByRole('radio', { name: /Condomínio/ });

    const botao = screen.getByRole('button', { name: 'Continuar para o pagamento' });
    expect(botao).toBeDisabled();

    await userEvent.click(screen.getByRole('radio', { name: /Anual/ }));
    await userEvent.type(screen.getByLabelText('Nome do condomínio'), 'Residencial Aurora');
    await userEvent.type(screen.getByLabelText('Seu nome (síndico)'), 'Sílvia Souza');
    await userEvent.type(screen.getByLabelText(/E-mail/), 'silvia@exemplo.com');
    await userEvent.type(screen.getByLabelText(/CPF do síndico ou CNPJ/), '529.982.247-25');
    await userEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('checkbox').closest('label')).toHaveTextContent(
      /R\$\s2.870,00 por PIX a cada 12 meses/,
    );
    await userEvent.click(botao);

    expect(contratar).toHaveBeenCalledWith({
      planoCodigo: 'CONDOMINIO',
      periodoCodigo: 'ANUAL',
      nomeCondominio: 'Residencial Aurora',
      nomeSindico: 'Sílvia Souza',
      email: 'silvia@exemplo.com',
      cpfCnpj: '529.982.247-25',
      aceiteTermos: true,
    });
    expect(await screen.findByText('Tela de acompanhamento')).toBeInTheDocument();
  });

  it('mostra o erro devolvido pela API (ex.: e-mail já cadastrado)', async () => {
    vi.spyOn(api, 'listarPlanos').mockResolvedValue(catalogo);
    vi.spyOn(api, 'contratar').mockRejectedValue({
      isAxiosError: true,
      response: { data: { error: { message: 'Já existe uma conta com este e-mail' } } },
    });

    renderPage('/contratar');
    await screen.findByRole('radio', { name: /Condomínio/ });
    await userEvent.type(screen.getByLabelText('Nome do condomínio'), 'Residencial Aurora');
    await userEvent.type(screen.getByLabelText('Seu nome (síndico)'), 'Sílvia Souza');
    await userEvent.type(screen.getByLabelText(/E-mail/), 'silvia@exemplo.com');
    await userEvent.type(screen.getByLabelText(/CPF do síndico ou CNPJ/), '52998224725');
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'Continuar para o pagamento' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Já existe uma conta');
  });
});

describe('AcompanharContratacaoPage', () => {
  function renderPage() {
    return render(
      <MemoryRouter initialEntries={['/contratacao/assin-1']}>
        <Routes>
          <Route path="/contratacao/:id" element={<AcompanharContratacaoPage />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('enquanto não paga, mostra o valor do período escolhido e o link do PIX', async () => {
    vi.spyOn(api, 'consultarContratacao').mockResolvedValue(contratacao());

    renderPage();

    expect(await screen.findByText('Falta só o pagamento')).toBeInTheDocument();
    expect(screen.getByText(/Primeiro pagamento · Anual/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s2.870,00/)).toBeInTheDocument();
    expect(screen.getByText('Já com 20% de desconto')).toBeInTheDocument();
    const pagar = screen.getByRole('link', { name: 'Pagar com PIX' });
    expect(pagar).toHaveAttribute('href', 'https://asaas/pay_1');
    expect(pagar).toHaveAttribute('target', '_blank');
    expect(pagar).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(screen.getByText(/Aguardando a confirmação do pagamento/)).toBeInTheDocument();
  });

  it('no mensal não fala em desconto', async () => {
    vi.spyOn(api, 'consultarContratacao').mockResolvedValue(
      contratacao({
        periodo: { codigo: 'MENSAL', nome: 'Mensal', meses: 1, desconto: 0 },
        valorCiclo: 299,
      }),
    );

    renderPage();

    expect(await screen.findByText(/Primeiro pagamento · Mensal/)).toBeInTheDocument();
    expect(screen.queryByText(/de desconto/)).not.toBeInTheDocument();
  });

  it('consulta de novo a cada poucos segundos e vira "confirmado" quando o PIX é pago', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const consultar = vi
      .spyOn(api, 'consultarContratacao')
      .mockResolvedValueOnce(contratacao())
      .mockResolvedValue(contratacao({ status: 'ATIVA', invoiceUrl: null }));

    renderPage();
    await screen.findByText('Falta só o pagamento');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5100);
    });

    expect(await screen.findByText('Pagamento confirmado!')).toBeInTheDocument();
    expect(screen.getByText(/s\*\*\*@exemplo\.com/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /entrar/ })).toHaveAttribute('href', '/login');

    // depois de confirmado, para de consultar
    const chamadas = consultar.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(11000);
    });
    expect(consultar.mock.calls.length).toBe(chamadas);
  });

  it('depois de confirmado, explica que o link não tem prazo e que o login é e-mail + senha criada', async () => {
    vi.spyOn(api, 'consultarContratacao').mockResolvedValue(
      contratacao({ status: 'ATIVA', invoiceUrl: null }),
    );

    renderPage();

    expect(await screen.findByText('Pagamento confirmado!')).toBeInTheDocument();
    expect(screen.getByText(/funciona até você criar a senha, sem prazo/)).toBeInTheDocument();
    expect(screen.queryByText(/48 horas/)).not.toBeInTheDocument();
    expect(
      screen.getByText(/você entra sempre pela página/, { exact: false }).closest('p'),
    ).toHaveTextContent(/e-mail e a senha que definiu/);
  });

  it('depois de confirmado, orienta a procurar o e-mail no spam e nas promoções', async () => {
    vi.spyOn(api, 'consultarContratacao').mockResolvedValue(
      contratacao({ status: 'ATIVA', invoiceUrl: null }),
    );

    renderPage();

    expect(await screen.findByText('Pagamento confirmado!')).toBeInTheDocument();
    const dica = screen.getByText(/Não chegou\?/).closest('p');
    expect(dica).toHaveTextContent(/spam/);
    expect(dica).toHaveTextContent(/promoções/);
    expect(dica).toHaveTextContent(/USAI/);
    expect(dica).toHaveTextContent(/não é spam/);
  });

  it('antes de pagar, a dica do spam ainda não aparece (o e-mail só sai depois do pagamento)', async () => {
    vi.spyOn(api, 'consultarContratacao').mockResolvedValue(contratacao());

    renderPage();

    await screen.findByText('Falta só o pagamento');
    expect(screen.queryByText(/Não chegou\?/)).not.toBeInTheDocument();
  });

  it('reenvia o e-mail de acesso e avisa o resultado', async () => {
    vi.spyOn(api, 'consultarContratacao').mockResolvedValue(
      contratacao({ status: 'ATIVA', invoiceUrl: null }),
    );
    const reenviar = vi.spyOn(api, 'reenviarAcesso').mockResolvedValue();

    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /reenviar/ }));

    expect(reenviar).toHaveBeenCalledWith('assin-1');
    expect(await screen.findByRole('status')).toHaveTextContent('Enviamos o e-mail de novo');
  });

  it('mostra erro quando a contratação não existe', async () => {
    vi.spyOn(api, 'consultarContratacao').mockRejectedValue({
      isAxiosError: true,
      response: { data: { error: { message: 'Contratação não encontrada' } } },
    });

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Contratação não encontrada');
  });
});

describe('DefinirSenhaPage', () => {
  function renderPage(entrada: string) {
    return render(
      <MemoryRouter initialEntries={[entrada]}>
        <Routes>
          <Route path="/definir-senha" element={<DefinirSenhaPage />} />
          <Route path="/sindico" element={<p>Painel do síndico</p>} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('cria a senha com o token do link, guarda a sessão e abre o painel do síndico', async () => {
    const definir = vi.spyOn(authApi, 'definirSenha').mockResolvedValue({
      accessToken: 'acesso',
      refreshToken: 'refresh',
      user: {
        id: 's1',
        nome: 'Sílvia',
        email: 'silvia@exemplo.com',
        papel: 'SINDICO',
        condominioId: 'cond-1',
        apartamento: null,
      },
    });

    renderPage('/definir-senha?token=abc123token');
    await userEvent.type(screen.getByLabelText('Nova senha'), 'minha-senha-nova');
    await userEvent.type(screen.getByLabelText('Repita a senha'), 'minha-senha-nova');
    await userEvent.click(screen.getByRole('button', { name: 'Criar senha e entrar' }));

    expect(definir).toHaveBeenCalledWith('abc123token', 'minha-senha-nova');
    expect(await screen.findByText('Painel do síndico')).toBeInTheDocument();
    expect(getStoredUser()?.papel).toBe('SINDICO');
  });

  it('não envia quando as senhas não conferem', async () => {
    const definir = vi.spyOn(authApi, 'definirSenha');

    renderPage('/definir-senha?token=abc123token');
    await userEvent.type(screen.getByLabelText('Nova senha'), 'minha-senha-nova');
    await userEvent.type(screen.getByLabelText('Repita a senha'), 'outra-senha-xyz');
    await userEvent.click(screen.getByRole('button', { name: 'Criar senha e entrar' }));

    expect(screen.getByRole('alert')).toHaveTextContent('As senhas não conferem');
    expect(definir).not.toHaveBeenCalled();
  });

  it('mostra o erro quando o link expirou', async () => {
    vi.spyOn(authApi, 'definirSenha').mockRejectedValue({
      isAxiosError: true,
      response: { data: { error: { message: 'Este link expirou ou já foi usado.' } } },
    });

    renderPage('/definir-senha?token=abc123token');
    await userEvent.type(screen.getByLabelText('Nova senha'), 'minha-senha-nova');
    await userEvent.type(screen.getByLabelText('Repita a senha'), 'minha-senha-nova');
    await userEvent.click(screen.getByRole('button', { name: 'Criar senha e entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('expirou');
  });

  it('explica o login (e-mail e a senha criada, pela página Entrar) e oferece o link de entrar', () => {
    renderPage('/definir-senha?token=abc123token');

    expect(screen.getByText(/entra sempre pela página/, { exact: false })).toHaveTextContent(
      /e-mail e a senha que definiu/,
    );
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login');
  });

  it('se a senha já foi criada, mostra a mensagem do servidor (entrar com e-mail e senha) e o link de entrar', async () => {
    vi.spyOn(authApi, 'definirSenha').mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          error: {
            code: 'SENHA_JA_CRIADA',
            message:
              'A sua senha já foi criada. Entre pela página "Entrar", com o seu e-mail e a senha que você definiu.',
          },
        },
      },
    });

    renderPage('/definir-senha?token=abc123token');
    await userEvent.type(screen.getByLabelText('Nova senha'), 'minha-senha-nova');
    await userEvent.type(screen.getByLabelText('Repita a senha'), 'minha-senha-nova');
    await userEvent.click(screen.getByRole('button', { name: 'Criar senha e entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/senha já foi criada/);
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login');
  });

  it('sem token na URL, explica e leva ao login', () => {
    renderPage('/definir-senha');

    expect(screen.getByText('Link inválido')).toBeInTheDocument();
    expect(screen.queryByLabelText('Nova senha')).not.toBeInTheDocument();
  });
});

describe('ConviteMoradores', () => {
  it('monta o link completo e a mensagem com o link e o PIN', () => {
    const texto = textoDoConvite('Residencial Aurora', 'residencial-aurora-ab12', '482913');

    expect(texto).toContain('Residencial Aurora');
    expect(texto).toContain(
      `${window.location.origin}/cadastro?condominio=residencial-aurora-ab12`,
    );
    expect(texto).toContain('PIN do condomínio: 482913');
  });

  it('copia o link, o PIN e a mensagem de convite', async () => {
    const escrever = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: escrever },
      configurable: true,
    });

    render(
      <ConviteMoradores nomeCondominio="Residencial Aurora" linkSlug="aurora-ab12" pin="482913" />,
    );

    expect(screen.getByText('482913')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Copiar PIN' }));
    expect(escrever).toHaveBeenLastCalledWith('482913');
    expect(await screen.findByText('PIN copiado!')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Copiar link' }));
    expect(escrever).toHaveBeenLastCalledWith(
      `${window.location.origin}/cadastro?condominio=aurora-ab12`,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Copiar mensagem de convite' }));
    expect(escrever.mock.calls.at(-1)?.[0]).toContain('482913');
  });

  it('avisa quando o navegador não deixa copiar', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('negado')) },
      configurable: true,
    });

    render(
      <ConviteMoradores nomeCondominio="Residencial Aurora" linkSlug="aurora-ab12" pin="482913" />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Copiar PIN' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível copiar');
  });
});

describe('CartaoAssinatura', () => {
  const opcoes = (valorMensal: number): api.OpcaoRenovacaoDTO[] =>
    periodos.map((p, i) => ({
      ...precos(valorMensal)[i],
      nome: p.nome,
      meses: p.meses,
      desconto: p.desconto,
    }));

  const painel = (extra: Partial<api.PainelAssinaturaDTO> = {}): api.PainelAssinaturaDTO => ({
    planoCodigo: 'ESSENCIAL',
    planoNome: 'Essencial',
    valorMensal: 149,
    periodoCodigo: 'TRIMESTRAL',
    periodoNome: 'Trimestral',
    valorCiclo: 425,
    opcoesRenovacao: opcoes(149),
    limiteMoradores: 20,
    moradoresAtivos: 12,
    status: 'ATIVA',
    ativaAte: new Date(Date.now() + 20 * 86_400_000).toISOString(),
    diasRestantes: 20,
    cobrancaPendente: null,
    ...extra,
  });

  it('mostra o plano, o período e o valor, o uso em moradores e que não há o que pagar ainda', () => {
    render(<CartaoAssinatura painel={painel()} />);

    expect(screen.getByText('Plano Essencial')).toBeInTheDocument();
    expect(screen.getByText(/Trimestral · R\$\s425,00 a cada 3 meses/)).toBeInTheDocument();
    expect(screen.getByText('12 de 20')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Uso do plano' })).toHaveAttribute(
      'aria-valuenow',
      '12',
    );
    expect(screen.getByText('Ativa')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /PIX/ })).not.toBeInTheDocument();
  });

  it('no mensal, diz "por mês"', () => {
    render(
      <CartaoAssinatura
        painel={painel({ periodoCodigo: 'MENSAL', periodoNome: 'Mensal', valorCiclo: 149 })}
      />,
    );

    expect(screen.getByText(/Mensal · R\$\s149,00 por mês/)).toBeInTheDocument();
  });

  it('avisa quando o plano está cheio', () => {
    render(<CartaoAssinatura painel={painel({ moradoresAtivos: 20 })} />);

    expect(screen.getByText(/plano está cheio/)).toBeInTheDocument();
  });

  it('perto do vencimento oferece renovar pelo período atual e abre o PIX numa aba nova', async () => {
    const abrir = vi.spyOn(window, 'open').mockReturnValue(null);
    const gerar = vi
      .spyOn(api, 'gerarCobrancaRenovacao')
      .mockResolvedValue({ invoiceUrl: 'https://asaas/pay_2' });

    render(<CartaoAssinatura painel={painel({ diasRestantes: 3 })} />);

    expect(screen.getByRole('status')).toHaveTextContent('vence em 3 dias');
    expect(screen.getByLabelText('Renovar por')).toHaveValue('TRIMESTRAL');
    await userEvent.click(screen.getByRole('button', { name: 'Gerar PIX da renovação' }));

    await waitFor(() => expect(gerar).toHaveBeenCalledWith('TRIMESTRAL'));
    expect(abrir).toHaveBeenCalledWith('https://asaas/pay_2', '_blank', 'noopener,noreferrer');
    // depois de gerado, o botão passa a só pagar a que já existe
    expect(
      await screen.findByRole('button', { name: 'Pagar renovação (PIX)' }),
    ).toBeInTheDocument();
  });

  it('deixa trocar de período ao renovar, mostrando preço e economia de cada um', async () => {
    const abrir = vi.spyOn(window, 'open').mockReturnValue(null);
    const gerar = vi
      .spyOn(api, 'gerarCobrancaRenovacao')
      .mockResolvedValue({ invoiceUrl: 'https://asaas/anual' });

    render(<CartaoAssinatura painel={painel({ diasRestantes: 3 })} />);

    const select = screen.getByLabelText('Renovar por');
    expect(within(select).getByRole('option', { name: /Mensal: R\$\s149,00/ })).toBeInTheDocument();
    expect(
      within(select).getByRole('option', { name: /Anual: R\$\s1.430,00 \(−20%\)/ }),
    ).toBeInTheDocument();

    await userEvent.selectOptions(select, 'ANUAL');
    expect(screen.getByText('Economia de R$ 358,00 em relação ao mensal.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Gerar PIX da renovação' }));

    await waitFor(() => expect(gerar).toHaveBeenCalledWith('ANUAL'));
    expect(abrir).toHaveBeenCalledWith('https://asaas/anual', '_blank', 'noopener,noreferrer');
  });

  it('suspensa: alerta e usa a cobrança que já está em aberto, sem gerar outra', async () => {
    const abrir = vi.spyOn(window, 'open').mockReturnValue(null);
    const gerar = vi.spyOn(api, 'gerarCobrancaRenovacao');

    render(
      <CartaoAssinatura
        painel={painel({
          status: 'SUSPENSA',
          diasRestantes: -9,
          cobrancaPendente: {
            invoiceUrl: 'https://asaas/aberta',
            valor: 425,
            referencia: '2026-11',
            periodoCodigo: 'TRIMESTRAL',
          },
        })}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('suspenso');
    await userEvent.click(screen.getByRole('button', { name: 'Pagar renovação (PIX)' }));

    expect(gerar).not.toHaveBeenCalled();
    expect(abrir).toHaveBeenCalledWith('https://asaas/aberta', '_blank', 'noopener,noreferrer');
  });

  it('se troca de período com um PIX já aberto, gera um novo em vez de reaproveitar o antigo', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    const gerar = vi
      .spyOn(api, 'gerarCobrancaRenovacao')
      .mockResolvedValue({ invoiceUrl: 'https://asaas/nova' });

    render(
      <CartaoAssinatura
        painel={painel({
          diasRestantes: 2,
          cobrancaPendente: {
            invoiceUrl: 'https://asaas/antiga',
            valor: 425,
            referencia: '2026-11',
            periodoCodigo: 'TRIMESTRAL',
          },
        })}
      />,
    );

    expect(screen.getByRole('button', { name: 'Pagar renovação (PIX)' })).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Renovar por'), 'SEMESTRAL');
    expect(screen.getByRole('button', { name: 'Gerar PIX da renovação' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Gerar PIX da renovação' }));

    await waitFor(() => expect(gerar).toHaveBeenCalledWith('SEMESTRAL'));
  });
});
