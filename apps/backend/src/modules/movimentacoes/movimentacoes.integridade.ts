import { createHash } from 'crypto';

/**
 * Ordem por unidade de código (a mesma do `sort()` padrão), explícita pra não depender de locale:
 * a impressão digital de um documento já assinado nunca pode mudar.
 */
const porPontoDeCodigo = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** JSON com as chaves em ordem fixa: o mesmo conteúdo sempre gera a mesma impressão digital. */
export function canonicalizar(valor: unknown): string {
  if (valor === null || typeof valor !== 'object') {
    return JSON.stringify(valor ?? null);
  }
  if (Array.isArray(valor)) {
    return `[${valor.map(canonicalizar).join(',')}]`;
  }

  const objeto = valor as Record<string, unknown>;
  const chaves = Object.keys(objeto)
    .filter((chave) => objeto[chave] !== undefined)
    .sort(porPontoDeCodigo);

  return `{${chaves.map((chave) => `${JSON.stringify(chave)}:${canonicalizar(objeto[chave])}`).join(',')}}`;
}

export function sha256(texto: string): string {
  return createHash('sha256').update(texto).digest('hex');
}

/** Tudo que compõe o documento concluído — qualquer alteração silenciosa muda a impressão digital. */
export interface BaseDoHash {
  numero: number;
  tipo: string;
  locacaoId: string;
  entreguePorId: string;
  recebidoPorId: string;
  ocorridoEm: string;
  estadoConservacao: string;
  acessorios: unknown;
  observacoes: string | null;
  snapshot: unknown;
  termo: { id: string; versao: number };
  aceite: { userId: string; aceitoEm: string; declaracoes: unknown; assinatura: string };
}

export function calcularHashIntegridade(base: BaseDoHash): string {
  return sha256(canonicalizar(base));
}

/** Assinatura eletrônica simples do aceite: liga a pessoa, o termo (versão) e as declarações marcadas. */
export function calcularAssinatura(dados: {
  movimentacaoId: string;
  userId: string;
  termoId: string;
  versao: number;
  aceitoEm: string;
  declaracoes: string[];
}): string {
  return sha256(
    canonicalizar({ ...dados, declaracoes: [...dados.declaracoes].sort(porPontoDeCodigo) }),
  );
}
