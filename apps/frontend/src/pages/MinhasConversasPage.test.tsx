import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { MinhasConversasPage } from './MinhasConversasPage';
import * as conversasApi from '@/features/conversas/conversas.api';
import { formatDiasRestantes } from '@/lib/format';
import { ConversaDTO, ParticipanteDTO } from '@/features/conversas/conversas.types';

const EXPIRA_EM = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

function buildConversa(overrides: Partial<ConversaDTO> = {}): ConversaDTO {
  return {
    id: 'conversa-1',
    outroParticipante: { id: 'user-bruno', nome: 'Bruno Locatario', papel: 'MORADOR' },
    postOrigemId: 'post-1',
    createdAt: '2026-09-16T12:00:00.000Z',
    expiraEm: EXPIRA_EM,
    ultimaMensagem: null,
    ...overrides,
  };
}

const usuarios: ParticipanteDTO[] = [
  { id: 'user-bruno', nome: 'Bruno Locatario', papel: 'MORADOR' },
  { id: 'user-carla', nome: 'Carla Sindica', papel: 'SINDICO' },
];

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/conversas']}>
      <Routes>
        <Route path="/conversas" element={<MinhasConversasPage />} />
        <Route path="/conversas/:id" element={<p>Tela da conversa</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('MinhasConversasPage', () => {
  it('lista as conversas com a última mensagem e o prazo de expiração', async () => {
    vi.spyOn(conversasApi, 'listarUsuariosDoCondominio').mockResolvedValue([]);
    vi.spyOn(conversasApi, 'listarMinhasConversas').mockResolvedValue([
      buildConversa({
        ultimaMensagem: {
          conteudo: 'Ainda tem a furadeira?',
          createdAt: '2026-09-16T12:05:00.000Z',
        },
      }),
    ]);

    renderPage();

    expect(await screen.findByText('Bruno Locatario')).toBeInTheDocument();
    expect(screen.getByText('Ainda tem a furadeira?')).toBeInTheDocument();
    expect(screen.getByText(formatDiasRestantes(EXPIRA_EM))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Bruno Locatario/ })).toHaveAttribute(
      'href',
      '/conversas/conversa-1',
    );
  });

  it('mostra o placeholder de "nenhuma mensagem ainda" quando a conversa está vazia', async () => {
    vi.spyOn(conversasApi, 'listarUsuariosDoCondominio').mockResolvedValue([]);
    vi.spyOn(conversasApi, 'listarMinhasConversas').mockResolvedValue([buildConversa()]);

    renderPage();

    expect(await screen.findByText('Nenhuma mensagem ainda.')).toBeInTheDocument();
  });

  it('mostra estado vazio quando não há conversas', async () => {
    vi.spyOn(conversasApi, 'listarUsuariosDoCondominio').mockResolvedValue([]);
    vi.spyOn(conversasApi, 'listarMinhasConversas').mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText('Nenhuma conversa ainda')).toBeInTheDocument();
  });

  it('exibe erro quando o carregamento falha', async () => {
    vi.spyOn(conversasApi, 'listarUsuariosDoCondominio').mockResolvedValue([]);
    vi.spyOn(conversasApi, 'listarMinhasConversas').mockRejectedValue({
      isAxiosError: true,
      response: { data: { error: { message: 'Falha ao carregar conversas' } } },
    });

    renderPage();

    expect(await screen.findByText('Falha ao carregar conversas')).toBeInTheDocument();
  });

  it('busca um morador pelo nome e mostra os resultados', async () => {
    vi.spyOn(conversasApi, 'listarUsuariosDoCondominio').mockResolvedValue(usuarios);
    vi.spyOn(conversasApi, 'listarMinhasConversas').mockResolvedValue([]);

    renderPage();
    await screen.findByText('Nenhuma conversa ainda');

    await userEvent.type(screen.getByLabelText('Buscar morador'), 'carla');

    expect(await screen.findByText('Carla Sindica')).toBeInTheDocument();
    expect(screen.getByText('Síndico')).toBeInTheDocument();
    expect(screen.queryByText('Bruno Locatario')).not.toBeInTheDocument();
  });

  it('mostra "nenhum morador encontrado" quando a busca não bate com ninguém', async () => {
    vi.spyOn(conversasApi, 'listarUsuariosDoCondominio').mockResolvedValue(usuarios);
    vi.spyOn(conversasApi, 'listarMinhasConversas').mockResolvedValue([]);

    renderPage();
    await screen.findByText('Nenhuma conversa ainda');

    await userEvent.type(screen.getByLabelText('Buscar morador'), 'zzz');

    expect(await screen.findByText('Nenhum morador encontrado com esse nome.')).toBeInTheDocument();
  });

  it('abre a conversa com o morador buscado e navega pra tela dela', async () => {
    vi.spyOn(conversasApi, 'listarUsuariosDoCondominio').mockResolvedValue(usuarios);
    vi.spyOn(conversasApi, 'listarMinhasConversas').mockResolvedValue([]);
    const abrir = vi
      .spyOn(conversasApi, 'abrirConversa')
      .mockResolvedValue(buildConversa({ id: 'conversa-nova', outroParticipante: usuarios[0] }));

    renderPage();
    await screen.findByText('Nenhuma conversa ainda');

    await userEvent.type(screen.getByLabelText('Buscar morador'), 'bruno');
    await userEvent.click(await screen.findByText('Bruno Locatario'));

    expect(abrir).toHaveBeenCalledWith({ usuarioId: 'user-bruno' });
    expect(await screen.findByText('Tela da conversa')).toBeInTheDocument();
  });
});
