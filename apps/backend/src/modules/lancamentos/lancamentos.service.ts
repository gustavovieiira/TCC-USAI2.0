import { Item, Locacao, Prisma, User } from '@prisma/client';
import type { OrigemDTO } from '@/modules/saques/saques.types';

/** Tipos de lançamento do livro-razão (ver `model Lancamento` em schema.prisma). */
export const TIPO_ALUGUEL_RECEBIDO = 'ALUGUEL_RECEBIDO';
export const TIPO_COMISSAO_CONDOMINIO = 'COMISSAO_CONDOMINIO';
export const TIPO_TAXA_PLATAFORMA = 'TAXA_PLATAFORMA';
export const TIPO_ALUGUEL_PAGO = 'ALUGUEL_PAGO';

/** O que o extrato precisa saber da locação de origem de um lançamento. */
export const INCLUIR_ORIGEM = {
  locacao: { include: { item: { include: { owner: true } }, locatario: true } },
} as const;

export type LocacaoDeOrigem = Locacao & { item: Item & { owner: User }; locatario: User };

export function toOrigemDTO(locacao: LocacaoDeOrigem): OrigemDTO {
  return {
    locacaoId: locacao.id,
    itemTitulo: locacao.item.titulo,
    dono: { id: locacao.item.owner.id, nome: locacao.item.owner.nome },
    locatario: { id: locacao.locatario.id, nome: locacao.locatario.nome },
  };
}

const MAX_TITULO_NA_DESCRICAO = 80;

function formatarValor(valor: number): string {
  return `R$ ${valor.toFixed(2).replace('.', ',')}`;
}

function arredondarCentavos(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function tituloCurto(titulo: string): string {
  return titulo.length > MAX_TITULO_NA_DESCRICAO
    ? `${titulo.slice(0, MAX_TITULO_NA_DESCRICAO - 1)}…`
    : titulo;
}

/**
 * Divide a comissão do condomínio em partes iguais entre `quantidade` síndicos, em centavos: o que
 * sobrar da divisão vai, um centavo por vez, pros primeiros, assim a soma das partes é SEMPRE a
 * taxa inteira (nenhum centavo some nem aparece).
 */
export function dividirTaxa(taxa: number, quantidade: number): number[] {
  const centavos = Math.round(taxa * 100);
  const base = Math.floor(centavos / quantidade);
  const resto = centavos - base * quantidade;

  return Array.from({ length: quantidade }, (_, i) => (base + (i < resto ? 1 : 0)) / 100);
}

export interface PagamentoConfirmado {
  locacaoId: string;
  itemTitulo: string;
  condominioId: string;
  donoId: string;
  locatarioId: string;
  /** O que o locatário pagou. */
  valorBruto: number;
  /** Comissão do condomínio (0 quando o condomínio não negociou comissão). */
  taxa: number;
  /** Taxa cobrada pelo Asaas neste PIX (sai do que o dono recebe). */
  taxaAsaas: number;
  /** Percentual de comissão aplicado (o do condomínio no momento do pagamento). */
  percentualComissao: number;
  /** O que sobra pro dono: valor pago menos a taxa do Asaas e a comissão. */
  valorLiquido: number;
}

export interface ResultadoRegistro {
  /** Quanto cada síndico recebeu de comissão (vazio quando o condomínio não tem síndico ativo). */
  comissoes: { userId: string; valor: number }[];
  /** Quanto ficou com a USAI (a comissão inteira, quando há comissão e não há síndico). */
  retidoPelaPlataforma: number;
}

/**
 * Registra no livro-razão tudo o que um pagamento confirmado movimenta, dentro da MESMA transação
 * que passa a locação pra PAGA, ou os lançamentos existem todos, ou nenhum:
 * - o dono recebe o valor líquido (aluguel menos a taxa do Asaas e a comissão do condomínio, se houver);
 * - a comissão (só existe se o Admin definiu um percentual para o condomínio) vai pra conta dos síndicos
 *   ativos (divididos igualmente); sem síndico ativo, fica com a plataforma;
 * - o locatário ganha um registro informativo do que pagou (não mexe no saldo dele).
 * Cada lançamento guarda a origem (locação), a base de cálculo e o percentual aplicado.
 */
export async function registrarPagamentoConfirmado(
  tx: Prisma.TransactionClient,
  pagamento: PagamentoConfirmado,
): Promise<ResultadoRegistro> {
  const titulo = tituloCurto(pagamento.itemTitulo);
  const comum = {
    locacaoId: pagamento.locacaoId,
    condominioId: pagamento.condominioId,
    baseCalculo: pagamento.valorBruto,
    taxaPercentual: pagamento.percentualComissao,
  };

  const sindicos = await tx.user.findMany({
    where: { papel: 'SINDICO', ativo: true, condominioId: pagamento.condominioId },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });

  const lancamentos: Prisma.LancamentoCreateManyInput[] = [
    {
      ...comum,
      userId: pagamento.donoId,
      tipo: TIPO_ALUGUEL_RECEBIDO,
      valor: pagamento.valorLiquido,
      descricao:
        pagamento.taxaAsaas > 0
          ? `Aluguel de "${titulo}" (descontada a taxa do Asaas de ${formatarValor(pagamento.taxaAsaas)})`
          : `Aluguel de "${titulo}"`,
    },
    {
      ...comum,
      userId: pagamento.locatarioId,
      tipo: TIPO_ALUGUEL_PAGO,
      valor: pagamento.valorBruto,
      afetaSaldo: false,
      descricao: `Aluguel de "${titulo}"`,
    },
  ];

  const comissoes: ResultadoRegistro['comissoes'] = [];
  let retidoPelaPlataforma = 0;

  // Sem comissão negociada (percentual 0), nada vai para o condomínio nem para a plataforma.
  if (pagamento.taxa > 0) {
    if (sindicos.length > 0) {
      const partes = dividirTaxa(pagamento.taxa, sindicos.length);

      sindicos.forEach((sindico, i) => {
        comissoes.push({ userId: sindico.id, valor: partes[i] });
        lancamentos.push({
          ...comum,
          userId: sindico.id,
          tipo: TIPO_COMISSAO_CONDOMINIO,
          valor: partes[i],
          divididoEntre: sindicos.length,
          descricao: `Comissão do condomínio sobre o aluguel de "${titulo}"`,
        });
      });
    } else {
      retidoPelaPlataforma = arredondarCentavos(pagamento.taxa);
      lancamentos.push({
        ...comum,
        userId: null,
        tipo: TIPO_TAXA_PLATAFORMA,
        valor: retidoPelaPlataforma,
        descricao: `Comissão sobre o aluguel de "${titulo}" (condomínio sem síndico ativo)`,
      });
    }
  }

  await tx.lancamento.createMany({ data: lancamentos });

  return { comissoes, retidoPelaPlataforma };
}
