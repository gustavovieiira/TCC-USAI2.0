import { MovimentoExtratoDTO, PagamentoExtratoDTO } from './saques.types';

export type FiltroTipoExtrato = 'TODOS' | 'RECEBIMENTO' | 'COMISSAO' | 'SAQUE';
export type FiltroPeriodoExtrato = 'TUDO' | '7' | '30' | '90';

export const FILTROS_TIPO: { valor: FiltroTipoExtrato; rotulo: string }[] = [
  { valor: 'TODOS', rotulo: 'Tudo' },
  { valor: 'RECEBIMENTO', rotulo: 'Aluguéis recebidos' },
  { valor: 'COMISSAO', rotulo: 'Comissões' },
  { valor: 'SAQUE', rotulo: 'Saques' },
];

export const FILTROS_PERIODO: { valor: FiltroPeriodoExtrato; rotulo: string }[] = [
  { valor: 'TUDO', rotulo: 'Todo o período' },
  { valor: '7', rotulo: 'Últimos 7 dias' },
  { valor: '30', rotulo: 'Últimos 30 dias' },
  { valor: '90', rotulo: 'Últimos 90 dias' },
];

const DIA_EM_MS = 24 * 60 * 60 * 1000;

/** Verdadeiro quando a data cai dentro do período escolhido, contando a partir de "agora". */
export function dentroDoPeriodo(
  data: string,
  periodo: FiltroPeriodoExtrato,
  agora: Date = new Date(),
): boolean {
  if (periodo === 'TUDO') return true;
  const limite = agora.getTime() - Number(periodo) * DIA_EM_MS;
  return new Date(data).getTime() >= limite;
}

export function filtrarMovimentos(
  movimentos: MovimentoExtratoDTO[],
  tipo: FiltroTipoExtrato,
  periodo: FiltroPeriodoExtrato,
  agora: Date = new Date(),
): MovimentoExtratoDTO[] {
  return movimentos.filter(
    (m) => (tipo === 'TODOS' || m.tipo === tipo) && dentroDoPeriodo(m.data, periodo, agora),
  );
}

export function filtrarPagamentos(
  pagamentos: PagamentoExtratoDTO[],
  periodo: FiltroPeriodoExtrato,
  agora: Date = new Date(),
): PagamentoExtratoDTO[] {
  return pagamentos.filter((p) => dentroDoPeriodo(p.data, periodo, agora));
}

export interface TotaisDoFiltro {
  entrou: number;
  saiu: number;
}

/**
 * Quanto entrou e quanto saiu no que está na tela. Saque rejeitado não conta (o valor voltou
 * para o saldo), então o total bate com o que a pessoa realmente movimentou.
 */
export function totaisDosMovimentos(movimentos: MovimentoExtratoDTO[]): TotaisDoFiltro {
  let entrou = 0;
  let saiu = 0;
  for (const m of movimentos) {
    if (m.tipo === 'SAQUE') {
      if (m.status !== 'REJEITADO') saiu += Math.abs(m.valor);
    } else {
      entrou += Math.abs(m.valor);
    }
  }
  return { entrou, saiu };
}
