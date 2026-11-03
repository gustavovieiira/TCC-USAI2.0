import { act, render, screen, waitFor } from '@testing-library/react';
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

const planos: api.PlanoDTO[] = [
  {
    codigo: 'ESSENCIAL',
    nome: 'Essencial',
    limiteMoradores: 30,
    valorMensal: 49,
    descricao: 'Pequenos',
    destaque: false,
  },
  {
    codigo: 'CONDOMINIO',
    nome: 'Condomínio',
    limiteMoradores: 100,
    valorMensal: 99,
    descricao: 'A maioria',
    destaque: true,
  },
  {
    codigo: 'GRANDE',
    nome: 'Grande',
    limiteMoradores: 250,
    valorMensal: 179,
    descricao: 'Grandes',
    destaque: false,
  },
];

const contratacao = (extra: Partial<api.ContratacaoDTO> = {}): api.ContratacaoDTO => ({
  assinaturaId: 'assin-1',
  status: 'AGUARDANDO_PAGAMENTO',
  plano: { codigo: 'CONDOMINIO', nome: 'Condomínio', valorMensal: 99, limiteMoradores: 100 },
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
  it('escolhe o menor plano que comporta os moradores', () => {
    expect(planoIdeal(planos, 1)?.codigo).toBe('ESSENCIAL');
    expect(planoIdeal(planos, 30)?.codigo).toBe('ESSENCIAL');
    expect(planoIdeal(planos, 31)?.codigo).toBe('CONDOMINIO');
    expect(planoIdeal(planos, 250)?.codigo).toBe('GRANDE');
    expect(planoIdeal(planos, 251)).toBeNull();
    expect(planoIdeal(planos, 0)).toBeNull();
    expect(planoIdeal(planos, Number.NaN)).toBeNull();
  });
});

describe('PlanosPrecos', () => {
  it('mostra os planos com preço, limite e o link pra contratar cada um', async () => {
    vi.spyOn(api, 'listarPlanos').mockResolvedValue(planos);

    render(
      <MemoryRouter>
        <PlanosPrecos />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Essencial' })).toBeInTheDocument();
    expect(screen.getByText('Até 100 moradores')).toBeInTheDocument();
    expect(screen.getByText('R$ 99,00')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Contratar o Grande' })).toHaveAttribute(
      'href',
      '/contratar?plano=GRANDE',
    );
    // sem número informado, o plano marcado como destaque é o "mais indicado"
    expect(screen.getByText('Mais indicado')).toBeInTheDocument();
  });

  it('recomenda o plano ideal conforme a quantidade de moradores', async () => {
    vi.spyOn(api, 'listarPlanos').mockResolvedValue(planos);

    render(
      <MemoryRouter>
        <PlanosPrecos />
      </MemoryRouter>,
    );
    await screen.findByRole('heading', { name: 'Essencial' });

    await userEvent.type(screen.getByLabelText(/Quantos moradores/), '20');
    expect(screen.getByRole('status')).toHaveTextContent('Essencial');
    expect(screen.getByText('Ideal para você')).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText(/Quantos moradores/));
    await userEvent.type(screen.getByLabelText(/Quantos moradores/), '400');
    expect(screen.getByRole('status')).toHaveTextContent('Ainda não temos plano');
    expect(screen.queryByText('Ideal para você')).not.toBeInTheDocument();
  });

  it('avisa quando não consegue carregar os planos', async () => {
    vi.spyOn(api, 'listarPlanos').mockRejectedValue(new Error('offline'));

    render(
      <MemoryRouter>
        <PlanosPrecos />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar');
  });
});

describe('ContratarPage', () => {
  function renderPage(entrada = '/contratar?plano=GRANDE') {
    return render(
      <MemoryRouter initialEntries={[entrada]}>
        <Routes>
          <Route path="/contratar" element={<ContratarPage />} />
          <Route path="/contratacao/:id" element={<p>Tela de acompanhamento</p>} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('pré-seleciona o plano da URL e mostra o resumo com o valor', async () => {
    vi.spyOn(api, 'listarPlanos').mockResolvedValue(planos);

    renderPage();

    expect(await screen.findByRole('radio', { name: /Grande/ })).toBeChecked();
    expect(screen.getByText(/Plano Grande · até 250 moradores/)).toBeInTheDocument();
  });

  it('envia o cadastro e segue pro acompanhamento do pagamento', async () => {
    vi.spyOn(api, 'listarPlanos').mockResolvedValue(planos);
    const contratar = vi.spyOn(api, 'contratar').mockResolvedValue(contratacao());

    renderPage('/contratar');
    await screen.findByRole('radio', { name: /Condomínio/ });

    const botao = screen.getByRole('button', { name: 'Continuar para o pagamento' });
    expect(botao).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Nome do condomínio'), 'Residencial Aurora');
    await userEvent.type(screen.getByLabelText('Seu nome (síndico)'), 'Sílvia Souza');
    await userEvent.type(screen.getByLabelText(/E-mail/), 'silvia@exemplo.com');
    await userEvent.type(screen.getByLabelText(/CPF do síndico ou CNPJ/), '529.982.247-25');
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(botao);

    expect(contratar).toHaveBeenCalledWith({
      planoCodigo: 'CONDOMINIO',
      nomeCondominio: 'Residencial Aurora',
      nomeSindico: 'Sílvia Souza',
      email: 'silvia@exemplo.com',
      cpfCnpj: '529.982.247-25',
      aceiteTermos: true,
    });
    expect(await screen.findByText('Tela de acompanhamento')).toBeInTheDocument();
  });

  it('mostra o erro devolvido pela API (ex.: e-mail já cadastrado)', async () => {
    vi.spyOn(api, 'listarPlanos').mockResolvedValue(planos);
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

  it('enquanto não paga, mostra o valor e o link do PIX', async () => {
    vi.spyOn(api, 'consultarContratacao').mockResolvedValue(contratacao());

    renderPage();

    expect(await screen.findByText('Falta só o pagamento')).toBeInTheDocument();
    expect(screen.getByText('R$ 99,00')).toBeInTheDocument();
    const pagar = screen.getByRole('link', { name: 'Pagar com PIX' });
    expect(pagar).toHaveAttribute('href', 'https://asaas/pay_1');
    expect(pagar).toHaveAttribute('target', '_blank');
    expect(pagar).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(screen.getByText(/Aguardando a confirmação do pagamento/)).toBeInTheDocument();
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
  const painel = (extra: Partial<api.PainelAssinaturaDTO> = {}): api.PainelAssinaturaDTO => ({
    planoCodigo: 'ESSENCIAL',
    planoNome: 'Essencial',
    valorMensal: 49,
    limiteMoradores: 30,
    moradoresAtivos: 12,
    status: 'ATIVA',
    ativaAte: new Date(Date.now() + 20 * 86_400_000).toISOString(),
    diasRestantes: 20,
    cobrancaPendente: null,
    ...extra,
  });

  it('mostra o plano, o uso em moradores e que não há o que pagar ainda', () => {
    render(<CartaoAssinatura painel={painel()} />);

    expect(screen.getByText('Plano Essencial')).toBeInTheDocument();
    expect(screen.getByText('12 de 30')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Uso do plano' })).toHaveAttribute(
      'aria-valuenow',
      '12',
    );
    expect(screen.getByText('Ativa')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /PIX/ })).not.toBeInTheDocument();
  });

  it('avisa quando o plano está cheio', () => {
    render(<CartaoAssinatura painel={painel({ moradoresAtivos: 30 })} />);

    expect(screen.getByText(/plano está cheio/)).toBeInTheDocument();
  });

  it('perto do vencimento oferece gerar o PIX e abre o link numa aba nova', async () => {
    const abrir = vi.spyOn(window, 'open').mockReturnValue(null);
    const gerar = vi
      .spyOn(api, 'gerarCobrancaMensalidade')
      .mockResolvedValue({ invoiceUrl: 'https://asaas/pay_2' });

    render(<CartaoAssinatura painel={painel({ diasRestantes: 3 })} />);

    expect(screen.getByRole('status')).toHaveTextContent('vence em 3 dias');
    await userEvent.click(screen.getByRole('button', { name: 'Gerar PIX da mensalidade' }));

    await waitFor(() => expect(gerar).toHaveBeenCalledTimes(1));
    expect(abrir).toHaveBeenCalledWith('https://asaas/pay_2', '_blank', 'noopener,noreferrer');
  });

  it('suspensa: alerta e usa a cobrança que já está em aberto, sem gerar outra', async () => {
    const abrir = vi.spyOn(window, 'open').mockReturnValue(null);
    const gerar = vi.spyOn(api, 'gerarCobrancaMensalidade');

    render(
      <CartaoAssinatura
        painel={painel({
          status: 'SUSPENSA',
          diasRestantes: -9,
          cobrancaPendente: {
            invoiceUrl: 'https://asaas/aberta',
            valor: 49,
            referencia: '2026-11',
          },
        })}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('suspenso');
    await userEvent.click(screen.getByRole('button', { name: 'Pagar mensalidade (PIX)' }));

    expect(gerar).not.toHaveBeenCalled();
    expect(abrir).toHaveBeenCalledWith('https://asaas/aberta', '_blank', 'noopener,noreferrer');
  });
});
