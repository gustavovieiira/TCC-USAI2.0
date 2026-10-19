import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CardClicavel } from '@/components/ui/CardClicavel';
import { Detalhe, DetalheModal } from '@/components/ui/DetalheModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { TextField } from '@/components/ui/TextField';
import { Spinner } from '@/components/ui/Spinner';
import { extractErrorMessage } from '@/lib/apiClient';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { buscarExtrato, solicitarSaque } from '@/features/saques/saques.api';
import { detalheMovimento, detalhePagamento } from '@/features/saques/detalhes';
import {
  ExtratoDTO,
  MovimentoExtratoDTO,
  PagamentoExtratoDTO,
} from '@/features/saques/saques.types';

type Aba = 'extrato' | 'saque';

export function SaquesPage() {
  const [aba, setAba] = useState<Aba>('extrato');
  const [extrato, setExtrato] = useState<ExtratoDTO | null>(null);
  const [erroExtrato, setErroExtrato] = useState<string | null>(null);

  function carregar() {
    buscarExtrato()
      .then(setExtrato)
      .catch((err) => setErroExtrato(extractErrorMessage(err)));
  }

  useEffect(carregar, []);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Saques e extrato</h1>
        <p className="text-sm text-ink-soft">
          Veja o que entrou, o que saiu e peça o saque do que você já recebeu em locações.
        </p>
      </div>

      <Resumo extrato={extrato} />
      {erroExtrato && <p className="text-sm text-carmim-700">{erroExtrato}</p>}

      <div className="flex gap-1 border border-paper-line bg-paper-surface p-1">
        {(
          [
            ['extrato', 'Extrato'],
            ['saque', 'Pedir saque'],
          ] as const
        ).map(([valor, rotulo]) => (
          <button
            key={valor}
            onClick={() => setAba(valor)}
            className={`flex-1 whitespace-nowrap px-3 py-2 text-sm font-semibold transition ${
              aba === valor ? 'notch-sm bg-ink text-ink-inverse' : 'text-ink-soft'
            }`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {aba === 'extrato' && <AbaExtrato extrato={extrato} semErro={!erroExtrato} />}
      {aba === 'saque' && (
        <AbaPedirSaque
          saldo={extrato?.resumo.saldoDisponivel ?? null}
          onSolicitado={() => {
            carregar();
            setAba('extrato');
          }}
        />
      )}
    </div>
  );
}

function Resumo({ extrato }: { extrato: ExtratoDTO | null }) {
  const resumo = extrato?.resumo;
  const mostrar = (valor: number | undefined) =>
    valor === undefined ? '···' : formatCurrency(valor);

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <p className="font-meta text-xs uppercase tracking-wide text-ink-faint">
          Disponível para sacar
        </p>
        <p className="mt-1 font-display text-3xl font-bold text-jade-500">
          {mostrar(resumo?.saldoDisponivel)}
        </p>
      </Card>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <p className="font-meta text-xs text-ink-faint">Já recebi</p>
          <p className="mt-1 font-display text-lg font-bold text-ink">
            {mostrar(resumo?.totalRecebido)}
          </p>
        </Card>
        <Card>
          <p className="font-meta text-xs text-ink-faint">Já saquei</p>
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

function AbaExtrato({ extrato, semErro }: { extrato: ExtratoDTO | null; semErro: boolean }) {
  const [detalhe, setDetalhe] = useState<Detalhe | null>(null);

  if (!extrato) {
    return semErro ? (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    ) : null;
  }

  return (
    <div className="flex flex-col gap-8">
      {detalhe && <DetalheModal detalhe={detalhe} onFechar={() => setDetalhe(null)} />}
      <section>
        <h2 className="mb-1 font-display font-semibold text-ink">Movimentações do seu saldo</h2>
        <p className="mb-3 text-sm text-ink-soft">
          <span className="font-semibold text-jade-700">Entrou</span> quando alguém pagou o aluguel
          de um item seu (já sem a taxa de 10% da plataforma).{' '}
          <span className="font-semibold text-carmim-700">Saiu</span> quando você pediu um saque.
        </p>
        {extrato.movimentos.length === 0 ? (
          <EmptyState
            title="Nenhuma movimentação ainda"
            description="Quando alguém pagar um aluguel de um item seu, o valor aparece aqui."
          />
        ) : (
          <div className="flex max-h-[32rem] flex-col gap-3 overflow-y-auto pr-1">
            {extrato.movimentos.map((movimento) => (
              <LinhaMovimento
                key={`${movimento.tipo}-${movimento.id}`}
                movimento={movimento}
                onAbrir={() => setDetalhe(detalheMovimento(movimento))}
              />
            ))}
          </div>
        )}
      </section>

      {extrato.pagamentos.length > 0 && (
        <section>
          <h2 className="mb-1 font-display font-semibold text-ink">O que você pagou</h2>
          <p className="mb-3 text-sm text-ink-soft">
            Aluguéis que você pagou como locatário. Isso não altera o seu saldo para saque.
          </p>
          <div className="flex max-h-[24rem] flex-col gap-3 overflow-y-auto pr-1">
            {extrato.pagamentos.map((pagamento) => (
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
  APROVADO: { texto: 'Aprovado — PIX a caminho', classe: 'bg-barro-100 text-barro-700' },
  PAGO: { texto: 'Pago na sua chave PIX', classe: 'bg-jade-100 text-jade-700' },
  REJEITADO: { texto: 'Rejeitado', classe: 'bg-carmim-100 text-carmim-700' },
} as const;

function Selo({ classe, children }: { classe: string; children: string }) {
  return (
    <span className={`notch-sm inline-flex items-center px-2.5 py-1 text-xs font-bold ${classe}`}>
      {children}
    </span>
  );
}

function LinhaMovimento({
  movimento,
  onAbrir,
}: {
  movimento: MovimentoExtratoDTO;
  onAbrir: () => void;
}) {
  const entrada = movimento.tipo === 'RECEBIMENTO';
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
          {entrada && movimento.contraparte && (
            <p className="text-sm text-ink-soft">Pago por {movimento.contraparte.nome}</p>
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

      {entrada && movimento.valorBruto !== undefined && (
        <p className="text-sm text-ink-soft">
          Aluguel de {formatCurrency(movimento.valorBruto)} − taxa da plataforma de{' '}
          {formatCurrency(movimento.taxa ?? 0)} = {formatCurrency(movimento.valor)} para você
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-ink-faint">{formatDateTime(movimento.data)}</span>
        {selo && <Selo classe={selo.classe}>{selo.texto}</Selo>}
        {entrada && <Selo classe="bg-jade-100 text-jade-700">Recebido</Selo>}
      </div>

      {rejeitado && movimento.motivo && (
        <p className="text-sm text-carmim-700">Motivo: {movimento.motivo}</p>
      )}
      {rejeitado && (
        <p className="text-sm text-ink-soft">O valor voltou para o seu saldo disponível.</p>
      )}
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
          Outra pessoa pagou esse período antes de você. A equipe USAI vai devolver o seu valor.
        </p>
      )}
    </CardClicavel>
  );
}

function AbaPedirSaque({
  saldo,
  onSolicitado,
}: {
  saldo: number | null;
  onSolicitado: () => void;
}) {
  const [valor, setValor] = useState('');
  const [chavePixUsada, setChavePixUsada] = useState('');
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErroForm(null);
    setIsLoading(true);

    try {
      await solicitarSaque({ valor: Number(valor), chavePixUsada });
      onSolicitado();
    } catch (err) {
      setErroForm(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <h2 className="mb-1 font-display font-semibold text-ink">Solicitar saque</h2>
      <p className="mb-4 text-sm text-ink-soft">
        Você pode sacar até {saldo === null ? '···' : formatCurrency(saldo)}. A equipe USAI analisa
        o pedido e paga na chave PIX informada.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <TextField
          label="Valor (R$)"
          name="valor"
          type="number"
          min="0.01"
          step="0.01"
          inputMode="decimal"
          required
          value={valor}
          onChange={(e) => setValor(e.target.value)}
        />
        <TextField
          label="Chave PIX"
          name="chavePixUsada"
          required
          placeholder="CPF, e-mail, telefone ou chave aleatória"
          value={chavePixUsada}
          onChange={(e) => setChavePixUsada(e.target.value)}
        />
        {erroForm && (
          <p role="alert" className="text-sm text-carmim-700">
            {erroForm}
          </p>
        )}
        <Button type="submit" isLoading={isLoading}>
          Solicitar
        </Button>
      </form>
    </Card>
  );
}
