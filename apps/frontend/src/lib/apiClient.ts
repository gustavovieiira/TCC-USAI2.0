import axios from 'axios';
import { clearSession, getAccessToken, getRefreshToken, saveTokens } from './authStorage';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api',
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let renovacaoEmAndamento: Promise<string | null> | null = null;

/**
 * Pede um token de acesso novo com o token de renovação. Usa o axios puro (sem estes interceptors) para não
 * entrar em ciclo. Várias chamadas que vencem ao mesmo tempo compartilham uma única renovação.
 */
function renovarSessao(): Promise<string | null> {
  renovacaoEmAndamento ??= (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;
    try {
      const { data } = await axios.post<{ accessToken: string; refreshToken: string }>(
        `${apiClient.defaults.baseURL}/auth/refresh`,
        { refreshToken },
      );
      saveTokens(data.accessToken, data.refreshToken);
      return data.accessToken;
    } catch {
      return null;
    }
  })().finally(() => {
    renovacaoEmAndamento = null;
  });
  return renovacaoEmAndamento;
}

/** O token de acesso dura 15 minutos: ao vencer, renova sozinho e repete a chamada; se não der, volta ao login. */
apiClient.interceptors.response.use(
  (resposta) => resposta,
  async (erro: unknown) => {
    if (!axios.isAxiosError(erro) || !erro.config) throw erro;

    const original = erro.config as typeof erro.config & { jaRenovou?: boolean };
    const venceu =
      erro.response?.status === 401 && erro.response.data?.error?.code === 'TOKEN_INVALIDO';
    if (!venceu || original.jaRenovou || !getRefreshToken()) throw erro;

    original.jaRenovou = true;
    const novoToken = await renovarSessao();
    if (novoToken) {
      original.headers.Authorization = `Bearer ${novoToken}`;
      return apiClient(original);
    }

    // A sessão acabou de verdade (7 dias, ou encerrada em outro aparelho): volta para entrar de novo.
    clearSession();
    if (globalThis.location && !globalThis.location.pathname.startsWith('/login')) {
      globalThis.location.assign('/login');
    }
    throw erro;
  },
);

export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const dados = error.response?.data?.error;
    // Falha de validação: mostra o primeiro motivo (por exemplo "Essa senha é fácil de adivinhar"), não só "Dados inválidos".
    if (dados?.code === 'VALIDATION_ERROR') {
      const motivos: unknown[] = Object.values(dados.details?.fieldErrors ?? {}).flat();
      const primeiro = motivos.find((m) => typeof m === 'string' && m.length > 0);
      if (typeof primeiro === 'string') return primeiro;
    }
    return dados?.message ?? 'Não foi possível completar a operação.';
  }
  return 'Erro inesperado. Tente novamente.';
}
