import { SaqueDTO } from '@/features/saques/saques.types';
import { CondominioAdminDTO } from './admin.types';

export type FiltroHistorico = 'TODOS' | 'PAGO' | 'REJEITADO';
export type FiltroCondominios = 'TODOS' | 'ATIVOS' | 'INATIVOS';

function contem(campo: string | null | undefined, termo: string): boolean {
  return !!campo && campo.toLowerCase().includes(termo);
}

/** Busca na fila de saques por nome de quem pediu, condomínio ou chave PIX. */
export function buscarSaques(saques: SaqueDTO[], busca: string): SaqueDTO[] {
  const termo = busca.trim().toLowerCase();
  if (!termo) return saques;
  return saques.filter(
    (s) =>
      contem(s.solicitanteNome, termo) ||
      contem(s.solicitanteCondominio, termo) ||
      contem(s.chavePixUsada, termo),
  );
}

export function filtrarHistorico(
  historico: SaqueDTO[],
  filtro: FiltroHistorico,
  busca: string,
): SaqueDTO[] {
  return buscarSaques(historico, busca).filter((s) => filtro === 'TODOS' || s.status === filtro);
}

export function filtrarCondominios(
  condominios: CondominioAdminDTO[],
  busca: string,
  filtro: FiltroCondominios,
): CondominioAdminDTO[] {
  const termo = busca.trim().toLowerCase();
  return condominios.filter(
    (c) =>
      (filtro === 'TODOS' || (filtro === 'ATIVOS' ? c.ativo : !c.ativo)) &&
      (!termo || contem(c.nome, termo) || contem(c.linkSlug, termo)),
  );
}
