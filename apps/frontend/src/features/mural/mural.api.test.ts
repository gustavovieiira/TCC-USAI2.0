import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/apiClient', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

import { apiClient } from '@/lib/apiClient';
import { uploadImagemPost } from './mural.api';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('uploadImagemPost', () => {
  it('envia a foto como multipart no campo "imagem" e devolve o endereço', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { url: 'http://localhost:3000/uploads/mural/a.jpg' },
    });
    const arquivo = new File(['x'], 'a.jpg', { type: 'image/jpeg' });

    const resposta = await uploadImagemPost(arquivo);

    expect(resposta.url).toBe('http://localhost:3000/uploads/mural/a.jpg');
    const [rota, corpo] = vi.mocked(apiClient.post).mock.calls[0];
    expect(rota).toBe('/mural/upload-imagem');
    expect(corpo).toBeInstanceOf(FormData);
    expect((corpo as FormData).get('imagem')).toBe(arquivo);
  });
});
