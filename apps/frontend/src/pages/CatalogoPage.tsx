import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/ui/EmptyState';
import { FiltroChips } from '@/components/ui/FiltroChips';
import { ListaRolavel } from '@/components/ui/ListaRolavel';
import { Spinner } from '@/components/ui/Spinner';
import { extractErrorMessage } from '@/lib/apiClient';
import { tipoDe } from '@/features/itens/anuncio';
import { ItemCard } from '@/features/itens/ItemCard';
import { listarItens } from '@/features/itens/itens.api';
import { ItemDTO } from '@/features/itens/itens.types';

type FiltroTipo = 'TUDO' | 'ITEM' | 'SERVICO';

const SUBTITULO: Record<FiltroTipo, string> = {
  TUDO: 'Itens para alugar e serviços dos seus vizinhos.',
  ITEM: 'Itens disponíveis pra locação no seu condomínio.',
  SERVICO: 'Serviços oferecidos por moradores do seu condomínio. Combine direto pelo chat.',
};

function contagem(total: number, tipo: FiltroTipo): string {
  if (tipo === 'ITEM') return `${total} ${total === 1 ? 'item' : 'itens'}`;
  if (tipo === 'SERVICO') return `${total} ${total === 1 ? 'serviço' : 'serviços'}`;
  return `${total} ${total === 1 ? 'anúncio' : 'anúncios'}`;
}

export function CatalogoPage() {
  const [itens, setItens] = useState<ItemDTO[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [tipoAtivo, setTipoAtivo] = useState<FiltroTipo>('TUDO');
  const [categoriaAtiva, setCategoriaAtiva] = useState<string | null>(null);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    listarItens()
      .then(setItens)
      .catch((err) => setErro(extractErrorMessage(err)));
  }, []);

  const totais = useMemo(() => {
    const todos = itens ?? [];
    return {
      TUDO: todos.length,
      ITEM: todos.filter((i) => tipoDe(i) === 'ITEM').length,
      SERVICO: todos.filter((i) => tipoDe(i) === 'SERVICO').length,
    };
  }, [itens]);

  const doTipo = useMemo(
    () => (itens ?? []).filter((item) => tipoAtivo === 'TUDO' || tipoDe(item) === tipoAtivo),
    [itens, tipoAtivo],
  );

  const categorias = useMemo(
    () =>
      Array.from(new Set(doTipo.map((item) => item.categoria))).sort((a, b) =>
        a.localeCompare(b, 'pt-BR'),
      ),
    [doTipo],
  );

  const itensFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return doTipo.filter((item) => {
      const combinaCategoria = !categoriaAtiva || item.categoria === categoriaAtiva;
      const combinaBusca =
        !termo ||
        [
          item.titulo,
          item.categoria,
          item.descricao,
          item.fabricante,
          item.modelo,
          item.proprietario?.nome,
        ].some((campo) => campo?.toLowerCase().includes(termo));
      return combinaCategoria && combinaBusca;
    });
  }, [doTipo, categoriaAtiva, busca]);

  const filtrando = busca.trim() !== '' || categoriaAtiva !== null;

  function limparFiltros() {
    setBusca('');
    setCategoriaAtiva(null);
  }

  function trocarTipo(tipo: FiltroTipo) {
    setTipoAtivo(tipo);
    // A categoria escolhida pode nem existir no outro tipo.
    setCategoriaAtiva(null);
  }

  const vazioNoTipo = doTipo.length === 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold text-ink">Catálogo</h1>
        <p className="text-sm text-ink-soft">{SUBTITULO[tipoAtivo]}</p>
      </div>

      <FiltroChips<FiltroTipo>
        rotulo="Tipo de anúncio"
        valor={tipoAtivo}
        onChange={trocarTipo}
        opcoes={[
          { valor: 'TUDO', rotulo: 'Tudo', total: totais.TUDO },
          { valor: 'ITEM', rotulo: 'Itens para alugar', total: totais.ITEM },
          { valor: 'SERVICO', rotulo: 'Serviços', total: totais.SERVICO },
        ]}
      />

      <input
        type="search"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder={
          tipoAtivo === 'SERVICO'
            ? 'Buscar serviço, categoria ou quem presta…'
            : 'Buscar item, serviço, categoria, marca…'
        }
        className="notch-sm min-h-[44px] w-full border border-ink/40 bg-paper-surface px-4 py-2.5
          text-sm text-ink outline-none transition focus:border-ink"
      />

      {categorias.length > 1 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
          <button
            onClick={() => setCategoriaAtiva(null)}
            className={`notch-sm shrink-0 px-3.5 py-2 text-sm font-semibold transition ${
              categoriaAtiva === null
                ? 'bg-ink text-ink-inverse'
                : 'border border-paper-line bg-paper-surface text-ink-soft'
            }`}
          >
            Todas as categorias
          </button>
          {categorias.map((categoria) => (
            <button
              key={categoria}
              onClick={() => setCategoriaAtiva(categoria)}
              className={`notch-sm shrink-0 px-3.5 py-2 text-sm font-semibold transition ${
                categoriaAtiva === categoria
                  ? 'bg-jade-500 text-jade-100'
                  : 'border border-paper-line bg-paper-surface text-ink-soft'
              }`}
            >
              {categoria}
            </button>
          ))}
        </div>
      )}

      {erro && <p className="text-sm text-carmim-700">{erro}</p>}

      {!itens && !erro && (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      )}

      {itens && itensFiltrados.length === 0 && (
        <EmptyState
          title={
            vazioNoTipo
              ? tipoAtivo === 'SERVICO'
                ? 'Ainda não há serviços no catálogo'
                : tipoAtivo === 'ITEM'
                  ? 'Ainda não há itens no catálogo'
                  : 'Ainda não há nada no catálogo'
              : `Nada por "${busca || categoriaAtiva}"`
          }
          description={
            vazioNoTipo
              ? tipoAtivo === 'SERVICO'
                ? 'Você faz algum serviço (eletricista, maquiagem, unhas, aulas…)? Anuncie pros vizinhos.'
                : 'Seja o primeiro morador a anunciar pros vizinhos.'
              : 'Ninguém cadastrou isso ainda, mas alguém no condomínio provavelmente tem ou faz. Pergunte no mural.'
          }
          action={
            vazioNoTipo && (
              <Link
                to="/itens/novo"
                className="notch inline-flex min-h-[44px] items-center bg-barro-500 px-4 py-2
                  text-sm font-bold text-ink shadow-press hover:bg-barro-700"
              >
                {tipoAtivo === 'SERVICO' ? 'Publicar serviço' : 'Publicar anúncio'}
              </Link>
            )
          }
        />
      )}

      {itens && itensFiltrados.length > 0 && (
        <>
          <div className="flex items-center justify-between gap-3 text-sm text-ink-soft">
            <p aria-live="polite">
              {contagem(itensFiltrados.length, tipoAtivo)}
              {filtrando && ` de ${doTipo.length}`}
            </p>
            {filtrando && (
              <button
                type="button"
                onClick={limparFiltros}
                className="font-semibold text-barro-700 hover:underline"
              >
                Limpar filtros
              </button>
            )}
          </div>
          <ListaRolavel
            rotulo="Anúncios do catálogo"
            alturaMaxima="max-h-[calc(100vh-30rem)] min-h-[20rem]"
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {itensFiltrados.map((item, indice) => (
                <ItemCard key={item.id} item={item} indice={indice} />
              ))}
            </div>
          </ListaRolavel>
        </>
      )}
    </div>
  );
}
