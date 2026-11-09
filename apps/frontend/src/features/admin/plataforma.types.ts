export type CategoriaDespesa = 'SERVIDOR' | 'DOMINIO' | 'EMAIL' | 'TAXAS' | 'OUTRO';

export const ROTULO_CATEGORIA: Record<CategoriaDespesa, string> = {
  SERVIDOR: 'Servidor',
  DOMINIO: 'Domínio',
  EMAIL: 'E-mail',
  TAXAS: 'Taxas e tarifas',
  OUTRO: 'Outro',
};

export interface CriarDespesaInput {
  /** AAAA-MM-DD */
  data: string;
  valor: number;
  descricao: string;
  categoria: CategoriaDespesa;
}

/** Uma mensalidade paga por um síndico: o que entrou na plataforma, com os dados do recibo. */
export interface RecebimentoDTO {
  id: string;
  numeroRecibo: string;
  pagoEm: string;
  condominio: { id: string; nome: string };
  sindico: { nome: string; email: string; documento: string | null };
  plano: string;
  periodo: string;
  valor: number;
  taxaAsaas: number | null;
  liquido: number | null;
  dias: number;
  vigenciaInicio: string | null;
  vigenciaFim: string | null;
  comprovanteUrl: string | null;
}

export interface DespesaDTO {
  id: string;
  data: string;
  valor: number;
  descricao: string;
  categoria: CategoriaDespesa;
}

export interface VendasDoMesDTO {
  mes: string;
  resumo: {
    entrou: number;
    taxasAsaas: number;
    despesas: number;
    resultado: number;
    pagamentos: number;
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
  valorCiclo: number;
  status: StatusAssinaturaAdmin;
  ativaAte: string | null;
  /** Negativo: já venceu. Nulo: ainda não há vigência. */
  diasRestantes: number | null;
}

export interface AssinaturasAdminDTO {
  resumo: {
    total: number;
    ativas: number;
    aguardandoPagamento: number;
    suspensas: number;
    vencidas: number;
  };
  itens: AssinaturaAdminDTO[];
}
