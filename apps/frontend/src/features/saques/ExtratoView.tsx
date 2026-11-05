import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { CardClicavel } from '@/components/ui/CardClicavel';
import { Detalhe, DetalheModal } from '@/components/ui/DetalheModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { FiltroChips } from '@/components/ui/FiltroChips';
import { Spinner } from '@/components/ui/Spinner';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { detalheMovimento, detalhePagamento } from './detalhes';
import {
  FILTROS_PERIODO,
  FILTROS_TIPO,
  FiltroPeriodoExtrato,
  FiltroTipoExtrato,
  filtrarMovimentos,
  filtrarPagamentos,
  totaisDosMovimentos,
} from './extrato.filtros';
import { ExtratoDTO, MovimentoExtratoDTO, PagamentoExtratoDTO } from './saques.types';

/**
 * De quem é o extrato que está na tela: do próprio usuário ("você") ou, na visão do Admin, de
 * outra pessoa ("ele/ela"). Só muda o texto, os números e os cartões são os mesmos.
 */
export type Perspectiva = 'proprio' | 'terceiro';

const TEXTOS = {
  proprio: {
    saldo: 'Disponível para sacar',
    movimentos: 'Movimentações do seu saldo',
    entrou:
      'quando alguém pagou o aluguel de um item seu (já sem a taxa de 10%) ou quando você recebeu a comissão do condomínio.',
    saiu: 'quando você pediu um saque.',
    vazio: 'Quando alguém pagar um aluguel de um item seu, o valor aparece aqui.',
    pagou: 'O que você pagou',
    pagouDescricao:
      'Aluguéis que você pagou como locatário. Isso não altera o seu saldo para saque.',
    parteDele: 'para você',
    voltou: 'O valor voltou para o seu saldo disponível.',
  },
  terceiro: {
    saldo: 'Disponível para sacar',
    movimentos: 'Movimentações do saldo',
    entrou:
      'quando alguém pagou o aluguel de um item dele (já sem a taxa de 10%) ou quando ele recebeu a comissão do condomínio.',
    saiu: 'quando ele pediu um saque.',
    vazio: 'Esta conta ainda não tem movimentações.',
    pagou: 'O que pagou como locatário',
    pagouDescricao: 'Aluguéis pagos como locatário. Isso não altera o saldo para saque.',
    parteDele: 'para ele',
    voltou: 'O valor voltou para o saldo disponível.',
  },
} as const;

interface ExtratoViewProps {
  extrato: ExtratoDTO | null;
  /** Falso quando o carregamento falhou (não mostra o spinner pra sempre). */
  semErro?: boolean;
  perspectiva?: Perspectiva;
}

/** Resumo no topo + lista de movimentações + o que a pessoa pagou. Compartilhado: usuário e Admin. */
export function ExtratoView({
  extrato,
  semErro = true,
  perspectiva = 'proprio',
}: ExtratoViewProps) {
  return (
    <div className="flex flex-col gap-6">
      <ResumoExtrato extrato={extrato} perspectiva={perspectiva} />
      <ListaExtrato extrato={extrato} semErro={semErro} perspectiva={perspectiva} />
    </div>
  );
}

export function ResumoExtrato({
  extrato,
  perspectiva = 'proprio',
}: {
  extrato: ExtratoDTO | null;
  perspectiva?: Perspectiva;
}) {
  const resumo = extrato?.resumo;
  const mostrar = (valor: number | undefined) =>
    valor === undefined ? '···' : formatCurrency(valor);

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <p className="font-meta text-xs uppercase tracking-wide text-ink-faint">
          {TEXTOS[perspectiva].saldo}
        </p>
        <p className="mt-1 font-display text-3xl font-bold text-jade-500">
          {mostrar(resumo?.saldoDisponivel)}
        </p>
      </Card>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <p className="font-meta text-xs text-ink-faint">Aluguéis recebidos</p>
          <p className="mt-1 font-display text-lg font-bold text-ink">
            {mostrar(resumo?.totalRecebido)}
          </p>
        </Card>
        {!!resumo?.totalComissoes && (
          <Card>
            <p className="font-meta text-xs text-ink-faint">Comissões do condomínio</p>
            <p className="mt-1 font-display text-lg font-bold text-jade-700">
              {mostrar(resumo.totalComissoes)}
            </p>
          </Card>
        )}
        <Card>
          <p className="font-meta text-xs text-ink-faint">Já sacado</p>
          <p className="mt-1 font-display text-lg font-bold text-ink">
            {mostrar(resumo?.totalSacado)}
          </p>
        </Card>
        <Card>
          <p className="font-meta text-xs text-ink-faint">Aprovado, a caminho</p>
          <p className="mt-1 font-display text-lg font-bold text-barro-700">
            {mostrar(resumo?.aPagar)}
          </p>
        </Card>
        <Card>
          <p className="font-meta text-xs text-ink-faint">Em análise</p>
          <p className="mt-1 font-display text-lg font-bold text-mostarda-500">
            {mostrar(resumo?.emAnalise)}
          </p>
        </Card>
      </div>
    </div>
  );
}

export function ListaExtrato({
  extrato,
  semErro = true,
  perspectiva = 'proprio',
}: ExtratoViewProps) {
  const [detalhe, setDetalhe] = useState<Detalhe | null>(null);
  const [tipo, setTipo] = useState<FiltroTipoExtrato>('TODOS');
  const [periodo, setPeriodo] = useState<FiltroPeriodoExtrato>('TUDO');
  const t = TEXTOS[perspectiva];

  const movimentosDoPeriodo = useMemo(
    () => filtrarMovimentos(extrato?.movimentos ?? [], 'TODOS', periodo),
    [extrato, periodo],
  );
  const movimentos = useMemo(
    () => movimentosDoPeriodo.filter((m) => tipo === 'TODOS' || m.tipo === tipo),
    [movimentosDoPeriodo, tipo],
  );
  const pagamentos = useMemo(
    () => filtrarPagamentos(extrato?.pagamentos ?? [], periodo),
    [extrato, periodo],
  );
  const totais = useMemo(() => totaisDosMovimentos(movimentos), [movimentos]);

  if (!extrato) {
    return semErro ? (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    ) : null;
  }

  const temComissao = extrato.movimentos.some((m) => m.tipo === 'COMISSAO');
  const opcoesTipo = FILTROS_TIPO.filter((f) => f.valor !== 'COMISSAO' || temComissao).map((f) => ({
    valor: f.valor,
    rotulo: f.rotulo,
    total: movimentosDoPeriodo.filter((m) => f.valor === 'TODOS' || m.tipo === f.valor).length,
  }));
  const filtrando = tipo !== 'TODOS' || periodo !== 'TUDO';
  const limpar = () => {
    setTipo('TODOS');
    setPeriodo('TUDO');
  };

  return (
    <div className="flex flex-col gap-8">
      {detalhe && <DetalheModal detalhe={detalhe} onFechar={() => setDetalhe(null)} />}
      <section>
        <h2 className="mb-1 font-display font-semibold text-ink">{t.movimentos}</h2>
        <p className="mb-3 text-sm text-ink-soft">
          <span className="font-semibold text-jade-700">Entrou</span> {t.entrou}{' '}
          <span className="font-semibold text-carmim-700">Saiu</span> {t.saiu}
        </p>

        {extrato.movimentos.length > 0 && (
          <div className="mb-4 flex flex-col gap-3">
            <FiltroChips
              rotulo="Filtrar movimentações por tipo"
              valor={tipo}
              onChange={setTipo}
              opcoes={opcoesTipo}
            />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <label className="flex items-center gap-2 text-sm text-ink-soft">
                Período
                <select
                  value={periodo}
                  onChange={(e) => setPeriodo(e.target.value as FiltroPeriodoExtrato)}
                  className="notch-sm border border-paper-line bg-paper-surface px-3 py-1.5 text-sm font-semibold text-ink"
                >
                  {FILTROS_PERIODO.map((f) => (
                    <option key={f.valor} value={f.valor}>
                      {f.rotulo}
                    </option>
                  ))}
                </select>
              </label>
              {filtrando && (
                <button
                  type="button"
                  onClick={limpar}
                  className="text-sm font-semibold text-fachada-coral-texto underline underline-offset-2 hover:no-underline"
                >
                  Limpar filtros
                </button>
              )}
            </div>
            {filtrando && movimentos.length > 0 && (
              <p className="text-sm text-ink-soft" aria-live="polite">
                {movimentos.length === 1 ? '1 movimentação' : `${movimentos.length} movimentações`}
                {': entrou '}
                <span className="font-semibold text-jade-700">{formatCurrency(totais.entrou)}</span>
                {', saiu '}
                <span className="font-semibold text-carmim-700">{formatCurrency(totais.saiu)}</span>
              </p>
            )}
          </div>
        )}

        {extrato.movimentos.length === 0 ? (
          <EmptyState title="Nenhuma movimentação ainda" description={t.vazio} />
        ) : movimentos.length === 0 ? (
          <EmptyState
            title="Nada com esses filtros"
            description="Nenhuma movimentação nesse tipo e período. Mude os filtros acima."
          />
        ) : (
          <div className="flex max-h-[32rem] flex-col gap-3 overflow-y-auto pr-1">
            {movimentos.map((movimento) => (
              <LinhaMovimento
                key={`${movimento.tipo}-${movimento.id}`}
                movimento={movimento}
                perspectiva={perspectiva}
                onAbrir={() => setDetalhe(detalheMovimento(movimento))}
              />
            ))}
          </div>
        )}
      </section>

      {pagamentos.length > 0 && (
        <section>
          <h2 className="mb-1 font-display font-semibold text-ink">{t.pagou}</h2>
          <p className="mb-3 text-sm text-ink-soft">{t.pagouDescricao}</p>
          <div className="flex max-h-[24rem] flex-col gap-3 overflow-y-auto pr-1">
            {pagamentos.map((pagamento) => (
              <LinhaPagamento
                key={pagamento.id}
                pagamento={pagamento}
                onAbrir={() => setDetalhe(detalhePagamento(pagamento))}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

const ROTULO_STATUS_SAQUE = {
  EM_ANALISE: { texto: 'Em análise', classe: 'bg-mostarda-100 text-mostarda-700' },
  APROVADO: { texto: 'Aprovado, PIX a caminho', classe: 'bg-barro-100 text-barro-700' },
  PAGO: { texto: 'PIX enviado', classe: 'bg-jade-100 text-jade-700' },
  REJEITADO: { texto: 'Rejeitado', classe: 'bg-carmim-100 text-carmim-700' },
} as const;

function Selo({ classe, children }: { classe: string; children: string }) {
  return (
    <span className={`notch-sm inline-flex items-center px-2.5 py-1 text-xs font-bold ${classe}`}>
      {children}
    </span>
  );
}

function percentual(valor: number | undefined): string {
  return valor === undefined ? '' : `${String(valor).replace('.', ',')}%`;
}

function LinhaMovimento({
  movimento,
  perspectiva,
  onAbrir,
}: {
  movimento: MovimentoExtratoDTO;
  perspectiva: Perspectiva;
  onAbrir: () => void;
}) {
  const comissao = movimento.tipo === 'COMISSAO';
  const entrada = movimento.tipo === 'RECEBIMENTO' || comissao;
  const rejeitado = movimento.status === 'REJEITADO';
  const selo =
    movimento.tipo === 'SAQUE' && movimento.status !== 'CONFIRMADO'
      ? ROTULO_STATUS_SAQUE[movimento.status]
      : null;

  return (
    <CardClicavel onAbrir={onAbrir} className="flex flex-col gap-1">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display font-semibold text-ink">{movimento.descricao}</p>
          {movimento.tipo === 'RECEBIMENTO' && movimento.contraparte && (
            <p className="text-sm text-ink-soft">Pago por {movimento.contraparte.nome}</p>
          )}
          {comissao && movimento.origem && (
            <p className="text-sm text-ink-soft">
              Aluguel pago por {movimento.origem.locatario.nome} a {movimento.origem.dono.nome}
            </p>
          )}
          {!entrada && movimento.chavePix && (
            <p className="text-sm text-ink-soft">Para a chave PIX {movimento.chavePix}</p>
          )}
        </div>
        <p
          className={`shrink-0 font-display text-lg font-bold ${
            entrada
              ? 'text-jade-700'
              : rejeitado
                ? 'text-ink-faint line-through'
                : 'text-carmim-700'
          }`}
        >
          {entrada ? '+' : '−'} {formatCurrency(Math.abs(movimento.valor))}
        </p>
      </div>

      {movimento.tipo === 'RECEBIMENTO' && movimento.valorBruto !== undefined && (
        <p className="text-sm text-ink-soft">
          Aluguel de {formatCurrency(movimento.valorBruto)} − taxa{' '}
          {movimento.taxaPercentual !== undefined && `(${percentual(movimento.taxaPercentual)}) `}
          de {formatCurrency(movimento.taxa ?? 0)} = {formatCurrency(movimento.valor)}{' '}
          {TEXTOS[perspectiva].parteDele}
        </p>
      )}

      {comissao && movimento.valorBruto !== undefined && (
        <p className="text-sm text-ink-soft">
          Taxa{' '}
          {movimento.taxaPercentual !== undefined && `de ${percentual(movimento.taxaPercentual)} `}
          sobre {formatCurrency(movimento.valorBruto)} = {formatCurrency(movimento.taxa ?? 0)}
          {movimento.divididoEntre && movimento.divididoEntre > 1
            ? `, dividida entre ${movimento.divididoEntre} síndicos`
            : ''}
          {' → '}
          {perspectiva === 'proprio' ? 'sua parte' : 'parte dele'}:{' '}
          {formatCurrency(movimento.valor)}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-ink-faint">{formatDateTime(movimento.data)}</span>
        {selo && <Selo classe={selo.classe}>{selo.texto}</Selo>}
        {movimento.tipo === 'RECEBIMENTO' && (
          <Selo classe="bg-jade-100 text-jade-700">Recebido</Selo>
        )}
        {comissao && <Selo classe="bg-jade-100 text-jade-700">Comissão do condomínio</Selo>}
      </div>

      {rejeitado && movimento.motivo && (
        <p className="text-sm text-carmim-700">Motivo: {movimento.motivo}</p>
      )}
      {rejeitado && <p className="text-sm text-ink-soft">{TEXTOS[perspectiva].voltou}</p>}
      {movimento.status === 'PAGO' && movimento.pagoEm && (
        <p className="text-sm text-ink-soft">PIX enviado em {formatDateTime(movimento.pagoEm)}</p>
      )}
    </CardClicavel>
  );
}

function LinhaPagamento({
  pagamento,
  onAbrir,
}: {
  pagamento: PagamentoExtratoDTO;
  onAbrir: () => void;
}) {
  return (
    <CardClicavel onAbrir={onAbrir} className="flex flex-col gap-1">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display font-semibold text-ink">{pagamento.descricao}</p>
          {pagamento.contraparte && (
            <p className="text-sm text-ink-soft">Pago a {pagamento.contraparte.nome}</p>
          )}
        </div>
        <p className="shrink-0 font-display text-lg font-bold text-carmim-700">
          − {formatCurrency(pagamento.valor)}
        </p>
      </div>

      {pagamento.taxa !== undefined && pagamento.repasseDono !== undefined && (
        <p className="text-sm text-ink-soft">
          Do valor pago: {formatCurrency(pagamento.repasseDono)} foi para{' '}
          {pagamento.contraparte?.nome ?? 'o dono'} e {formatCurrency(pagamento.taxa)}
          {pagamento.taxaPercentual !== undefined &&
            ` (${percentual(pagamento.taxaPercentual)})`}{' '}
          foi taxa do condomínio.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-ink-faint">{formatDateTime(pagamento.data)}</span>
        {pagamento.status === 'EM_REEMBOLSO' ? (
          <Selo classe="bg-mostarda-100 text-mostarda-700">Aguardando reembolso</Selo>
        ) : (
          <Selo classe="bg-jade-100 text-jade-700">Pagamento confirmado</Selo>
        )}
      </div>
      {pagamento.status === 'EM_REEMBOLSO' && (
        <p className="text-sm text-ink-soft">
          Outra pessoa pagou esse período antes. A equipe USAI vai devolver o valor.
        </p>
      )}
    </CardClicavel>
  );
}
