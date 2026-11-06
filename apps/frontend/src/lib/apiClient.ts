import axios from 'axios';
import { getAccessToken } from './authStorage';

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
