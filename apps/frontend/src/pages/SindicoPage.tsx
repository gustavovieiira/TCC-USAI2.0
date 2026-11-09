import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { FiltroChips } from '@/components/ui/FiltroChips';
import { ListaRolavel } from '@/components/ui/ListaRolavel';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { TextField } from '@/components/ui/TextField';
import {
  buscarPainelAssinatura,
  PainelAssinaturaDTO,
} from '@/features/assinaturas/assinaturas.api';
import { CartaoAssinatura } from '@/features/assinaturas/CartaoAssinatura';
import { ConviteMoradores } from '@/features/assinaturas/ConviteMoradores';
import { PredioMoradores } from '@/features/sindico/PredioMoradores';
import {
  atualizarPin,
  buscarCondominio,
  listarLocacoesAtivas,
  listarMoradores,
  removerMorador,
} from '@/features/sindico/sindico.api';
import {
  FILTROS_LOCACOES,
  FiltroLocacoes,
  FiltroMoradores,
  filtrarLocacoes,
  filtrarMoradores,
  idsEmLocacao,
} from '@/features/sindico/sindico.filtros';
import { CondominioDTO, LocacaoAtivaDTO, MoradorDTO } from '@/features/sindico/sindico.types';
import { escalonar } from '@/lib/animacao';
import { extractErrorMessage } from '@/lib/apiClient';
import { formatCurrency, formatDate } from '@/lib/format';

type Aba = 'moradores' | 'locacoes';

const CAMPO_BUSCA =
  'min-h-[44px] w-full rounded-[12px] border border-ink/40 bg-paper-surface px-4 py-2.5 text-sm text-ink outline-none transition focus:border-ink';

export function SindicoPage() {
  const [condominio, setCondominio] = useState<CondominioDTO | null>(null);
  const [moradores, setMoradores] = useState<MoradorDTO[] | null>(null);
  const [locacoes, setLocacoes] = useState<LocacaoAtivaDTO[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [assinatura, setAssinatura] = useState<PainelAssinaturaDTO | null>(null);
  const [aba, setAba] = useState<Aba>('moradores');

  const [editandoPin, setEditandoPin] = useState(false);
  const [novoPin, setNovoPin] = useState('');
  const [salvandoPin, setSalvandoPin] = useState(false);
  const [erroPin, setErroPin] = useState<string | null>(null);

  const [buscaMorador, setBuscaMorador] = useState('');
  const [filtroMoradores, setFiltroMoradores] = useState<FiltroMoradores>('TODOS');
  const [buscaLocacao, setBuscaLocacao] = useState('');
  const [filtroLocacoes, setFiltroLocacoes] = useState<FiltroLocacoes>('TODAS');

  const [aRemover, setARemover] = useState<MoradorDTO | null>(null);
  const [removendoId, setRemovendoId] = useState<string | null>(null);
  const [erroRemocao, setErroRemocao] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([buscarCondominio(), listarMoradores(), listarLocacoesAtivas()])
      .then(([cond, mor, loc]) => {
        setCondominio(cond);
        setMoradores(mor);
        setLocacoes(loc);
      })
      .catch((err) => setErro(extractErrorMessage(err)));

    // Condomínios antigos (sem plano) devolvem null; uma falha aqui não derruba o resto do painel.
    buscarPainelAssinatura()
      .then(setAssinatura)
      .catch(() => setAssinatura(null));
  }, []);

  const emLocacao = useMemo(() => idsEmLocacao(locacoes ?? []), [locacoes]);
  const nomePorId = useMemo(
    () => new Map((moradores ?? []).map((m) => [m.id, m.nome])),
    [moradores],
  );
  const moradoresFiltrados = useMemo(
    () => filtrarMoradores(moradores ?? [], buscaMorador, filtroMoradores, emLocacao),
    [moradores, buscaMorador, filtroMoradores, emLocacao],
  );
  const locacoesFiltradas = useMemo(
    () => filtrarLocacoes(locacoes ?? [], buscaLocacao, filtroLocacoes),
    [locacoes, buscaLocacao, filtroLocacoes],
  );

  async function handleSalvarPin(event: FormEvent) {
    event.preventDefault();
    setErroPin(null);
    setSalvandoPin(true);

    try {
      const atualizado = await atualizarPin(novoPin);
      setCondominio(atualizado);
      setEditandoPin(false);
      setNovoPin('');
    } catch (err) {
      setErroPin(extractErrorMessage(err));
    } finally {
      setSalvandoPin(false);
    }
  }

  async function confirmarRemocao() {
    if (!aRemover) return;
    const { id } = aRemover;

    setErroRemocao(null);
    setRemovendoId(id);
    setARemover(null);

    try {
      await removerMorador(id);
      setMoradores((atual) => atual?.filter((m) => m.id !== id) ?? atual);
    } catch (err) {
      setErroRemocao(extractErrorMessage(err));
    } finally {
      setRemovendoId(null);
    }
  }

  if (erro) {
    return <p className="text-sm text-carmim-700">{erro}</p>;
  }

  if (!condominio) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  const totalMoradores = moradores?.length ?? 0;
  const totalLocacoes = locacoes?.length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-[24px] bg-fachada-noite p-6 text-fachada-papel sm:p-8">
        <h1 className="font-marca text-3xl font-extrabold leading-tight tracking-[-0.02em] sm:text-4xl">
          {condominio.nome}
        </h1>
        <p className="mt-1 text-sm text-fachada-papel-suave">Painel do síndico</p>

        <div className="mt-6">
          <PredioMoradores
            moradores={totalMoradores}
            limite={assinatura?.limiteMoradores ?? null}
          />
        </div>

        <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3">
          <div>
            <dt className="text-sm text-fachada-papel-suave">Moradores</dt>
            <dd className="font-marca text-2xl font-extrabold text-fachada-luz">
              {totalMoradores}
              {assinatura && (
                <span className="text-base font-bold text-fachada-papel-suave">
                  {' '}
                  de {assinatura.limiteMoradores}
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-fachada-papel-suave">Locações ativas</dt>
            <dd className="font-marca text-2xl font-extrabold text-fachada-luz">{totalLocacoes}</dd>
          </div>
        </dl>
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        {assinatura && <CartaoAssinatura painel={assinatura} />}
        <ConviteMoradores
          nomeCondominio={condominio.nome}
          linkSlug={condominio.linkSlug}
          pin={condominio.pin}
        >
          <div className="border-t border-dashed border-paper-line pt-4">
            {!editandoPin ? (
              <Button variant="secondary" fullWidth={false} onClick={() => setEditandoPin(true)}>
                Alterar PIN
              </Button>
            ) : (
              <form onSubmit={handleSalvarPin} className="flex flex-col gap-3">
                <TextField
                  label="Novo PIN"
                  name="novoPin"
                  inputMode="numeric"
                  required
                  value={novoPin}
                  onChange={(e) => setNovoPin(e.target.value)}
                />
                {erroPin && (
                  <p role="alert" className="text-sm text-carmim-700">
                    {erroPin}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button type="submit" isLoading={salvandoPin} fullWidth={false}>
                    Salvar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    fullWidth={false}
                    onClick={() => {
                      setEditandoPin(false);
                      setErroPin(null);
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            )}
          </div>
        </ConviteMoradores>
      </div>

      <div className="flex gap-1 rounded-[16px] border border-paper-line bg-paper-surface p-1">
        {(
          [
            ['moradores', 'Moradores', totalMoradores],
            ['locacoes', 'Locações ativas', totalLocacoes],
          ] as const
        ).map(([valor, rotulo, total]) => (
          <button
            key={valor}
            type="button"
            aria-pressed={aba === valor}
            onClick={() => setAba(valor)}
            className={`flex-1 rounded-[12px] py-2 text-sm font-semibold transition ${
              aba === valor ? 'bg-ink text-ink-inverse' : 'text-ink-soft hover:bg-paper'
            }`}
          >
            {rotulo}
            <span className={`ml-1.5 font-meta text-xs ${aba === valor ? 'opacity-80' : ''}`}>
              {total}
            </span>
          </button>
        ))}
      </div>

      {aba === 'moradores' && (
        <>
          {erroRemocao && <p className="text-sm text-carmim-700">{erroRemocao}</p>}
          {moradores && moradores.length > 0 && (
            <div className="flex flex-col gap-3">
              <input
                type="search"
                aria-label="Buscar morador"
                value={buscaMorador}
                onChange={(e) => setBuscaMorador(e.target.value)}
                placeholder={`Buscar entre ${moradores.length} ${moradores.length === 1 ? 'morador' : 'moradores'} (nome, e-mail ou apto)…`}
                className={CAMPO_BUSCA}
              />
              <FiltroChips
                rotulo="Filtrar moradores"
                valor={filtroMoradores}
                onChange={setFiltroMoradores}
                opcoes={[
                  { valor: 'TODOS', rotulo: 'Todos', total: moradores.length },
                  {
                    valor: 'EM_LOCACAO',
                    rotulo: 'Em locação agora',
                    total: moradores.filter((m) => emLocacao.has(m.id)).length,
                  },
                ]}
              />
            </div>
          )}
          {moradores && moradores.length > 0 && moradoresFiltrados.length === 0 && (
            <EmptyState
              title="Nenhum morador encontrado"
              description="Tente outro nome, e-mail ou apartamento, ou mude o filtro."
            />
          )}
          {moradoresFiltrados.length > 0 ? (
            <ListaRolavel rotulo="Moradores" alturaMaxima="max-h-[26rem]">
              <div className="flex flex-col gap-2">
                {moradoresFiltrados.map((morador, indice) => (
                  <Card
                    key={morador.id}
                    style={escalonar(indice, 45)}
                    className="entra flex items-center justify-between gap-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar nome={morador.nome} />
                      <div className="min-w-0">
                        <p className="font-display font-semibold text-ink">{morador.nome}</p>
                        <p className="truncate text-sm text-ink-soft">{morador.email}</p>
                        <p className="text-xs text-ink-faint">
                          {morador.apartamento ? `Apto ${morador.apartamento} · ` : ''}
                          cadastrado em {formatDate(morador.createdAt)}
                        </p>
                      </div>
                    </div>
                    {/* Pequeno e discreto de propósito: remover alguém não pode ser um clique fácil (ainda pede confirmação). */}
                    <button
                      type="button"
                      disabled={removendoId === morador.id}
                      aria-label={`Remover ${morador.nome}`}
                      onClick={() => setARemover(morador)}
                      className="shrink-0 self-start rounded-md px-2 py-1.5 text-xs font-medium text-ink-faint underline underline-offset-2 transition hover:text-carmim-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-carmim-700 disabled:opacity-50"
                    >
                      {removendoId === morador.id ? 'Removendo…' : 'Remover'}
                    </button>
                  </Card>
                ))}
              </div>
            </ListaRolavel>
          ) : (
            moradores?.length === 0 && <EmptyState title="Nenhum morador cadastrado ainda" />
          )}
        </>
      )}

      {aba === 'locacoes' && (
        <>
          {locacoes && locacoes.length > 0 && (
            <div className="flex flex-col gap-3">
              <input
                type="search"
                aria-label="Buscar locação"
                value={buscaLocacao}
                onChange={(e) => setBuscaLocacao(e.target.value)}
                placeholder="Buscar por item ou locatário…"
                className={CAMPO_BUSCA}
              />
              <FiltroChips
                rotulo="Filtrar locações por situação"
                valor={filtroLocacoes}
                onChange={setFiltroLocacoes}
                opcoes={FILTROS_LOCACOES.map((f) => ({
                  valor: f.valor,
                  rotulo: f.rotulo,
                  total: filtrarLocacoes(locacoes, '', f.valor).length,
                }))}
              />
            </div>
          )}

          {locacoes && locacoes.length > 0 && locacoesFiltradas.length === 0 && (
            <EmptyState
              title="Nenhuma locação encontrada"
              description="Mude a busca ou escolha outra situação."
            />
          )}

          {locacoesFiltradas.length > 0 && (
            <ListaRolavel
              rotulo="Locações ativas"
              alturaMaxima="max-h-[calc(100vh-28rem)] min-h-[16rem]"
            >
              <div className="flex flex-col gap-2">
                {locacoesFiltradas.map((locacao, indice) => {
                  const dono = nomePorId.get(locacao.item.ownerId);
                  return (
                    <Card
                      key={locacao.id}
                      style={escalonar(indice, 45)}
                      className="entra flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-display font-semibold text-ink">{locacao.item.titulo}</p>
                        <StatusBadge status={locacao.status} />
                      </div>
                      <p className="text-sm text-ink-soft">
                        {formatDate(locacao.dataInicio)} → {formatDate(locacao.dataFim)}
                      </p>
                      <p className="text-sm text-ink-soft">
                        {dono ? `Dono ${dono}, ` : ''}locatário {locacao.locatario.nome}
                      </p>
                      <p className="font-display font-semibold text-ink">
                        {formatCurrency(locacao.valorTotal)}
                      </p>
                    </Card>
                  );
                })}
              </div>
            </ListaRolavel>
          )}

          {locacoes?.length === 0 && <EmptyState title="Nenhuma locação ativa no momento" />}
        </>
      )}

      {aRemover && (
        <Modal titulo="Remover morador" onFechar={() => setARemover(null)}>
          <h2 className="font-display text-lg font-bold text-ink">Remover {aRemover.nome}?</h2>
          <p className="mt-2 text-sm text-ink-soft">
            A pessoa deixa de fazer parte do condomínio e não vai mais conseguir entrar na USAI.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="danger" fullWidth={false} onClick={confirmarRemocao}>
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
