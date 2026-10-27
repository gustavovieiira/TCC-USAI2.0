import { beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AbaIdentidade } from './AbaIdentidade';
import * as api from '@/features/configuracao/configuracao.api';
import { ConfiguracaoProvider } from '@/features/configuracao/ConfiguracaoContext';
import { ConfiguracaoDTO } from '@/features/configuracao/configuracao.types';

const padrao: ConfiguracaoDTO = {
  logoUrl: null,
  nomeInstitucional: 'USAI — Compartilhamento entre vizinhos',
  rodapeInstitucional: 'Rodapé padrão',
};
const comLogo: ConfiguracaoDTO = {
  logoUrl: 'http://localhost:3000/uploads/marca/logo.png',
  nomeInstitucional: 'Condomínio Aurora',
  rodapeInstitucional: 'Rodapé da empresa',
};

function renderAba(inicial: ConfiguracaoDTO = padrao) {
  vi.spyOn(api, 'buscarConfiguracao').mockResolvedValue(inicial);
  return render(
    <ConfiguracaoProvider>
      <AbaIdentidade />
    </ConfiguracaoProvider>,
  );
}

function arquivo(nome: string, tipo: string, tamanho = 10) {
  return new File([new Uint8Array(tamanho)], nome, { type: tipo });
}

describe('AbaIdentidade — logo oficial', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:previa');
    URL.revokeObjectURL = vi.fn();
  });

  it('mostra a marca padrão enquanto não há logo e não oferece "remover"', async () => {
    renderAba();

    expect(await screen.findByText('Marca padrão da USAI.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remover logo' })).not.toBeInTheDocument();
  });

  it('escolher o arquivo mostra a pré-visualização; só vale depois de "Usar esta logo"', async () => {
    const enviar = vi.spyOn(api, 'enviarLogo').mockResolvedValue(comLogo);
    renderAba();
    await screen.findByText('Marca padrão da USAI.');

    await userEvent.upload(
      screen.getByLabelText('Selecionar arquivo da logo'),
      arquivo('logo-empresa.png', 'image/png'),
    );

    expect(await screen.findByAltText('Pré-visualização da nova logo')).toBeInTheDocument();
    expect(enviar).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Usar esta logo' }));

    expect(enviar).toHaveBeenCalledTimes(1);
    expect(enviar.mock.calls[0][0].name).toBe('logo-empresa.png');
    expect(await screen.findByRole('status')).toHaveTextContent('Logo atualizada');
    // a logo nova já aparece no lugar da marca padrão
    expect(await screen.findByRole('img', { name: 'Condomínio Aurora' })).toBeInTheDocument();
  });

  it('descartar a pré-visualização não envia nada', async () => {
    const enviar = vi.spyOn(api, 'enviarLogo');
    renderAba();
    await screen.findByText('Marca padrão da USAI.');

    await userEvent.upload(
      screen.getByLabelText('Selecionar arquivo da logo'),
      arquivo('l.png', 'image/png'),
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Descartar' }));

    expect(screen.queryByAltText('Pré-visualização da nova logo')).not.toBeInTheDocument();
    expect(enviar).not.toHaveBeenCalled();
  });

  it('recusa formato que não é PNG, JPEG ou WebP (SVG inclusive), com mensagem clara', async () => {
    renderAba();
    await screen.findByText('Marca padrão da USAI.');

    await userEvent.upload(
      screen.getByLabelText('Selecionar arquivo da logo'),
      arquivo('logo.svg', 'image/svg+xml'),
      { applyAccept: false },
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Use PNG, JPEG ou WebP');
    expect(screen.queryByAltText('Pré-visualização da nova logo')).not.toBeInTheDocument();
  });

  it('recusa arquivo acima de 2 MB', async () => {
    renderAba();
    await screen.findByText('Marca padrão da USAI.');

    await userEvent.upload(
      screen.getByLabelText('Selecionar arquivo da logo'),
      arquivo('grande.png', 'image/png', 2 * 1024 * 1024 + 1),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('no máximo 2 MB');
  });

  it('erro do servidor no envio aparece e a logo continua a de antes', async () => {
    vi.spyOn(api, 'enviarLogo').mockRejectedValue({
      isAxiosError: true,
      response: { data: { error: { message: 'Falha no upload da logo' } } },
    });
    renderAba();
    await screen.findByText('Marca padrão da USAI.');

    await userEvent.upload(
      screen.getByLabelText('Selecionar arquivo da logo'),
      arquivo('l.png', 'image/png'),
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Usar esta logo' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Falha no upload da logo');
    expect(screen.queryByRole('img', { name: 'Condomínio Aurora' })).not.toBeInTheDocument();
  });

  it('remover a logo volta à marca padrão', async () => {
    const remover = vi.spyOn(api, 'removerLogo').mockResolvedValue(padrao);
    renderAba(comLogo);

    await userEvent.click(await screen.findByRole('button', { name: 'Remover logo' }));

    expect(remover).toHaveBeenCalled();
    expect(await screen.findByRole('status')).toHaveTextContent('voltou a usar a marca padrão');
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Remover logo' })).not.toBeInTheDocument(),
    );
  });
});

describe('AbaIdentidade — textos institucionais', () => {
  it('os campos vêm preenchidos com o que está salvo e salvar envia nome e rodapé', async () => {
    const salvar = vi.spyOn(api, 'atualizarTextosInstitucionais').mockResolvedValue({
      ...comLogo,
      nomeInstitucional: 'Condomínio Aurora Ltda',
    });
    renderAba(comLogo);

    const nome = await screen.findByLabelText('Nome da empresa');
    await waitFor(() => expect(nome).toHaveValue('Condomínio Aurora'));
    expect(screen.getByLabelText('Rodapé institucional')).toHaveValue('Rodapé da empresa');

    await userEvent.clear(nome);
    await userEvent.type(nome, 'Condomínio Aurora Ltda');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar textos' }));

    expect(salvar).toHaveBeenCalledWith({
      nomeInstitucional: 'Condomínio Aurora Ltda',
      rodapeInstitucional: 'Rodapé da empresa',
    });
    expect(await screen.findByRole('status')).toHaveTextContent('salvos');
  });

  it('mostra o erro de validação do servidor', async () => {
    vi.spyOn(api, 'atualizarTextosInstitucionais').mockRejectedValue({
      isAxiosError: true,
      response: { data: { error: { message: 'Informe o nome da empresa' } } },
    });
    renderAba(comLogo);

    await userEvent.click(await screen.findByRole('button', { name: 'Salvar textos' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Informe o nome da empresa');
  });
});
