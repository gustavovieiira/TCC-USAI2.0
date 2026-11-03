export interface Plano {
  codigo: string;
  nome: string;
  /** Quantos moradores o condomínio pode ter ativos neste plano. */
  limiteMoradores: number;
  /** Mensalidade em reais. */
  valorMensal: number;
  descricao: string;
  destaque: boolean;
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
    limiteMoradores: 30,
    valorMensal: 49,
    descricao: 'Para condomínios pequenos que querem começar a compartilhar.',
    destaque: false,
  },
  {
    codigo: 'CONDOMINIO',
    nome: 'Condomínio',
    limiteMoradores: 100,
    valorMensal: 99,
    descricao: 'O plano da maioria dos condomínios residenciais.',
    destaque: true,
  },
  {
    codigo: 'GRANDE',
    nome: 'Grande',
    limiteMoradores: 250,
    valorMensal: 179,
    descricao: 'Para condomínios grandes ou com várias torres.',
    destaque: false,
  },
];

export function buscarPlano(codigo: string): Plano | undefined {
  return PLANOS.find((plano) => plano.codigo === codigo);
}
