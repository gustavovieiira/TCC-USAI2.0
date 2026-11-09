import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CardClicavel } from '@/components/ui/CardClicavel';
import { Detalhe, DetalheModal } from '@/components/ui/DetalheModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { FiltroChips } from '@/components/ui/FiltroChips';
import { ListaRolavel } from '@/components/ui/ListaRolavel';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { TextField } from '@/components/ui/TextField';
import { extractErrorMessage } from '@/lib/apiClient';
import { formatCurrency, formatDate, formatDateHora } from '@/lib/format';
import {
  buscarVendasDoMes,
  criarDespesa,
  listarAssinaturasAdmin,
  removerDespesa,
} from './plataforma.api';
import {
  deslocarMes,
  detalheRecebimento,
  filtrarAssinaturas,
  FiltroAssinaturas,
  mesAtualBr,
  rotuloDoMes,
  situacaoDaAssinatura,
  TomSituacao,
} from './plataforma.logica';
import {
  AssinaturasAdminDTO,
  CategoriaDespesa,
  DespesaDTO,
  ROTULO_CATEGORIA,
  VendasDoMesDTO,
} from './plataforma.types';

const CLASSE_DO_TOM: Record<TomSituacao, string> = {
  ok: 'bg-jade-100 text-jade-700',
  atencao: 'bg-mostarda-100 text-mostarda-700',
  perigo: 'bg-carmim-100 text-carmim-700',
  neutro: 'bg-paper text-ink-soft',
};

/** "12,50" ou "12.5" viram 12.5; qualquer outra coisa vira erro. */
export function lerValorEmReais(texto: string): { valor: number } | { erro: string } {
  const limpo = texto.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(limpo)) {
    return { erro: 'Digite o valor em reais, por exemplo 60 ou 59,90.' };
  }
  const valor = Number(limpo);
  if (valor <= 0) return { erro: 'O valor precisa ser maior que zero.' };
  return { valor };
}

function hojeBr(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
}

function Resumo({
  titulo,
  valor,
  classe = 'text-ink',
  nota,
}: {
  titulo: string;
  valor: string;
  classe?: string;
  nota?: string;
}) {
  return (
    <Card>
      <p className="font-meta text-xs uppercase tracking-wide text-ink-faint">{titulo}</p>
      <p className={`mt-1 font-display text-2xl font-bold ${classe}`}>{valor}</p>
      {nota && <p className="mt-1 text-xs text-ink-soft">{nota}</p>}
    </Card>
  );
}

/**
 * Financeiro das VENDAS da plataforma (as mensalidades que os síndicos pagam), separado do dinheiro das locações entre
 * moradores: controle das assinaturas e do vencimento, o que entrou e saiu no mês, recibos e despesas lançadas à mão.
 */
export function AbaPlataforma() {
  const [mes, setMes] = useState(mesAtualBr);
  const [vendas, setVendas] = useState<VendasDoMesDTO | null>(null);
  const [assinaturas, setAssinaturas] = useState<AssinaturasAdminDTO | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<FiltroAssinaturas>('TODAS');
  const [busca, setBusca] = useState('');
  const [recibo, setRecibo] = useState<Detalhe | null>(null);
  const [aRemover, setARemover] = useState<DespesaDTO | null>(null);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    listarAssinaturasAdmin()
      .then(setAssinaturas)
      .catch((e) => setErro(extractErrorMessage(e)));
  }, []);

  useEffect(() => {
    let atual = true;
    setVendas(null);
    buscarVendasDoMes(mes)
      .then((dados) => {
        if (atual) setVendas(dados);
      })
      .catch((e) => {
        if (atual) setErro(extractErrorMessage(e));
      });
    return () => {
      atual = false;
    };
  }, [mes, recarga]);

  const itens = assinaturas?.itens ?? [];
  const visiveis = filtrarAssinaturas(itens, filtro, busca);
  const noMesAtual = mes >= mesAtualBr();

  return (
    <div className="flex flex-col gap-6">
      {erro && (
        <p role="alert" className="text-sm font-semibold text-carmim-700">
          {erro}
        </p>
      )}

      <section aria-labelledby="titulo-vendas" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="titulo-vendas" className="font-display text-lg font-semibold text-ink">
              Vendas da plataforma
            </h2>
            <p className="text-sm text-ink-soft">
              O que os síndicos pagaram pelo plano dos condomínios. O dinheiro das locações entre
              moradores fica na aba Financeiro.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              fullWidth={false}
              onClick={() => setMes((atual) => deslocarMes(atual, -1))}
              aria-label="Mês anterior"
            >
              ‹
            </Button>
            <span
              aria-live="polite"
              className="min-w-[10rem] text-center font-display font-semibold capitalize text-ink"
            >
              {rotuloDoMes(mes)}
            </span>
            <Button
              variant="secondary"
              fullWidth={false}
              disabled={noMesAtual}
              onClick={() => setMes((atual) => deslocarMes(atual, 1))}
              aria-label="Próximo mês"
            >
              ›
            </Button>
          </div>
        </div>

        {!vendas && (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        )}

        {vendas && (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Resumo
                titulo="Entrou"
                valor={formatCurrency(vendas.resumo.entrou)}
                classe="text-jade-700"
                nota={`${vendas.resumo.pagamentos} pagamento${vendas.resumo.pagamentos === 1 ? '' : 's'}`}
              />
              <Resumo
                titulo="Taxas do Asaas"
                valor={`− ${formatCurrency(vendas.resumo.taxasAsaas)}`}
                classe="text-carmim-700"
              />
              <Resumo
                titulo="Despesas"
                valor={`− ${formatCurrency(vendas.resumo.despesas)}`}
                classe="text-carmim-700"
              />
              <Resumo
                titulo="Resultado do mês"
                valor={formatCurrency(vendas.resumo.resultado)}
                classe={vendas.resumo.resultado < 0 ? 'text-carmim-700' : 'text-ink'}
                nota="Entrou − taxas − despesas"
              />
            </div>
            {vendas.resumo.taxasNaoInformadas > 0 && (
              <p className="text-xs text-ink-soft">
                {vendas.resumo.taxasNaoInformadas} mensalidade
                {vendas.resumo.taxasNaoInformadas === 1 ? '' : 's'} do mês sem a taxa do Asaas
                gravada (conta como R$ 0,00).
              </p>
            )}
          </>
        )}
      </section>

      <section aria-labelledby="titulo-assinaturas" className="flex flex-col gap-3">
        <h2 id="titulo-assinaturas" className="font-display text-lg font-semibold text-ink">
          Assinaturas dos condomínios
        </h2>

        {!assinaturas && (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        )}

        {assinaturas && itens.length === 0 && (
          <EmptyState
            title="Nenhuma assinatura ainda"
            description="Quando um síndico contratar o plano de um condomínio, ele aparece aqui."
          />
        )}

        {assinaturas && itens.length > 0 && (
          <>
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por condomínio ou síndico"
              aria-label="Buscar assinaturas"
              className="min-h-[44px] w-full rounded-[12px] border border-ink/40 bg-paper-surface px-4 py-2.5 text-sm text-ink outline-none transition focus:border-ink"
            />
            <FiltroChips
              rotulo="Filtrar assinaturas"
              valor={filtro}
              onChange={setFiltro}
              opcoes={[
                {
                  valor: 'TODAS',
                  rotulo: 'Todas',
                  total: filtrarAssinaturas(itens, 'TODAS', busca).length,
                },
                {
                  valor: 'VENCE_7',
                  rotulo: 'Vencem em 7 dias',
                  total: filtrarAssinaturas(itens, 'VENCE_7', busca).length,
                },
                {
                  valor: 'VENCE_15',
                  rotulo: 'Em 15 dias',
                  total: filtrarAssinaturas(itens, 'VENCE_15', busca).length,
                },
                {
                  valor: 'VENCE_30',
                  rotulo: 'Em 30 dias',
                  total: filtrarAssinaturas(itens, 'VENCE_30', busca).length,
                },
                {
                  valor: 'VENCIDAS',
                  rotulo: 'Vencidas',
                  total: filtrarAssinaturas(itens, 'VENCIDAS', busca).length,
                },
                {
                  valor: 'AGUARDANDO',
                  rotulo: 'Aguardando pagamento',
                  total: filtrarAssinaturas(itens, 'AGUARDANDO', busca).length,
                },
              ]}
            />

            {visiveis.length === 0 ? (
              <EmptyState
                title="Nenhuma assinatura neste filtro"
                description="Mude o filtro ou a busca para ver as outras."
              />
            ) : (
              <ListaRolavel rotulo="Lista de assinaturas">
                <ul className="flex flex-col gap-2">
                  {visiveis.map((item) => {
                    const situacao = situacaoDaAssinatura(item);
                    return (
                      <li key={item.id}>
                        <Card className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-display font-semibold text-ink">
                              {item.condominio.nome}
                            </p>
                            <p className="truncate text-sm text-ink-soft">
                              {item.sindico.nome} · {item.sindico.email}
                            </p>
                            <p className="text-xs text-ink-faint">
                              Plano {item.plano} ({item.periodo}) ·{' '}
                              {formatCurrency(item.valorCiclo)} por cobrança
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 text-right">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${CLASSE_DO_TOM[situacao.tom]}`}
                            >
                              {situacao.rotulo}
                            </span>
                            {item.ativaAte && (
                              <span className="text-xs text-ink-faint">
                                Ativa até {formatDate(item.ativaAte)}
                              </span>
                            )}
                          </div>
                        </Card>
                      </li>
                    );
                  })}
                </ul>
              </ListaRolavel>
            )}
          </>
        )}
      </section>

      <section aria-labelledby="titulo-recebimentos" className="flex flex-col gap-3">
        <h2 id="titulo-recebimentos" className="font-display text-lg font-semibold text-ink">
          Pagamentos recebidos em {rotuloDoMes(mes)}
        </h2>

        {vendas && vendas.recebimentos.length === 0 && (
          <EmptyState
            title="Nenhum pagamento neste mês"
            description="Quando um síndico pagar o plano, o recebimento aparece aqui, com o recibo."
          />
        )}

        {vendas && vendas.recebimentos.length > 0 && (
          <ListaRolavel rotulo="Pagamentos recebidos">
            <div className="flex flex-col gap-2">
              {vendas.recebimentos.map((r) => (
                <CardClicavel
                  key={r.id}
                  onAbrir={() => setRecibo(detalheRecebimento(r))}
                  className="flex flex-col gap-1"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display font-semibold text-ink">{r.condominio.nome}</p>
                      <p className="text-sm text-ink-soft">
                        Pago por {r.sindico.nome} · Plano {r.plano} ({r.periodo})
                      </p>
                    </div>
                    <p className="shrink-0 font-display text-lg font-bold text-jade-700">
                      + {formatCurrency(r.valor)}
                    </p>
                  </div>
                  <p className="text-xs text-ink-faint">
                    {formatDateHora(r.pagoEm)} · Recibo {r.numeroRecibo}
                    {r.taxaAsaas !== null && ` · taxa do Asaas ${formatCurrency(r.taxaAsaas)}`}
                  </p>
                </CardClicavel>
              ))}
            </div>
          </ListaRolavel>
        )}
      </section>

      <Despesas
        mes={mes}
        despesas={vendas?.despesas ?? null}
        onMudou={() => setRecarga((n) => n + 1)}
        onErro={setErro}
        onRemover={setARemover}
      />

      {recibo && <DetalheModal detalhe={recibo} onFechar={() => setRecibo(null)} />}

      {aRemover && (
        <Modal titulo="Remover despesa" onFechar={() => setARemover(null)}>
          <h2 className="font-display text-lg font-bold text-ink">Remover esta despesa?</h2>
          <p className="mt-2 text-sm text-ink-soft">
            {aRemover.descricao} ({formatCurrency(aRemover.valor)}, {formatDate(aRemover.data)}). O
            resultado do mês é recalculado.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              variant="danger"
              fullWidth={false}
              onClick={async () => {
                const alvo = aRemover;
                setARemover(null);
                try {
                  await removerDespesa(alvo.id);
                  setRecarga((n) => n + 1);
                } catch (e) {
                  setErro(extractErrorMessage(e));
                }
              }}
            >
              Sim, remover
            </Button>
            <Button variant="ghost" fullWidth={false} onClick={() => setARemover(null)}>
              Cancelar
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

interface DespesasProps {
  mes: string;
  despesas: DespesaDTO[] | null;
  onMudou: () => void;
  onErro: (erro: string) => void;
  onRemover: (despesa: DespesaDTO) => void;
}

function Despesas({ mes, despesas, onMudou, onErro, onRemover }: DespesasProps) {
  const [data, setData] = useState(hojeBr);
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState<CategoriaDespesa>('SERVIDOR');
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function aoLancar(evento: FormEvent) {
    evento.preventDefault();
    const lido = lerValorEmReais(valor);
    if ('erro' in lido) {
      setErroForm(lido.erro);
      return;
    }
    if (descricao.trim().length < 3) {
      setErroForm('Escreva uma descrição de pelo menos 3 letras.');
      return;
    }

    setErroForm(null);
    setSalvando(true);
    try {
      await criarDespesa({ data, valor: lido.valor, descricao: descricao.trim(), categoria });
      setValor('');
      setDescricao('');
      onMudou();
    } catch (e) {
      onErro(extractErrorMessage(e));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section aria-labelledby="titulo-despesas" className="flex flex-col gap-3">
      <h2 id="titulo-despesas" className="font-display text-lg font-semibold text-ink">
        Despesas da plataforma
      </h2>
      <p className="text-sm text-ink-soft">
        Servidor, domínio, e-mail e o que mais a plataforma gasta. Elas entram na conta do mês em
        que a data cair. A taxa do Asaas de cada mensalidade já é descontada sozinha.
      </p>

      <Card>
        <form onSubmit={aoLancar} className="grid gap-3 sm:grid-cols-2" noValidate>
          <TextField
            label="Data da despesa"
            name="dataDespesa"
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
          />
          <TextField
            label="Valor (R$)"
            name="valorDespesa"
            inputMode="decimal"
            autoComplete="off"
            placeholder="Ex.: 60,00"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
          />
          <Select
            label="Categoria"
            name="categoriaDespesa"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value as CategoriaDespesa)}
          >
            {(Object.keys(ROTULO_CATEGORIA) as CategoriaDespesa[]).map((c) => (
              <option key={c} value={c}>
                {ROTULO_CATEGORIA[c]}
              </option>
            ))}
          </Select>
          <TextField
            label="Descrição"
            name="descricaoDespesa"
            autoComplete="off"
            placeholder="Ex.: Servidor da DigitalOcean"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />
          {erroForm && (
            <p role="alert" className="text-sm font-semibold text-carmim-700 sm:col-span-2">
              {erroForm}
            </p>
          )}
          <div className="sm:col-span-2">
            <Button type="submit" fullWidth={false} isLoading={salvando}>
              Lançar despesa
            </Button>
          </div>
        </form>
      </Card>

      {despesas && despesas.length === 0 && (
        <p className="text-sm text-ink-soft">Nenhuma despesa lançada em {rotuloDoMes(mes)}.</p>
      )}

      {despesas && despesas.length > 0 && (
        <ul className="flex flex-col gap-2">
          {despesas.map((d) => (
            <li key={d.id}>
              <Card className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display font-semibold text-ink">{d.descricao}</p>
                  <p className="text-xs text-ink-faint">
                    {ROTULO_CATEGORIA[d.categoria]} · {formatDate(d.data)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <p className="font-display text-lg font-bold text-carmim-700">
                    − {formatCurrency(d.valor)}
                  </p>
                  <Button
                    variant="ghost"
                    fullWidth={false}
                    aria-label={`Remover a despesa ${d.descricao}`}
                    onClick={() => onRemover(d)}
                  >
                    Remover
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
