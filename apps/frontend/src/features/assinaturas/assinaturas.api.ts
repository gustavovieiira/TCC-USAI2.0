import { apiClient } from '@/lib/apiClient';

export type PeriodoCodigo = 'MENSAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL';

export interface PeriodoDTO {
  codigo: PeriodoCodigo;
  nome: string;
  meses: number;
  dias: number;
  /** Desconto em % sobre pagar mês a mês pelo mesmo tempo. */
  desconto: number;
}

export interface PrecoDoPeriodoDTO {
  periodoCodigo: PeriodoCodigo;
  /** Quanto o síndico paga de uma vez (cada cobrança PIX). */
  valorTotal: number;
  valorMensalEquivalente: number;
  /** Quanto economiza em relação ao mensal pelo mesmo tempo. */
  economia: number;
}

export interface PlanoDTO {
  codigo: string;
  nome: string;
  limiteMoradores: number;
  /** Mensalidade cheia (preço do período mensal). */
  valorMensal: number;
  descricao: string;
  destaque: boolean;
  /** Plano de teste de pagamento (R$ 2,00): só vem da API com o modo de teste ligado. */
  teste: boolean;
  precos: PrecoDoPeriodoDTO[];
}

export interface PlanosDTO {
  periodos: PeriodoDTO[];
  planos: PlanoDTO[];
}

export type StatusAssinatura = 'AGUARDANDO_PAGAMENTO' | 'ATIVA' | 'SUSPENSA';

export interface ContratacaoDTO {
  assinaturaId: string;
  status: StatusAssinatura;
  plano: Pick<PlanoDTO, 'codigo' | 'nome' | 'valorMensal' | 'limiteMoradores'>;
  periodo: Pick<PeriodoDTO, 'codigo' | 'nome' | 'meses' | 'desconto'>;
  /** Valor de cada cobrança no período escolhido. */
  valorCiclo: number;
  nomeCondominio: string;
  /** Link do PIX; só existe enquanto o pagamento não foi confirmado. */
  invoiceUrl: string | null;
  /** E-mail do síndico com parte escondida, pra mostrar onde o acesso chega. */
  emailMascarado: string;
}

export interface ContratarPayload {
  planoCodigo: string;
  periodoCodigo: string;
  nomeCondominio: string;
  nomeSindico: string;
  email: string;
  cpfCnpj: string;
  aceiteTermos: boolean;
}

export interface OpcaoRenovacaoDTO extends PrecoDoPeriodoDTO {
  nome: string;
  meses: number;
  desconto: number;
}

export interface PainelAssinaturaDTO {
  planoCodigo: string;
  planoNome: string;
  valorMensal: number;
  periodoCodigo: PeriodoCodigo;
  periodoNome: string;
  /** Valor de cada cobrança no período atual. */
  valorCiclo: number;
  /** Quanto custa renovar por cada período (dá pra trocar de período ao renovar). */
  opcoesRenovacao: OpcaoRenovacaoDTO[];
  limiteMoradores: number;
  moradoresAtivos: number;
  status: StatusAssinatura;
  ativaAte: string | null;
  /** Dias até vencer (negativo = vencida). */
  diasRestantes: number | null;
  cobrancaPendente: {
    invoiceUrl: string;
    valor: number;
    referencia: string;
    periodoCodigo: PeriodoCodigo;
  } | null;
}

export async function listarPlanos(): Promise<PlanosDTO> {
  const { data } = await apiClient.get<PlanosDTO>('/assinaturas/planos');
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

/** PIX da renovação; sem `periodoCodigo` repete o período atual da assinatura. */
export async function gerarCobrancaRenovacao(
  periodoCodigo?: PeriodoCodigo,
): Promise<{ invoiceUrl: string }> {
  const { data } = await apiClient.post<{ invoiceUrl: string }>('/sindico/assinatura/cobranca', {
    periodoCodigo,
  });
  return data;
}

/** Preço de um plano num período (ou undefined se a lista não tiver). */
export function precoDe(plano: PlanoDTO, periodoCodigo: string): PrecoDoPeriodoDTO | undefined {
  return plano.precos.find((p) => p.periodoCodigo === periodoCodigo);
}

/** "Mensal" -> "por mês"; os demais -> "a cada 3 meses", "a cada 12 meses"... */
export function frequenciaDoPeriodo(meses: number): string {
  return meses === 1 ? 'por mês' : `a cada ${meses} meses`;
}
