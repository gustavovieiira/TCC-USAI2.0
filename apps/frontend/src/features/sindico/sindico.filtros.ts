import { LocacaoAtivaDTO, MoradorDTO } from './sindico.types';

export type FiltroMoradores = 'TODOS' | 'EM_LOCACAO';
export type FiltroLocacoes = 'TODAS' | 'APROVADA' | 'PAGA' | 'EM_ANDAMENTO';

export const FILTROS_LOCACOES: { valor: FiltroLocacoes; rotulo: string }[] = [
  { valor: 'TODAS', rotulo: 'Todas' },
  { valor: 'APROVADA', rotulo: 'Aguardando pagamento' },
  { valor: 'PAGA', rotulo: 'Pagas, a retirar' },
  { valor: 'EM_ANDAMENTO', rotulo: 'Em andamento' },
];

/** Quem está envolvido (como dono ou como locatário) em alguma locação ativa agora. */
export function idsEmLocacao(locacoes: LocacaoAtivaDTO[]): Set<string> {
  const ids = new Set<string>();
  for (const locacao of locacoes) {
    ids.add(locacao.item.ownerId);
    ids.add(locacao.locatario.id);
  }
  return ids;
}

function contem(campo: string | null | undefined, termo: string): boolean {
  return !!campo && campo.toLowerCase().includes(termo);
}

export function filtrarMoradores(
  moradores: MoradorDTO[],
  busca: string,
  filtro: FiltroMoradores,
  emLocacao: Set<string>,
): MoradorDTO[] {
  const termo = busca.trim().toLowerCase();
  return moradores.filter(
    (m) =>
      (filtro === 'TODOS' || emLocacao.has(m.id)) &&
      (!termo || [m.nome, m.email, m.apartamento].some((campo) => contem(campo, termo))),
  );
}

export function filtrarLocacoes(
  locacoes: LocacaoAtivaDTO[],
  busca: string,
  filtro: FiltroLocacoes,
): LocacaoAtivaDTO[] {
  const termo = busca.trim().toLowerCase();
  return locacoes.filter(
    (l) =>
      (filtro === 'TODAS' || l.status === filtro) &&
      (!termo || contem(l.item.titulo, termo) || contem(l.locatario.nome, termo)),
  );
}

/** Quantas janelas desenhar e quantas acesas: no máximo 40, proporcional quando o plano é grande. */
export function janelasDoPredio(
  moradores: number,
  limite: number | null,
  maximo = 40,
): { total: number; acesas: number } {
  const total =
    limite && limite > 0 ? Math.min(limite, maximo) : Math.min(Math.max(moradores, 8), maximo);
  if (moradores <= 0) return { total, acesas: 0 };
  if (!limite || limite <= maximo) return { total, acesas: Math.min(moradores, total) };
  return { total, acesas: Math.min(total, Math.max(1, Math.round((moradores / limite) * total))) };
}
