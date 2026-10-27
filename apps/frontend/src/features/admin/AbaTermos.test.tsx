import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AbaDocumentos } from './AbaDocumentos';
import { AbaTermos } from './AbaTermos';
import * as api from '@/features/movimentacoes/movimentacoes.api';
import { buildResumo, termoRetirada } from '@/features/movimentacoes/fixtures';
import { TermoDTO } from '@/features/movimentacoes/movimentacoes.types';

const termoDevolucao: TermoDTO = {
  ...termoRetirada,
  id: 'termo-3',
  tipo: 'DEVOLUCAO',
  versao: 1,
  titulo: 'Termo de Responsabilidade — Devolução do Item',
  clausulas: ['O proprietário declara ter recebido o item.'],
  declaracoes: [
    { id: 'recebimento', texto: 'Declaro que recebi o item descrito neste documento.' },
  ],
};
const retiradaV1: TermoDTO = { ...termoRetirada, id: 'termo-0', versao: 1 };

function renderTermos(termos: TermoDTO[] = [termoRetirada, retiradaV1, termoDevolucao]) {
  vi.spyOn(api, 'listarTermos').mockResolvedValue(termos);
  return render(<AbaTermos />);
}

describe('AbaTermos', () => {
  it('lista as versões de cada tipo, a mais nova "em vigor", e deixa claro que são modelos pendentes de revisão', async () => {
    renderTermos();

    const retirada = await screen.findByRole('region', { name: 'Termo de Retirada' });
    expect(within(retirada).getByText('Versão 2')).toBeInTheDocument();
    expect(within(retirada).getByText('Versão 1')).toBeInTheDocument();
    expect(within(retirada).getByText('em vigor')).toBeInTheDocument();
    expect(within(retirada).getAllByText('Modelo — pendente de revisão')).toHaveLength(2);
    expect(screen.getByText(/revisão jurídica da empresa\/condomínio/)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Termo de Devolução' })).toBeInTheDocument();
  });

  it('registrar a revisão marca a versão como aprovada, com a data', async () => {
    const aprovar = vi.spyOn(api, 'aprovarTermo').mockResolvedValue({
      ...termoRetirada,
      statusRevisao: 'APROVADO',
      aprovadoEm: '2026-10-27T12:00:00.000Z',
    });
    renderTermos();

    await userEvent.click(
      await screen.findByRole('button', {
        name: 'Registrar aprovação da versão 2 do termo de retirada',
      }),
    );

    expect(aprovar).toHaveBeenCalledWith('termo-1');
    expect(await screen.findByText('Aprovado em 27/10/2026')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name: 'Registrar aprovação da versão 2 do termo de retirada',
      }),
    ).not.toBeInTheDocument();
  });

  it('criar nova versão parte do texto em vigor e envia cláusulas e declarações bem formadas', async () => {
    const nova: TermoDTO = { ...termoRetirada, id: 'termo-9', versao: 3 };
    const criar = vi.spyOn(api, 'criarVersaoDoTermo').mockResolvedValue(nova);
    renderTermos();

    await userEvent.click(
      await screen.findByRole('button', { name: 'Criar nova versão do termo de retirada' }),
    );
    // o editor já vem com o texto em vigor
    expect(screen.getByLabelText('Título do termo')).toHaveValue(termoRetirada.titulo);
    expect((screen.getByLabelText(/Cláusulas/) as HTMLTextAreaElement).value).toContain(
      'É vedado emprestar',
    );

    const titulo = screen.getByLabelText('Título do termo');
    await userEvent.clear(titulo);
    await userEvent.type(titulo, 'Termo de Retirada revisado');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar nova versão' }));

    expect(criar).toHaveBeenCalledTimes(1);
    const enviado = criar.mock.calls[0][0];
    expect(enviado).toMatchObject({ tipo: 'RETIRADA', titulo: 'Termo de Retirada revisado' });
    expect(enviado.clausulas).toEqual(termoRetirada.clausulas);
    expect(enviado.declaracoes).toEqual(termoRetirada.declaracoes);
    // a nova versão entra na lista (e o editor fecha)
    expect(await screen.findByText('Versão 3')).toBeInTheDocument();
    expect(screen.queryByLabelText('Título do termo')).not.toBeInTheDocument();
  });

  it('declaração fora do formato "identificador | texto" é recusada antes de enviar', async () => {
    const criar = vi.spyOn(api, 'criarVersaoDoTermo');
    renderTermos();

    await userEvent.click(
      await screen.findByRole('button', { name: 'Criar nova versão do termo de retirada' }),
    );
    const declaracoes = screen.getByLabelText(/Declarações de aceite/);
    await userEvent.clear(declaracoes);
    await userEvent.type(declaracoes, 'texto sem identificador');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar nova versão' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('identificador | texto');
    expect(criar).not.toHaveBeenCalled();
  });

  it('sem cláusulas não envia', async () => {
    const criar = vi.spyOn(api, 'criarVersaoDoTermo');
    renderTermos();

    await userEvent.click(
      await screen.findByRole('button', { name: 'Criar nova versão do termo de retirada' }),
    );
    await userEvent.clear(screen.getByLabelText(/Cláusulas/));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar nova versão' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('ao menos uma cláusula');
    expect(criar).not.toHaveBeenCalled();
  });

  it('mostra o erro do servidor ao salvar', async () => {
    vi.spyOn(api, 'criarVersaoDoTermo').mockRejectedValue({
      isAxiosError: true,
      response: { data: { error: { message: 'Outra versão foi criada ao mesmo tempo.' } } },
    });
    renderTermos();

    await userEvent.click(
      await screen.findByRole('button', { name: 'Criar nova versão do termo de retirada' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Salvar nova versão' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Outra versão foi criada');
  });

  it('cancelar o editor não cria nada', async () => {
    const criar = vi.spyOn(api, 'criarVersaoDoTermo');
    renderTermos();

    await userEvent.click(
      await screen.findByRole('button', { name: 'Criar nova versão do termo de retirada' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByLabelText('Título do termo')).not.toBeInTheDocument();
    expect(criar).not.toHaveBeenCalled();
  });
});

describe('AbaDocumentos (auditoria)', () => {
  it('lista os documentos com número, tipo, situação, item e partes, com link pro documento', async () => {
    vi.spyOn(api, 'listarDocumentosRecentes').mockResolvedValue([
      buildResumo({ itemTitulo: 'Projetor Epson', locacaoId: 'loc-1' }),
      buildResumo({
        id: 'mov-2',
        numeroDocumento: 'USAI-2026-000008',
        tipo: 'DEVOLUCAO',
        status: 'CONCLUIDA',
        itemTitulo: 'Furadeira',
      }),
    ]);

    render(
      <MemoryRouter>
        <AbaDocumentos />
      </MemoryRouter>,
    );

    const link = await screen.findByRole('link', { name: /USAI-2026-000007 · Retirada/ });
    expect(link).toHaveAttribute('href', '/movimentacoes/mov-1');
    expect(screen.getByText('Aguardando aceite')).toBeInTheDocument();
    expect(screen.getByText('Concluída')).toBeInTheDocument();
    expect(
      screen.getByText(/Projetor Epson — entregue por Davi Dono, recebido por Carla Locataria/),
    ).toBeInTheDocument();
  });

  it('sem documentos mostra o estado vazio', async () => {
    vi.spyOn(api, 'listarDocumentosRecentes').mockResolvedValue([]);

    render(
      <MemoryRouter>
        <AbaDocumentos />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Nenhum documento ainda')).toBeInTheDocument();
  });
});
