import { Detalhe } from '@/components/ui/DetalheModal';
import { formatCurrency, formatDate, formatDateHora } from '@/lib/format';
import { AssinaturaAdminDTO, RecebimentoDTO } from './plataforma.types';

// ------------------------------------------------------------------ meses (AAAA-MM)

/** O mês de hoje no horário de Brasília, AAAA-MM. */
export function mesAtualBr(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 7);
}

/** Anda `delta` meses a partir de um AAAA-MM (-1 = mês anterior, +1 = seguinte), virando o ano quando preciso. */
export function deslocarMes(mes: string, delta: number): string {
  const [ano, numero] = mes.split('-').map(Number);
  const total = ano * 12 + (numero - 1) + delta;
  const novoAno = Math.floor(total / 12);
  const novoMes = (total % 12) + 1;
  return `${novoAno}-${String(novoMes).padStart(2, '0')}`;
}

/** "2026-11" vira "novembro de 2026". */
export function rotuloDoMes(mes: string): string {
  const [ano, numero] = mes.split('-').map(Number);
  return new Date(Date.UTC(ano, numero - 1, 1)).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

// ------------------------------------------------------------------ assinaturas

export type FiltroAssinaturas =
  'TODAS' | 'VENCE_7' | 'VENCE_15' | 'VENCE_30' | 'VENCIDAS' | 'AGUARDANDO';

/** Os filtros da lista de assinaturas, na ordem em que aparecem na tela. */
export const OPCOES_FILTRO_ASSINATURAS: { valor: FiltroAssinaturas; rotulo: string }[] = [
  { valor: 'TODAS', rotulo: 'Todas' },
  { valor: 'VENCE_7', rotulo: 'Vencem em 7 dias' },
  { valor: 'VENCE_15', rotulo: 'Em 15 dias' },
  { valor: 'VENCE_30', rotulo: 'Em 30 dias' },
  { valor: 'VENCIDAS', rotulo: 'Vencidas' },
  { valor: 'AGUARDANDO', rotulo: 'Aguardando pagamento' },
];

function semAcento(texto: string): string {
  return texto.normalize('NFD').replaceAll(/[̀-ͯ]/g, '').toLowerCase();
}

function venceEm(item: AssinaturaAdminDTO, dias: number): boolean {
  return (
    item.status === 'ATIVA' &&
    item.diasRestantes !== null &&
    item.diasRestantes >= 0 &&
    item.diasRestantes <= dias
  );
}

/** Já passou da data (a suspensa também): o condomínio está sem o plano em dia. */
function estaVencida(item: AssinaturaAdminDTO): boolean {
  return (
    item.status === 'SUSPENSA' ||
    (item.status === 'ATIVA' && item.diasRestantes !== null && item.diasRestantes < 0)
  );
}

export function filtrarAssinaturas(
  itens: AssinaturaAdminDTO[],
  filtro: FiltroAssinaturas,
  busca = '',
): AssinaturaAdminDTO[] {
  const termo = semAcento(busca.trim());

  return itens.filter((item) => {
    const passa =
      filtro === 'TODAS' ||
      (filtro === 'VENCE_7' && venceEm(item, 7)) ||
      (filtro === 'VENCE_15' && venceEm(item, 15)) ||
      (filtro === 'VENCE_30' && venceEm(item, 30)) ||
      (filtro === 'VENCIDAS' && estaVencida(item)) ||
      (filtro === 'AGUARDANDO' && item.status === 'AGUARDANDO_PAGAMENTO');
    if (!passa) return false;
    if (!termo) return true;
    return semAcento(`${item.condominio.nome} ${item.sindico.nome} ${item.sindico.email}`).includes(
      termo,
    );
  });
}

export type TomSituacao = 'ok' | 'atencao' | 'perigo' | 'neutro';

/** O que o Admin lê na linha da assinatura: "Vence em 3 dias", "Vencida há 2 dias"... com a cor que combina. */
export function situacaoDaAssinatura(item: AssinaturaAdminDTO): {
  rotulo: string;
  tom: TomSituacao;
} {
  if (item.status === 'AGUARDANDO_PAGAMENTO') {
    return { rotulo: 'Aguardando o 1º pagamento', tom: 'neutro' };
  }

  const dias = item.diasRestantes;
  if (item.status === 'SUSPENSA') {
    return {
      rotulo:
        dias !== null && dias < 0
          ? `Suspensa, venceu há ${-dias} dia${-dias === 1 ? '' : 's'}`
          : 'Suspensa',
      tom: 'perigo',
    };
  }
  if (dias === null) return { rotulo: 'Ativa', tom: 'ok' };
  if (dias < 0) {
    return { rotulo: `Vencida há ${-dias} dia${-dias === 1 ? '' : 's'}`, tom: 'perigo' };
  }
  if (dias === 0) return { rotulo: 'Vence hoje', tom: 'perigo' };
  if (dias <= 7) return { rotulo: `Vence em ${dias} dia${dias === 1 ? '' : 's'}`, tom: 'atencao' };
  return { rotulo: `Vence em ${dias} dias`, tom: 'ok' };
}

// ------------------------------------------------------------------ recibo

/** O recibo de uma mensalidade paga por um síndico (o mesmo número do e-mail que ele recebeu). */
export function detalheRecebimento(r: RecebimentoDTO): Detalhe {
  return {
    titulo: 'Recibo de assinatura da plataforma',
    subtitulo: `${r.plano} (${r.periodo}) - ${r.condominio.nome}`,
    linhas: [
      { rotulo: 'Recibo', valor: r.numeroRecibo },
      { rotulo: 'Condomínio', valor: r.condominio.nome },
      { rotulo: 'Síndico', valor: r.sindico.nome },
      ...(r.sindico.documento ? [{ rotulo: 'Documento', valor: r.sindico.documento }] : []),
      { rotulo: 'Plano', valor: `${r.plano} (${r.periodo})` },
      ...(r.vigenciaInicio && r.vigenciaFim
        ? [
            {
              rotulo: 'Vigência paga',
              valor: `${formatDate(r.vigenciaInicio)} a ${formatDate(r.vigenciaFim)}`,
            },
          ]
        : [{ rotulo: 'Dias liberados', valor: `${r.dias} dias` }]),
      { rotulo: 'Forma de pagamento', valor: 'PIX' },
      { rotulo: 'Valor pago', valor: formatCurrency(r.valor) },
      ...(r.taxaAsaas !== null && r.liquido !== null
        ? [
            { rotulo: 'Taxa do PIX (Asaas)', valor: `− ${formatCurrency(r.taxaAsaas)}` },
            { rotulo: 'Líquido para a plataforma', valor: formatCurrency(r.liquido) },
          ]
        : []),
      { rotulo: 'Pagamento recebido em', valor: formatDateHora(r.pagoEm) },
    ],
    protocolo: r.numeroRecibo,
    recibo: true,
  };
}
