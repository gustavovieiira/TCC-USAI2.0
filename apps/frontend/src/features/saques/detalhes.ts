import { Detalhe } from '@/components/ui/DetalheModal';
import { formatCurrency, formatDate, formatDateHora } from '@/lib/format';
import { MovimentoExtratoDTO, PagamentoExtratoDTO, SaqueDTO, StatusSaque } from './saques.types';

const ROTULO_STATUS_SAQUE: Record<StatusSaque, string> = {
  PENDENTE: 'Em análise',
  APROVADO: 'Aprovado — aguardando o PIX',
  PAGO: 'Pago',
  REJEITADO: 'Rejeitado',
};

const ROTULO_STATUS_MOVIMENTO: Record<MovimentoExtratoDTO['status'], string> = {
  CONFIRMADO: 'Recebido',
  EM_ANALISE: ROTULO_STATUS_SAQUE.PENDENTE,
  APROVADO: ROTULO_STATUS_SAQUE.APROVADO,
  PAGO: ROTULO_STATUS_SAQUE.PAGO,
  REJEITADO: ROTULO_STATUS_SAQUE.REJEITADO,
};

function periodo(inicio: string, fim: string): string {
  return `${formatDate(inicio)} a ${formatDate(fim)}`;
}

/** Visão do Admin USAI: chave PIX completa (é o que ele precisa pra transferir). */
export function detalheSaqueAdmin(saque: SaqueDTO): Detalhe {
  const linhas = [
    { rotulo: 'Solicitante', valor: saque.solicitanteNome ?? '—' },
    ...(saque.solicitanteCondominio
      ? [{ rotulo: 'Condomínio', valor: saque.solicitanteCondominio }]
      : []),
    { rotulo: 'Valor', valor: formatCurrency(saque.valor) },
    { rotulo: 'Chave PIX', valor: saque.chavePixUsada },
    { rotulo: 'Situação', valor: ROTULO_STATUS_SAQUE[saque.status] },
    { rotulo: 'Pedido em', valor: formatDateHora(saque.createdAt) },
    ...(saque.processadoEm
      ? [{ rotulo: 'Decidido em', valor: formatDateHora(saque.processadoEm) }]
      : []),
    ...(saque.pagoEm ? [{ rotulo: 'PIX enviado em', valor: formatDateHora(saque.pagoEm) }] : []),
    ...(saque.motivoRejeicao
      ? [{ rotulo: 'Motivo da rejeição', valor: saque.motivoRejeicao }]
      : []),
  ];

  return {
    titulo: saque.status === 'PAGO' ? 'Recibo de pagamento de saque' : 'Detalhes do saque',
    subtitulo: saque.solicitanteNome,
    linhas,
    protocolo: saque.id,
    recibo: saque.status === 'PAGO',
  };
}

/** Linha do extrato do próprio usuário: aluguel recebido ou saque (chave PIX já vem mascarada). */
export function detalheMovimento(movimento: MovimentoExtratoDTO): Detalhe {
  if (movimento.tipo === 'RECEBIMENTO') {
    return {
      titulo: 'Recibo de aluguel recebido',
      subtitulo: movimento.descricao,
      linhas: [
        { rotulo: 'Pago por', valor: movimento.contraparte?.nome ?? '—' },
        ...(movimento.periodo
          ? [
              {
                rotulo: 'Período do aluguel',
                valor: periodo(movimento.periodo.inicio, movimento.periodo.fim),
              },
            ]
          : []),
        { rotulo: 'Valor do aluguel', valor: formatCurrency(movimento.valorBruto ?? 0) },
        { rotulo: 'Taxa da plataforma', valor: `− ${formatCurrency(movimento.taxa ?? 0)}` },
        { rotulo: 'Você recebeu', valor: formatCurrency(movimento.valor) },
        { rotulo: 'Pagamento confirmado em', valor: formatDateHora(movimento.data) },
      ],
      protocolo: movimento.id,
      recibo: true,
    };
  }

  const pago = movimento.status === 'PAGO';

  return {
    titulo: pago ? 'Recibo de saque' : 'Detalhes do saque',
    subtitulo: movimento.descricao,
    linhas: [
      { rotulo: 'Valor', valor: formatCurrency(Math.abs(movimento.valor)) },
      { rotulo: 'Chave PIX', valor: movimento.chavePix ?? '—' },
      { rotulo: 'Situação', valor: ROTULO_STATUS_MOVIMENTO[movimento.status] },
      { rotulo: 'Pedido em', valor: formatDateHora(movimento.data) },
      ...(movimento.processadoEm
        ? [{ rotulo: 'Decidido em', valor: formatDateHora(movimento.processadoEm) }]
        : []),
      ...(movimento.pagoEm
        ? [{ rotulo: 'PIX enviado em', valor: formatDateHora(movimento.pagoEm) }]
        : []),
      ...(movimento.motivo ? [{ rotulo: 'Motivo da rejeição', valor: movimento.motivo }] : []),
    ],
    protocolo: movimento.id,
    recibo: pago,
  };
}

/** Aluguel que o usuário pagou como locatário. */
export function detalhePagamento(pagamento: PagamentoExtratoDTO): Detalhe {
  const confirmado = pagamento.status === 'CONFIRMADO';

  return {
    titulo: confirmado ? 'Recibo de aluguel pago' : 'Detalhes do pagamento',
    subtitulo: pagamento.descricao,
    linhas: [
      { rotulo: 'Pago a', valor: pagamento.contraparte?.nome ?? '—' },
      {
        rotulo: 'Período do aluguel',
        valor: periodo(pagamento.periodo.inicio, pagamento.periodo.fim),
      },
      { rotulo: 'Valor pago', valor: formatCurrency(pagamento.valor) },
      { rotulo: 'Pagamento confirmado em', valor: formatDateHora(pagamento.data) },
      {
        rotulo: 'Situação',
        valor: confirmado
          ? 'Pagamento confirmado'
          : 'Aguardando reembolso (outra pessoa pagou antes)',
      },
    ],
    protocolo: pagamento.id,
    recibo: confirmado,
  };
}
