export interface Plano {
  codigo: string;
  nome: string;
  /** Quantas contas de morador ativas o condomínio pode ter neste plano. */
  limiteMoradores: number;
  /** Mensalidade cheia, em reais (o preço do período mensal; os demais têm desconto sobre ela). */
  valorMensal: number;
  descricao: string;
  destaque: boolean;
  /** Plano de teste de pagamento: só existe com `PLANO_TESTE_ATIVO=true` e não entra na recomendação. */
  teste: boolean;
}

export type PeriodoCodigo = 'MENSAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL';

export interface Periodo {
  codigo: PeriodoCodigo;
  nome: string;
  meses: number;
  /** Quantos dias de uso cada pagamento libera. */
  dias: number;
  /** Desconto em % sobre meses x mensalidade cheia. */
  desconto: number;
}

export interface PrecoDoPeriodo {
  periodoCodigo: PeriodoCodigo;
  /** Quanto o síndico paga de uma vez (cada cobrança PIX). */
  valorTotal: number;
  /** O mesmo valor, dividido por mês, pra comparar com a mensalidade cheia. */
  valorMensalEquivalente: number;
  /** Quanto economiza em relação a pagar mês a mês pelo mesmo tempo. */
  economia: number;
}

/**
 * Planos de assinatura, por quantidade de moradores. É a ÚNICA fonte de verdade: o backend cobra
 * e limita por esta lista, e o frontend (tela inicial e contratação) lê de `GET /api/assinaturas/planos`.
 * Para mudar faixa ou preço basta editar aqui — os valores abaixo são fictícios (projeto acadêmico).
 */
export const PLANOS: Plano[] = [
  {
    codigo: 'ESSENCIAL',
    nome: 'Essencial',
    limiteMoradores: 20,
    valorMensal: 149,
    descricao: 'Para condomínios pequenos que querem começar a compartilhar.',
    destaque: false,
    teste: false,
  },
  {
    codigo: 'CONDOMINIO',
    nome: 'Condomínio',
    limiteMoradores: 60,
    valorMensal: 299,
    descricao: 'O plano da maioria dos condomínios residenciais.',
    destaque: true,
    teste: false,
  },
  {
    codigo: 'GRANDE',
    nome: 'Grande',
    limiteMoradores: 150,
    valorMensal: 499,
    descricao: 'Para condomínios grandes ou com várias torres.',
    destaque: false,
    teste: false,
  },
  {
    codigo: 'PREMIUM',
    nome: 'Premium',
    limiteMoradores: 300,
    valorMensal: 799,
    descricao: 'Para grandes empreendimentos e condomínios-clube.',
    destaque: false,
    teste: false,
  },
];

/**
 * Plano de R$ 5,00 para validar a cobrança por PIX (ex.: a conta do Asaas em produção) sem gastar
 * com um plano de verdade. O valor é o mínimo que o Asaas aceita numa cobrança (abaixo de R$ 5,00 ele
 * recusa); por isso não é R$ 2,00. Fica fora da vitrine e da contratação, a menos que `PLANO_TESTE_ATIVO`
 * seja `true` no ambiente — ligue só durante o teste e desligue depois.
 */
export const PLANO_TESTE: Plano = {
  codigo: 'TESTE',
  nome: 'Teste',
  limiteMoradores: 3,
  valorMensal: 5,
  descricao: 'Plano para validar o pagamento por PIX. Não é oferecido ao público.',
  destaque: false,
  teste: true,
};

export function planoTesteAtivo(): boolean {
  return process.env.PLANO_TESTE_ATIVO === 'true';
}

/** Os planos que podem ser vistos e contratados agora (o de teste só se estiver ligado). */
export function planosDisponiveis(): Plano[] {
  return planoTesteAtivo() ? [...PLANOS, PLANO_TESTE] : PLANOS;
}

/** Quanto mais tempo o síndico paga adiantado, maior o desconto. */
export const PERIODOS: Periodo[] = [
  { codigo: 'MENSAL', nome: 'Mensal', meses: 1, dias: 30, desconto: 0 },
  { codigo: 'TRIMESTRAL', nome: 'Trimestral', meses: 3, dias: 90, desconto: 5 },
  { codigo: 'SEMESTRAL', nome: 'Semestral', meses: 6, dias: 180, desconto: 10 },
  { codigo: 'ANUAL', nome: 'Anual', meses: 12, dias: 365, desconto: 20 },
];

/** Acha qualquer plano pelo código, inclusive o de teste (serve pra mostrar o nome de assinaturas existentes). */
export function buscarPlano(codigo: string): Plano | undefined {
  return [...PLANOS, PLANO_TESTE].find((plano) => plano.codigo === codigo);
}

/** Acha só entre os planos que podem ser contratados agora. */
export function buscarPlanoDisponivel(codigo: string): Plano | undefined {
  return planosDisponiveis().find((plano) => plano.codigo === codigo);
}

export function buscarPeriodo(codigo: string): Periodo | undefined {
  return PERIODOS.find((periodo) => periodo.codigo === codigo);
}

/** Preço de um plano num período: meses x mensalidade, menos o desconto, arredondado pra reais inteiros. */
export function precoDoPeriodo(
  plano: Pick<Plano, 'valorMensal'>,
  periodo: Periodo,
): PrecoDoPeriodo {
  const cheio = plano.valorMensal * periodo.meses;
  const valorTotal = Math.round((cheio * (100 - periodo.desconto)) / 100);
  return {
    periodoCodigo: periodo.codigo,
    valorTotal,
    valorMensalEquivalente: Math.round((valorTotal / periodo.meses) * 100) / 100,
    economia: cheio - valorTotal,
  };
}

export function precosDoPlano(plano: Plano): PrecoDoPeriodo[] {
  return PERIODOS.map((periodo) => precoDoPeriodo(plano, periodo));
}
