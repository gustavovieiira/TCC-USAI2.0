import { apiClient } from '@/lib/apiClient';
import { AtualizarTextosInput, ConfiguracaoDTO } from './configuracao.types';

/** Pública: o login e a tela inicial já precisam da logo. */
export async function buscarConfiguracao(): Promise<ConfiguracaoDTO> {
  const { data } = await apiClient.get<ConfiguracaoDTO>('/configuracao');
  return data;
}

/** Admin: envia a logo oficial (PNG, JPEG ou WebP, até 2 MB). */
export async function enviarLogo(arquivo: File): Promise<ConfiguracaoDTO> {
  const form = new FormData();
  form.append('logo', arquivo);

  const { data } = await apiClient.post<ConfiguracaoDTO>('/admin/configuracao/logo', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function removerLogo(): Promise<ConfiguracaoDTO> {
  const { data } = await apiClient.delete<ConfiguracaoDTO>('/admin/configuracao/logo');
  return data;
}

export async function atualizarTextosInstitucionais(
  input: AtualizarTextosInput,
): Promise<ConfiguracaoDTO> {
  const { data } = await apiClient.put<ConfiguracaoDTO>('/admin/configuracao', input);
  return data;
}
