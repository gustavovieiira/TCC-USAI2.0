import { apiClient } from '@/lib/apiClient';

/** Pede ao servidor a cópia dos dados da pessoa e devolve o arquivo (JSON) para ser baixado. */
export async function baixarMeusDados(): Promise<Blob> {
  const { data } = await apiClient.get<Blob>('/privacidade/meus-dados', { responseType: 'blob' });
  return data;
}

/** Anonimiza a conta (LGPD). Exige a senha; o servidor recusa se houver pendências em aberto. */
export async function excluirMinhaConta(senha: string): Promise<void> {
  await apiClient.post('/privacidade/excluir-conta', { senha, confirmacao: 'EXCLUIR' });
}
