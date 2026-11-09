import { ItemDTO, TipoAnuncio, UnidadeCobranca } from './itens.types';

type DadosDoAnuncio = Pick<ItemDTO, 'tipo' | 'unidadeCobranca'>;

/** Anúncios antigos (sem o campo `tipo`) são itens cobrados por dia. */
export function tipoDe(anuncio: DadosDoAnuncio): TipoAnuncio {
  return anuncio.tipo ?? 'ITEM';
}

export function ehServico(anuncio: DadosDoAnuncio): boolean {
  return tipoDe(anuncio) === 'SERVICO';
}

export function unidadeDe(anuncio: DadosDoAnuncio): UnidadeCobranca {
  return anuncio.unidadeCobranca ?? 'DIA';
}

/** O que aparece depois do preço: "/ dia" (item), "/ hora" ou "por serviço". */
export function sufixoDoValor(anuncio: DadosDoAnuncio): string {
  const unidade = unidadeDe(anuncio);
  if (unidade === 'HORA') return '/ hora';
  if (unidade === 'SERVICO') return 'por serviço';
  return '/ dia';
}

/** Rótulo do campo de valor nos formulários. */
export function rotuloDoCampoDeValor(tipo: TipoAnuncio, unidade: UnidadeCobranca): string {
  if (tipo === 'ITEM') return 'Valor por diária (R$)';
  return unidade === 'HORA' ? 'Valor por hora (R$)' : 'Valor do serviço (R$)';
}

export const ROTULO_UNIDADE_DO_SERVICO: Record<'HORA' | 'SERVICO', string> = {
  HORA: 'Por hora',
  SERVICO: 'Por serviço (preço fechado)',
};

/** Serviço é combinado direto entre os moradores: só pede um valor maior que zero. */
export const MENSAGEM_VALOR_SERVICO = 'Informe um valor maior que zero.';
