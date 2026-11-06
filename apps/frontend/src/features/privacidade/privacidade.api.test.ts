import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/apiClient', () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}));

import { apiClient } from '@/lib/apiClient';
import { encerrarSessao } from '@/features/auth/auth.api';
import { baixarMeusDados, excluirMinhaConta } from './privacidade.api';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('chamadas da LGPD e do logout', () => {
  it('baixarMeusDados pede o arquivo como blob e devolve o conteúdo', async () => {
    const arquivo = new Blob(['{}'], { type: 'application/json' });
    vi.mocked(apiClient.get).mockResolvedValue({ data: arquivo });

    await expect(baixarMeusDados()).resolves.toBe(arquivo);
    expect(apiClient.get).toHaveBeenCalledWith('/privacidade/meus-dados', { responseType: 'blob' });
  });

  it('excluirMinhaConta manda a senha e a palavra de confirmação', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: undefined });

    await excluirMinhaConta('senha-forte-123');

    expect(apiClient.post).toHaveBeenCalledWith('/privacidade/excluir-conta', {
      senha: 'senha-forte-123',
      confirmacao: 'EXCLUIR',
    });
  });

  it('encerrarSessao avisa o servidor para derrubar as sessões', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: undefined });

    await encerrarSessao();

    expect(apiClient.post).toHaveBeenCalledWith('/auth/logout');
  });
});
