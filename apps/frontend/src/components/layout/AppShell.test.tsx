import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from './AppShell';
import * as conversasApi from '@/features/conversas/conversas.api';
import * as notificacoesApi from '@/features/notificacoes/notificacoes.api';
import * as authStorage from '@/lib/authStorage';
import * as socketLib from '@/lib/socket';

function renderShell(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/catalogo" element={<p>Página do catálogo</p>} />
          <Route path="/locacoes" element={<p>Página de locações</p>} />
          <Route path="/perfil" element={<p>Página de perfil</p>} />
        </Route>
        <Route path="/login" element={<p>Página de login</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AppShell', () => {
  beforeEach(() => {
    // O shell conecta socket e carrega conversas/notificações; nos testes nada disso sai pra rede.
    vi.spyOn(socketLib, 'createConversaSocket').mockReturnValue({
      on: vi.fn(),
      emit: vi.fn(),
      disconnect: vi.fn(),
    } as unknown as socketLib.ConversaSocket);
    vi.spyOn(conversasApi, 'listarMinhasConversas').mockResolvedValue([]);
    vi.spyOn(conversasApi, 'contarMensagensNaoLidas').mockResolvedValue(0);
    vi.spyOn(notificacoesApi, 'listarNotificacoes').mockResolvedValue({
      notificacoes: [],
      naoLidas: 2,
    });
  });

  it('renderiza o nome do morador logado e o conteúdo da rota', () => {
    vi.spyOn(authStorage, 'getStoredUser').mockReturnValue({
      id: 'user-1',
      nome: 'Bruno Locatario',
      email: 'bruno@example.com',
      papel: 'MORADOR',
      condominioId: 'cond-1',
      apartamento: null,
    });

    renderShell('/catalogo');

    expect(screen.getByText('Bruno Locatario')).toBeInTheDocument();
    expect(screen.getByText('Página do catálogo')).toBeInTheDocument();
    // duas navs (topo desktop + barra inferior mobile), cada uma com os 3 destinos
    expect(screen.getAllByRole('link', { name: 'Catálogo' })).toHaveLength(2);
  });

  it('leva pra página de perfil ao clicar no chip da conta no header', async () => {
    vi.spyOn(authStorage, 'getStoredUser').mockReturnValue({
      id: 'user-sindico',
      nome: 'Carla Síndica',
      email: 'carla@example.com',
      papel: 'SINDICO',
      condominioId: 'cond-1',
      apartamento: null,
    });

    renderShell('/catalogo');

    await userEvent.click(screen.getByRole('link', { name: /Carla Síndica/ }));

    expect(await screen.findByText('Página de perfil')).toBeInTheDocument();
  });

  it('mostra no sino do header a quantidade de notificações não lidas', async () => {
    vi.spyOn(authStorage, 'getStoredUser').mockReturnValue({
      id: 'user-1',
      nome: 'Bruno Locatario',
      email: 'bruno@example.com',
      papel: 'MORADOR',
      condominioId: 'cond-1',
      apartamento: null,
    });

    renderShell('/catalogo');

    expect(await screen.findByTestId('notificacoes-contagem')).toHaveTextContent('2');
    expect(screen.getByRole('link', { name: 'Notificações (2 não lidas)' })).toBeInTheDocument();
  });

  it('mostra a bolinha em "Conversas" quando há mensagens não lidas gravadas no servidor', async () => {
    vi.spyOn(conversasApi, 'contarMensagensNaoLidas').mockResolvedValue(2);
    vi.spyOn(authStorage, 'getStoredUser').mockReturnValue({
      id: 'user-1',
      nome: 'Bruno Locatario',
      email: 'bruno@example.com',
      papel: 'MORADOR',
      condominioId: 'cond-1',
      apartamento: null,
    });

    renderShell('/catalogo');

    expect((await screen.findAllByLabelText('Mensagens não lidas')).length).toBeGreaterThan(0);
  });

  it('sem mensagens não lidas, não mostra a bolinha', async () => {
    vi.spyOn(authStorage, 'getStoredUser').mockReturnValue({
      id: 'user-1',
      nome: 'Bruno Locatario',
      email: 'bruno@example.com',
      papel: 'MORADOR',
      condominioId: 'cond-1',
      apartamento: null,
    });

    renderShell('/catalogo');
    await screen.findByText('Página do catálogo');

    expect(screen.queryByLabelText('Mensagens não lidas')).not.toBeInTheDocument();
  });

  it('síndico tem Saques no menu (recebe a comissão do condomínio); admin não', async () => {
    vi.spyOn(authStorage, 'getStoredUser').mockReturnValue({
      id: 'user-sindico',
      nome: 'Carla Síndica',
      email: 'carla@example.com',
      papel: 'SINDICO',
      condominioId: 'cond-1',
      apartamento: null,
    });

    renderShell('/catalogo');

    expect(await screen.findAllByRole('link', { name: 'Saques' })).toHaveLength(2);
  });
});
