export const CATEGORIAS_DESPESA = ['SERVIDOR', 'DOMINIO', 'EMAIL', 'TAXAS', 'OUTRO'] as const;
export type CategoriaDespesa = (typeof CATEGORIAS_DESPESA)[number];

export interface CriarDespesaInput {
  /** Dia da despesa, no formato AAAA-MM-DD (horário de Brasília). */
  data: string;
  valor: number;
  descricao: string;
  categoria: CategoriaDespesa;
}

/** Uma mensalidade paga por um síndico: o que entrou na plataforma, com os dados do recibo. */
export interface RecebimentoDTO {
  id: string;
  /** Número do recibo (o mesmo do e-mail que o síndico recebeu), ex.: USAI-3F9A12BC. */
  numeroRecibo: string;
  pagoEm: Date;
  condominio: { id: string; nome: string };
  sindico: { nome: string; email: string; documento: string | null };
  plano: string;
  periodo: string;
  /** Quanto o síndico pagou. */
  valor: number;
  /** Taxa cobrada pelo Asaas (nulo nas mensalidades pagas antes de a taxa passar a ser gravada). */
  taxaAsaas: number | null;
  /** O que sobrou depois da taxa do Asaas (nulo quando a taxa não foi gravada). */
  liquido: number | null;
  /** Quantos dias de uso esse pagamento liberou. */
  dias: number;
  /** Vigência paga (nulos nas mensalidades anteriores à gravação da vigência). */
  vigenciaInicio: Date | null;
  vigenciaFim: Date | null;
  comprovanteUrl: string | null;
}

export interface DespesaDTO {
  id: string;
  data: Date;
  valor: number;
  descricao: string;
  categoria: CategoriaDespesa;
}

export interface VendasDoMesDTO {
  /** Mês consultado, AAAA-MM. */
  mes: string;
  resumo: {
    /** Soma do que os síndicos pagaram no mês. */
    entrou: number;
    /** Soma das taxas do Asaas dessas mensalidades. */
    taxasAsaas: number;
    /** Despesas lançadas pelo Admin no mês. */
    despesas: number;
    /** entrou − taxas do Asaas − despesas. */
    resultado: number;
    pagamentos: number;
    /** Quantas mensalidades do mês estão sem a taxa gravada (a conta delas considera taxa 0). */
    taxasNaoInformadas: number;
  };
  recebimentos: RecebimentoDTO[];
  despesas: DespesaDTO[];
}

export type StatusAssinaturaAdmin = 'AGUARDANDO_PAGAMENTO' | 'ATIVA' | 'SUSPENSA';

export interface AssinaturaAdminDTO {
  id: string;
  condominio: { id: string; nome: string };
  sindico: { nome: string; email: string };
  plano: string;
  periodo: string;
  /** Valor de cada cobrança do período contratado. */
  valorCiclo: number;
  status: StatusAssinaturaAdmin;
  ativaAte: Date | null;
  /** Dias até vencer (negativo: já venceu). Nulo quando ainda não há vigência (aguardando o primeiro pagamento). */
  diasRestantes: number | null;
}

export interface AssinaturasAdminDTO {
  resumo: {
    total: number;
    ativas: number;
    aguardandoPagamento: number;
    suspensas: number;
    /** Ativas cuja data de vencimento já passou (a suspensão automática ainda não rodou). */
    vencidas: number;
  };
  /** Do que vence primeiro para o que vence depois; quem ainda não tem vigência vai por último. */
  itens: AssinaturaAdminDTO[];
}
