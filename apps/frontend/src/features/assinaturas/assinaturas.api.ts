import { apiClient } from '@/lib/apiClient';

export interface PlanoDTO {
  codigo: string;
  nome: string;
  limiteMoradores: number;
  valorMensal: number;
  descricao: string;
  destaque: boolean;
}

export type StatusAssinatura = 'AGUARDANDO_PAGAMENTO' | 'ATIVA' | 'SUSPENSA';

export interface ContratacaoDTO {
  assinaturaId: string;
  status: StatusAssinatura;
  plano: Pick<PlanoDTO, 'codigo' | 'nome' | 'valorMensal' | 'limiteMoradores'>;
  nomeCondominio: string;
  /** Link do PIX; só existe enquanto o pagamento não foi confirmado. */
  invoiceUrl: string | null;
  /** E-mail do síndico com parte escondida, pra mostrar onde o acesso chega. */
  emailMascarado: string;
}

export interface ContratarPayload {
  planoCodigo: string;
  nomeCondominio: string;
  nomeSindico: string;
  email: string;
  cpfCnpj: string;
  aceiteTermos: boolean;
}

export interface PainelAssinaturaDTO {
  planoCodigo: string;
  planoNome: string;
  valorMensal: number;
  limiteMoradores: number;
  moradoresAtivos: number;
  status: StatusAssinatura;
  ativaAte: string | null;
  /** Dias até vencer (negativo = vencida). */
  diasRestantes: number | null;
  cobrancaPendente: { invoiceUrl: string; valor: number; referencia: string } | null;
}

export async function listarPlanos(): Promise<PlanoDTO[]> {
  const { data } = await apiClient.get<PlanoDTO[]>('/assinaturas/planos');
  return data;
}

export async function contratar(payload: ContratarPayload): Promise<ContratacaoDTO> {
  const { data } = await apiClient.post<ContratacaoDTO>('/assinaturas/contratar', payload);
  return data;
}

export async function consultarContratacao(id: string): Promise<ContratacaoDTO> {
  const { data } = await apiClient.get<ContratacaoDTO>(`/assinaturas/${id}/status`);
  return data;
}

export async function reenviarAcesso(id: string): Promise<void> {
  await apiClient.post(`/assinaturas/${id}/reenviar-acesso`);
}

/** Painel do síndico: `null` para condomínios antigos, sem assinatura. */
export async function buscarPainelAssinatura(): Promise<PainelAssinaturaDTO | null> {
  const { data } = await apiClient.get<PainelAssinaturaDTO | null>('/sindico/assinatura');
  return data;
}

export async function gerarCobrancaMensalidade(): Promise<{ invoiceUrl: string }> {
  const { data } = await apiClient.post<{ invoiceUrl: string }>('/sindico/assinatura/cobranca');
  return data;
}
